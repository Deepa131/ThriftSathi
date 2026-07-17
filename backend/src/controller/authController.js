const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const User = require("../models/User");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

// POST /api/auth/register
exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });

  const { fullName, email, password, phone, city } = req.body;

  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ success: false, message: "Email already registered." });

  const user = await User.create({ fullName, email, password, phone, city });
  const token = signToken(user._id);

  res.status(201).json({
    success: true,
    token,
    user: {
      _id: user._id, fullName: user.fullName, email: user.email,
      phone: user.phone, city: user.city, avatarUrl: user.avatarUrl, phoneVerified: user.phoneVerified,
    },
  });
};

// POST /api/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: "Email and password are required." });

  const user = await User.findOne({ email, isActive: true }).select("+password");
  if (!user || !(await user.comparePassword(password)))
    return res.status(401).json({ success: false, message: "Invalid email or password." });

  const token = signToken(user._id);
  res.json({
    success: true,
    token,
    user: {
      _id: user._id, fullName: user.fullName, email: user.email,
      phone: user.phone, city: user.city, avatarUrl: user.avatarUrl, phoneVerified: user.phoneVerified,
    },
  });
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};