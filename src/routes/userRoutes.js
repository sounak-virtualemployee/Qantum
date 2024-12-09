const express = require('express');
const {
  checkNumber,
  registerUser
} = require('../controllers/userController');

const router = express.Router();
router.get('/check/:number', checkNumber); // Check if number exists
router.post('/register/:number', registerUser); 
module.exports = router;