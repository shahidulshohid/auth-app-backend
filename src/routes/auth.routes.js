const express = require('express');
const router = express.Router();

const { register, verifyOtp, resendOtp, login, getProfile, refreshToken } = require('../controllers/auth.controller');
const protect = require('../middlewares/auth.middleware');

router.post('/register', register);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp/signUp', resendOtp);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.get('/profile', protect, getProfile); // protected route

module.exports = router;