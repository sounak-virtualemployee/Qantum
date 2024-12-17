const User = require("../models/user");
const dotenv = require("dotenv");
const twilio = require("twilio");
const jwt = require("jsonwebtoken");
const { makeApiCall } = require("./bluizeController");
const https = require("https");
const axios = require("axios");
const { log } = require("console");
require("dotenv").config();
dotenv.config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const checkNumber = async (req, res) => {
  const { Mobile } = req.params;

  try {
    const mobileWithoutCountryCode = Mobile.replace(/^\+?\d{1,2}/, "");
    console.log(
      `Processed Mobile without country code: ${mobileWithoutCountryCode}`
    );
    // Step 1: Fetch access token
    const tokenData = await makeApiCall();
    console.log(tokenData);

    if (!tokenData || !tokenData.access_token) {
      return res.status(500).json({ message: "Failed to fetch access token" });
    }
    console.log(`Mobile parameter: ${Mobile}`);
    console.log(`Authorization Header: Bearer ${tokenData.access_token}`);

    // Step 2: Use access token to check mobile number details
    const apiUrl = `https://144.6.125.194:18009/bluize/adapter/bridgeconnect/api/client/mobilephone/${mobileWithoutCountryCode}`;
    const headers = {
      Authorization: `Bearer ${tokenData.access_token}`,
    };
    console.log(`Requesting details for Mobile: ${Mobile}`);
    console.log(`API URL: ${apiUrl}`);

    const response = await axios.get(apiUrl, { headers, httpsAgent });
    console.log("API Response:", response.data);

    // If the API returns details, send OTP for login
    if (response.data) {
      const user = await User.findOne({ Mobile });

      if (user) {
        const verification = await client.verify.v2
          .services(process.env.TWILIO_VERIFY_SERVICE_SID)
          .verifications.create({ to: Mobile, channel: "sms" });

        return res.status(200).json({
          message: "Number is registered, OTP sent",
          registered: true,
          user,
        });
      }
    }

    // If no details found, respond with registration needed
    return res
      .status(200)
      .json({ message: "Number is not registered", registered: false });
  } catch (error) {
    // Handle specific error for "Message: 'Not found'"
    if (
      error.response &&
      error.response.data &&
      error.response.data.Message === "Not found"
    ) {
      return res
        .status(200)
        .json({ message: "Number is not registered", registered: false });
    }

    console.error(
      "Error in checkNumber:",
      error.response?.data || error.message
    );
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const registerUser = async (req, res) => {
  const { Mobile } = req.params;
  const { GivenNames, Surname, DateOfBirth, PostCode, Email, Gender } =
    req.body;

  try {
    const mobileWithoutCountryCode = Mobile.replace(/^\+?\d{1,2}/, "");

    // Step 1: Validate input
    if (!Mobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    // Step 2: Check for existing user
    const existingUser = await User.findOne({ Mobile });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "Mobile number already registered" });
    }

    // Step 3: Get access token
    const tokenResponse = await makeApiCall();
    const access_token = tokenResponse.access_token;

    // Step 4: Send user data to third-party API
    const userData = {
      GivenNames,
      Surname,
      Mobile: mobileWithoutCountryCode,
      DateOfBirth,
      PostCode,
      Email,
      Gender,
    };

    const thirdPartyResponse = await axios.post(
      "https://144.6.125.194:18009/bluize/adapter/bridgeconnect/api/client",
      userData,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        httpsAgent,
      }
    );

    const thirdPartyData = thirdPartyResponse.data;
    console.log(thirdPartyData);

    // Step 5: Save third-party data to MongoDB
    const newUser = new User({
      Id: thirdPartyData.Id,
      BluizeId: thirdPartyData.BluizeId,
      CardNumber: thirdPartyData.CardNumber,
      GivenNames: thirdPartyData.GivenNames,
      Surname: thirdPartyData.Surname,
      Salutation: thirdPartyData.Salutation,
      PreferredName: thirdPartyData.PreferredName,
      Email: thirdPartyData.Email,
      Mobile: Mobile,
      Address: thirdPartyData.Address,
      PostCode: thirdPartyData.PostCode,
      Suburb: thirdPartyData.Suburb,
      State: thirdPartyData.State,
      Gender: thirdPartyData.Gender,
      DateOfBirth: thirdPartyData.DateOfBirth,
      DateJoined: thirdPartyData.DateJoined,
      PointsBalance: thirdPartyData.PointsBalance,
      PointsValue: thirdPartyData.PointsValue,
      StatusPoints: thirdPartyData.StatusPoints,
      StatusTier: thirdPartyData.StatusTier,
      RequiredStatusPointsForNextTier:
        thirdPartyData.RequiredStatusPointsForNextTier,
      NextStatusTier: thirdPartyData.NextStatusTier,
      MembershipType: thirdPartyData.MembershipType,
      MembershipCategory: thirdPartyData.MembershipCategory,
      AccountAvailableBalance: thirdPartyData.AccountAvailableBalance,
      AccountType: thirdPartyData.AccountType,
      AcceptsEmail: thirdPartyData.AcceptsEmail,
      AcceptsSMS: thirdPartyData.AcceptsSMS,
      AcceptsMailouts: thirdPartyData.AcceptsMailouts,
      RewardCount: thirdPartyData.RewardCount,
      Interests: thirdPartyData.Interests,
    });

    await newUser.save();
    console.log("New User Saved: ", newUser);
    // Step 6: Send OTP using Twilio
    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: Mobile, channel: "sms" });

    // Step 7: Respond to the client
    res.status(200).json({
      message: "User registered successfully, OTP sent.",
      userId: newUser._id,
      thirdPartyData,
    });
  } catch (error) {
    console.log("Error during registration:", error.message);
    res.status(500).json({
      message: error.response?.data|| error.message,
      error: error.response?.data || error.message,
    });
  }
};

module.exports = {
  checkNumber,
  registerUser,
};
