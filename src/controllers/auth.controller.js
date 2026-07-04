const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendOtpEmail } = require('../utils/email');

const prisma = new PrismaClient();

// Token make helper function
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
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

        // Generate token
        const token = generateToken(updatedUser.id);

        res.json({
            message: 'Email verified successfully',
            token,
            user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email },
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─── LOGIN ────────────────────────────────────────
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // User খোঁজো
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!user.isVerified) {
            return res.status(403).json({ message: 'Please verify your email before logging in' });
        }

        // Password match করো
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = generateToken(user.id);

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, name: user.name, email: user.email },
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ─── GET PROFILE (protected) ──────────────────────
const getProfile = async (req, res) => {
    // req.user middleware 
    res.json({ user: req.user });
};

module.exports = { register, verifyOtp, login, getProfile };
