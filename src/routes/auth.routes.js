const express = require('express');
const router = express.Router();

const { register, verifyOtp, resendOtp, login, forgotPassword, resetPassword, getProfile, refreshToken, verifyForgotPasswordOtp, resendForgotPasswordOtp, changePassword } = require('../controllers/auth.controller');
const protect = require('../middlewares/auth.middleware');

router.post('/register', register);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp/signUp', resendOtp);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-forgot-password-otp', verifyForgotPasswordOtp);
router.post('/resend-otp/forgot-password', resendForgotPasswordOtp);
router.post('/reset-password', resetPassword);
router.post('/refresh-token', refreshToken);
router.post('/change-password', protect, changePassword); // protected route
router.get('/profile', protect, getProfile); // protected route  

module.exports = router;