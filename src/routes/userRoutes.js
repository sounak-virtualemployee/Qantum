const express = require('express');
const verifyToken = require('../middlewares/authMiddleware');
const { checkNumber } = require('../controllers/userController');


const router = express.Router();
router.get('/check/:Mobile', checkNumber); // Check if number exists
// router.post('/register/:Mobile', registerUser); 
// router.post('/verify-otp', verifyOtp);
// router.put('/device-token',verifyToken, deviceToken);
module.exports = router;