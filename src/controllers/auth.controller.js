const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendOtpEmail } = require('../utils/email');
const { OAuth2Client } = require('google-auth-library');

const prisma = new PrismaClient();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Token make helper function
const generateTokens = (userId) => {
    const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};

// ─── REGISTER ─────────────────────────────────────
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Email check
        let user = await prisma.user.findUnique({ where: { email } });
        if (user && user.isVerified) {
            return res.status(400).json({ message: 'Email already registered and verified' });
        }

        // Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

        // Password hash 
        const hashedPassword = await bcrypt.hash(password, 10);

        if (user && !user.isVerified) {
            // Update unverified user
            user = await prisma.user.update({
                where: { email },
                data: { name, password: hashedPassword, otp, otpExpiry }
            });
        } else {
            // save new user in database
            user = await prisma.user.create({
                data: { name, email, password: hashedPassword, otp, otpExpiry },
            });
        }

        // Send OTP
        await sendOtpEmail(email, otp);

        res.status(201).json({
            message: 'OTP sent to email. Please verify to complete registration.',
            user: { id: user.id, name: user.name, email: user.email },
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─── VERIFY OTP ───────────────────────────────────
const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'User already verified' });
        }

        if (!otp) {
            return res.status(400).json({ message: 'OTP is required in the request body' });
        }

        if (user.otp !== String(otp).trim()) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (new Date() > new Date(user.otpExpiry)) {
            return res.status(400).json({ message: 'OTP has expired' });
        }

        // Update user as verified
        const updatedUser = await prisma.user.update({
            where: { email },
            data: {
                isVerified: true,
                otp: null,
                otpExpiry: null
            }
        });

        // Generate tokens
        const tokens = generateTokens(updatedUser.id);

        res.json({
            message: 'Email verified successfully',
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email },
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─── RESEND OTP signUP ───────────────────────────────────
const resendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'User already verified' });
        }

        // Generate new 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

        // Update user with new OTP
        await prisma.user.update({
            where: { email },
            data: { otp, otpExpiry }
        });

        // Send OTP
        await sendOtpEmail(email, otp);

        res.json({ message: 'A new OTP has been sent to your email.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─── LOGIN ────────────────────────────────────────
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // User find
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!user.isVerified) {
            return res.status(403).json({ message: 'Please verify your email before logging in' });
        }

        // Password match 
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const tokens = generateTokens(user.id);

        res.json({
            message: 'Login successful',
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: { id: user.id, name: user.name, email: user.email },
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─── FORGOT PASSWORD ──────────────────────────────
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

        // Update user with new OTP
        await prisma.user.update({
            where: { email },
            data: { otp, otpExpiry }
        });

        // Send OTP
        await sendOtpEmail(email, otp);

        res.json({ message: 'Password reset OTP sent to email' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─── VERIFY FORGOT PASSWORD OTP ───────────────────
const verifyForgotPasswordOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!otp) {
            return res.status(400).json({ message: 'OTP is required' });
        }

        if (user.otp !== String(otp).trim()) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (new Date() > new Date(user.otpExpiry)) {
            return res.status(400).json({ message: 'OTP has expired' });
        }

        res.json({ message: 'OTP verified successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─── RESEND FORGOT PASSWORD OTP ───────────────────
const resendForgotPasswordOtp = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

        // Update user with new OTP
        await prisma.user.update({
            where: { email },
            data: { otp, otpExpiry }
        });

        // Send OTP
        await sendOtpEmail(email, otp);

        res.json({ message: 'A new password reset OTP has been sent to your email.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─── RESET PASSWORD ───────────────────────────────
const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.otp !== String(otp).trim()) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (new Date() > new Date(user.otpExpiry)) {
            return res.status(400).json({ message: 'OTP has expired' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password and clear OTP
        await prisma.user.update({
            where: { email },
            data: {
                password: hashedPassword,
                otp: null,
                otpExpiry: null
            }
        });

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─── REFRESH TOKEN ────────────────────────────────
const refreshToken = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(401).json({ message: 'Refresh token required' });

        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });

        if (!user) return res.status(403).json({ message: 'Invalid refresh token' });

        const tokens = generateTokens(user.id);
        res.json({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        });
    } catch (error) {
        res.status(403).json({ message: 'Invalid or expired refresh token' });
    }
};

// ─── GET PROFILE (protected) ──────────────────────
const getProfile = async (req, res) => {
    // req.user middleware 
    res.json({ user: req.user });
};

// ─── CHANGE PASSWORD (protected) ──────────────────
const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user.id;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect old password' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedNewPassword }
        });

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─── GOOGLE LOGIN CALLBACK ──────────────────────
// const googleLoginCallback = (req, res) => {
//     try {
//         const tokens = generateTokens(req.user.id);
//         const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
//         // Redirect to frontend with tokens
//         res.redirect(`${frontendUrl}/auth-success?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`);
//     } catch (error) {
//         res.status(500).json({ message: 'Server error', error: error.message });
//     }
// };
// ─── GOOGLE LOGIN (Frontend Token Flow) ───────────
const googleLogin = async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).json({ message: 'idToken is required' });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, name, sub: googleId } = payload;

        let user = await prisma.user.findUnique({ where: { email } });

        if (user) {
            if (!user.googleId) {
                user = await prisma.user.update({
                    where: { email },
                    data: { googleId, isVerified: true }
                });
            }
        } else {
            const dummyPassword = await bcrypt.hash(Math.random().toString(36).slice(-10) + 'GoOgLe', 10);
            user = await prisma.user.create({
                data: {
                    name,
                    email,
                    googleId,
                    isVerified: true,
                    password: dummyPassword
                }
            });
        }

        const tokens = generateTokens(user.id);

        res.json({
            message: 'Google Login successful',
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: { id: user.id, name: user.name, email: user.email },
        });

    } catch (error) {
        res.status(401).json({ message: 'Invalid Google Token', error: error.message });
    }
};

module.exports = {
    register, verifyOtp, resendOtp, login, forgotPassword, resetPassword, refreshToken, getProfile, verifyForgotPasswordOtp, resendForgotPasswordOtp, changePassword,
    googleLogin,
};


