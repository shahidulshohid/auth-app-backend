const nodemailer = require('nodemailer');

// ─── Transporter (Gmail) ──────────────────────────
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ─── OTP Email send function ───────────────────
const sendOtpEmail = async (toEmail, otp) => {
    const mailOptions = {
        from: `"Auth App" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'Your OTP Code - Email Verification',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #4f46e5; text-align: center;">Email Verification</h2>
                <p style="color: #555; text-align: center;">Your One-Time Password (OTP) is:</p>
                <div style="text-align: center; margin: 20px 0;">
                    <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #4f46e5; background: #f0f0ff; padding: 12px 24px; border-radius: 8px;">${otp}</span>
                </div>
                <p style="color: #888; text-align: center; font-size: 13px;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
            </div>
        `,
    };

    await transporter.sendMail(mailOptions);
};

module.exports = { sendOtpEmail };
