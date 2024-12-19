// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  Id: { type: String },
  BluizeId: { type: Number },
  CardNumber: { type: String },
  GivenNames: { type: String },
  Surname: { type: String },
  Salutation: { type: String },
  PreferredName: { type: String },
  Email: { type: String },
  Mobile: { type: String, required: true, unique: true }, // Ensure Mobile is required and unique
  Address: { type: String },
  PostCode: { type: String },
  Suburb: { type: String },
  State: { type: String },
  Gender: { type: String, enum: ["M", "F"] },
  DateOfBirth: { type: Date },
  DateJoined: { type: Date },
  PointsBalance: { type: Number },
  PointsValue: { type: Number },
  StatusPoints: { type: Number },
  StatusTier: { type: String },
  RequiredStatusPointsForNextTier: { type: Number },
  NextStatusTier: { type: String },
  MembershipType: { type: String },
  MembershipCategory: { type: String },
  AccountAvailableBalance: { type: Number },
  AccountType: { type: String },
  AcceptsEmail: { type: Boolean },
  AcceptsSMS: { type: Boolean },
  AcceptsMailouts: { type: Boolean },
  RewardCount: { type: Number },
  Interests: { type: Array },
  device_token: { type: String },
});

const User = mongoose.model("User", userSchema);
module.exports = User;
