const User = require("../models/user");
const dotenv = require("dotenv");
const twilio = require("twilio");
const jwt = require("jsonwebtoken");
const UserModel = require("../models/user");
const { makeApiCall } = require("./bluizeController");

require("dotenv").config();

dotenv.config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// const checkNumber = async (req, res) => {
//   const { Mobile } = req.params;

//   try {
//     const tokenData = await makeApiCall();
//     console.log(tokenData);

//     if (!tokenData || !tokenData.access_token) {
//       return res.status(500).json({ message: "Failed to fetch access token" });
//     }
//     const user = await User.findOne({ Mobile });
//     if (user) {
//       // If user exists, send OTP for Login
//       const verification = await client.verify.v2
//         .services(process.env.TWILIO_VERIFY_SERVICE_SID)
//         .verifications.create({ to: Mobile, channel: "sms" });

//       return res.status(200).json({
//         message: "Number is registered, OTP sent",
//         registered: true,
//         user,
//       });
//     } else {
//       // If user does not exist, proceed to registration
//       return res
//         .status(200)
//         .json({ message: "Number is not registered", registered: false });
//     }
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error });
//   }
// };

// const registerUser = async (req, res) => {
//   const { Mobile } = req.params;
//   const { GivenNames, Surname, DateOfBirth, PostCode, Email, Gender } = req.body;

//   try {
//     // Check if number already exists
//     const existingUser = await User.findOne({ Mobile });
//     if (existingUser) {
//       return res.status(409).json({ message: "Number is already registered" });
//     }

//     // Send OTP via Twilio
//     const verification = await client.verify.v2
//       .services(process.env.TWILIO_VERIFY_SERVICE_SID)
//       .verifications.create({ to: Mobile, channel: "sms" });

//     // Temporarily save user details in the database (without verification)
//     const newUser = new User({
//       Mobile,
//       GivenNames,
//       Surname,
//       DateOfBirth,
//       PostCode,
//       Email,
//       Gender,
//     });
//     await newUser.save();

//     res.status(200).json({
//       message: "OTP sent successfully, complete verification",
//       userId: newUser._id,
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Error sending OTP", error });
//   }
// };

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
      { _id: user._id, number: user.Mobile }, // Payload
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
    const updateUser = await UserModel.findOneAndUpdate(
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
    res.status(500).json({ message: "Error updating event", error });
  }
};

module.exports = {
  checkNumber,
  registerUser,
  verifyOtp,
  deviceToken,
};
