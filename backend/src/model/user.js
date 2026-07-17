const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    phone: {
      type: String,
      default: "",
      validate: {
        // Nepali mobile numbers are 10 digits starting with 96, 97, or 98
        // (covers NTC, Ncell, and Smart Cell ranges) — plain "any 10
        // digits" was letting through numbers no Nepali carrier issues.
        validator: (v) => !v || /^\+977(9[678]\d{8})$/.test(v),
        message: "Enter a valid Nepali mobile number (starts with 98, 97, or 96).",
      },
    },
    phoneVerified: { type: Boolean, default: false },
    city: { type: String, default: "Kathmandu" },
    avatarUrl: { type: String, default: "" },
    bannerUrl: { type: String, default: "" },          // US-37
    styleTags: { type: [String], default: [] },         // US-37 e.g. ["K-pop","Thrift"]
    bio: { type: String, default: "" },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    responseRate: { type: Number, default: 0 },         // US-03
    avgReplyMinutes: { type: Number, default: 0 },       // US-03
    trustScore: { type: Number, default: 0 },            // US-23
    // Seller's digital wallet QR codes, shown to buyers on the payment
    // page when they pick eSewa/Khalti so they have something real to
    // scan and pay, instead of the app just declaring "payment received".
    paymentQR: {
      esewa:  { type: String, default: "" },
      khalti: { type: String, default: "" },
    },
    accountabilityScore: { type: Number, default: 100 }, // US-44
    profileCompleteness: { type: Number, default: 0 },   // US-09
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Recalculate profile completeness before saving
userSchema.pre("save", function (next) {
  let score = 0;
  if (this.fullName) score += 20;
  if (this.email) score += 20;
  if (this.phone) score += 15;
  if (this.avatarUrl) score += 15;
  if (this.city) score += 10;
  if (this.bio) score += 10;
  if (this.bannerUrl) score += 10;
  this.profileCompleteness = score;
  next();
});

module.exports = mongoose.model("User", userSchema);