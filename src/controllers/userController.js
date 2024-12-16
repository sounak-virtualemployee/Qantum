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

module.exports = {
  checkNumber,
};
