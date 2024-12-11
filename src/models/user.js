const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: false },
  lastName: { type: String, required: false },
  postalCode: { type: String, required: false },
  email: { type: String, required: false },
  dob: { type: Date, required: false },
  gender: { type: String, enum: ['male', 'female'], required: false },
  number: { type: String, required: true, unique: true },
});


const UserModel = mongoose.model("User", userSchema);

module.exports = UserModel;