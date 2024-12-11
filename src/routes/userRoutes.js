const express = require('express');
const {
  checkNumber,
  registerUser,
  verifyOtp
} = require('../controllers/userController');

const router = express.Router();
router.get('/check/:number', checkNumber); // Check if number exists
router.post('/register/:number', registerUser); 
router.post('/verify-otp', verifyOtp);
module.exports = router;