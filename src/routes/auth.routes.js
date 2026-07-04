const express = require('express');
const router = express.Router();

const { register, verifyOtp, login, getProfile } = require('../controllers/auth.controller');
const protect = require('../middlewares/auth.middleware');

router.post('/register', register);
router.post('/verify-otp', verifyOtp);
router.post('/login', login);
router.get('/profile', protect, getProfile); // protected route

module.exports = router;