const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  GivenNames: { type: String, required: false },
  Surname: { type: String, required: false },
  PostCode: { type: String, required: false },
  Email: { type: String, required: false },
  DateOfBirth: { type: Date, required: false },
  Gender: { type: String, enum: ["M", "F"], required: false },
  Mobile: { type: String, required: true, unique: true },
  device_token: { type: String, required: false },
});

const UserModel = mongoose.model("User", userSchema);
module.exports = UserModel;
