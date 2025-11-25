// server/routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import { sendOTPEmail } from '../utils/mailer.js';

const router = express.Router();

function generateOTP() {
  // 6-digit numeric OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function now() {
  return new Date();
}

function withinSeconds(dateA, secs) {
  return (now() - new Date(dateA)) / 1000 < secs;
}


// SIGNUP (students only, admin cannot signup)
router.post('/signup', async (req, res) => {
  const { name, email, phone, course, password } = req.body;

  // ❌ Block admin creation from signup
  if (email === process.env.ADMIN_EMAIL) {
    return res.status(403).json({ msg: "Admin cannot be created from signup." });
  }

  // ----------------------------
  // ✅ SIGNUP VALIDATION RULES
  // ----------------------------
  const nameRegex = /^[A-Za-z ]+$/;
  const phoneRegex = /^[0-9]{10}$/;
  const courseRegex = /^[A-Za-z ]+$/;

  if (!nameRegex.test(name)) {
    return res.status(400).json({ msg: "Full name can contain only letters" });
  }

  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ msg: "Phone must be 10 digits" });
  }

  if (!courseRegex.test(course)) {
    return res.status(400).json({ msg: "Course must contain only letters" });
  }

  // Email validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ msg: "Only Gmail accounts are allowed." });
  }

  // Check if user exists
  const exists = await User.findOne({ email });
  if (exists) {
    return res.status(400).json({ msg: "Email already exists" });
  }

  // Hash password and save user
  const hashed = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    phone,
    course,
    password: hashed,
    role: "student",
    emailVerified: false
  });

  // Generate OTP
  const otp = generateOTP();
  user.otp = otp;
  user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
  await user.save();

  await sendOTPEmail(email, user.name, otp);

  res.json({
    userId: user._id,
    email: user.email,
    msg: "OTP sent to email"
  });
});




// RESEND OTP (rate-limited)
router.post('/resend-otp', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ msg: 'userId required' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    if (user.emailVerified) return res.status(400).json({ msg: 'Email already verified' });

    // RATE LIMIT LOGIC:
    // 1. No resend if last request < 60 seconds
    const lastRequest = user.otpRequests[user.otpRequests.length - 1];
    if (lastRequest && withinSeconds(lastRequest, 60)) {
      return res.status(429).json({ msg: 'Please wait 60 seconds before requesting a new code.' });
    }

    // 2. Max 5 sends per rolling 24 hours
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = user.otpRequests.filter(d => new Date(d) > dayAgo).length;
    if (recentCount >= 5) {
      return res.status(429).json({ msg: 'OTP send limit reached for 24 hours. Try later.' });
    }

    // create new OTP
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    user.otpRequests.push(new Date());
    // trim otpRequests to last 50 entries (safety)
    if (user.otpRequests.length > 50) user.otpRequests = user.otpRequests.slice(-50);

    await user.save();

    try {
      await sendOTPEmail(user.email, user.name, otp);
    } catch (mailErr) {
      console.error('MAIL ERROR:', mailErr);
      // still return success but warn
      return res.json({ msg: 'OTP generated but failed to send email (server error).' });
    }

    res.json({ msg: 'OTP resent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// VERIFY OTP (AUTO LOGIN AFTER SUCCESS)
router.post('/verify-otp', async (req, res) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp) return res.status(400).json({ msg: 'userId and otp required' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    if (user.emailVerified) return res.status(400).json({ msg: 'Email already verified' });

    if (!user.otp || !user.otpExpires) return res.status(400).json({ msg: 'No OTP requested' });
    if (new Date() > user.otpExpires) return res.status(400).json({ msg: 'OTP expired' });
    if (otp !== user.otp) return res.status(400).json({ msg: 'Invalid OTP' });

    user.emailVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    // ⭐ AUTO LOGIN AFTER VERIFY ⭐
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    return res.json({
      msg: "Email verified",
      token,
      user
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// LOGIN (unchanged) — only allow if emailVerified === true
// LOGIN – return clear message for wrong email or password
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  // EMAIL NOT FOUND
  if (!user) {
    return res.status(400).json({ msg: "Email not found" });
  }

  // PASSWORD WRONG
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(400).json({ msg: "Incorrect password" });
  }

  // STUDENT MUST VERIFY EMAIL
  if (user.role === "student" && !user.emailVerified) {
    return res.status(403).json({
      msg: "Please verify your email using OTP before logging in."
    });
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  res.json({ token, user });
});



// GET /me (unchanged)
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

export default router;
