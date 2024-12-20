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
const Bluize_Api = process.env.BLUIZE_API;
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
    const apiUrl = `${Bluize_Api}/client/mobilephone/${mobileWithoutCountryCode}`;
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
      console.log("mongoDb Data", user);

      if (user) {
        const verification = await client.verify.v2
          .services(process.env.TWILIO_VERIFY_SERVICE_SID)
          .verifications.create({ to: Mobile, channel: "sms" });

        console.log("twilio", verification);
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
      `${Bluize_Api}/client`,
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
      message: error.response?.data || error.message,
      error: error.response?.data || error.message,
    });
  }
};

const verifyOtp = async (req, res) => {
  const { Mobile, otp } = req.body;

  try {
    // Verify OTP using Twilio
    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: Mobile, code: otp });

    const status = verificationCheck.status;

    if (status !== "approved") {
      return res
        .status(400)
        .json({ message: "Invalid OTP or verification failed", status });
    }

    // If OTP is valid, ensure user exists
    const user = await User.findOne({ Mobile });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { _id: user._id, number: user.Mobile, Id: user.Id }, // Payload
      process.env.JWT_SECRET // Secret key
      // Token expiry time
    );

    res.status(200).json({
      message: "Registration or login successful",
      user,
      token, // Send the generated token
      status,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error verifying OTP", error: error.message });
  }
};

const deviceToken = async (req, res) => {
  const { device_token } = req.body;
  const user_id = req.user._id;
  console.log(user_id);
  console.log(device_token);
  try {
    const updateUser = await User.findOneAndUpdate(
      { _id: user_id },
      { device_token },
      { new: true }
    );
    console.log(updateUser);

    if (!updateUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user: updateUser });
  } catch (error) {
    res.status(500).json({ message: "Error updating Token", error });
  }
};


module.exports = {
  checkNumber,
  registerUser,
  verifyOtp,
  deviceToken
};
