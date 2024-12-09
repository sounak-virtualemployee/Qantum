const User = require("../models/user");
const dotenv = require("dotenv");
const twilio = require("twilio");
require("dotenv").config();

dotenv.config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const checkNumber = async (req, res) => {
  const { number } = req.params;

  try {
    const user = await User.findOne({ number });
    if (user) {
      // If user exists, send OTP for Login
      const verification = await client.verify.v2
        .services(process.env.TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({ to: number, channel: "sms" });

      return res
        .status(200)
        .json({ message: "Number is registered, OTP sent", registered: true,user });
    } else {
      // If user does not exist, proceed to registration
      return res
        .status(200)
        .json({ message: "Number is not registered", registered: false });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

const registerUser = async (req, res) => {
  const { number } = req.params;
  const { firstName, lastName, dob, postalCode, email, gender } = req.body;

  try {
    // Check if number already exists
    const existingUser = await User.findOne({ number });
    if (existingUser) {
      return res.status(409).json({ message: "Number is already registered" });
    }

    // Send OTP via Twilio
    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: number, channel: "sms" });

    // Temporarily save user details in the database (without verification)
    const newUser = new User({
      number,
      firstName,
      lastName,
      dob,
      postalCode,
      email,
      gender,
    });
    await newUser.save();

    res
      .status(200)
      .json({
        message: "OTP sent successfully, complete verification",
        userId: newUser._id,
      });
  } catch (error) {
    res.status(500).json({ message: "Error sending OTP", error });
  }
};

module.exports = {
  checkNumber,
  registerUser,
};
