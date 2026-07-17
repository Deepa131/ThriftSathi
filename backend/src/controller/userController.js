const User = require("../models/User");
const Listing = require("../models/Listing");
const Order = require("../models/Order");
const { Review, SavedItem, Notification, PriceAlert } = require("../models/index");

// GET /api/users/:id  – public seller profile (US-03, US-07, US-23)
exports.getProfile = async (req, res) => {
  const user = await User.findById(req.params.id).select("-password -blockedUsers");
  if (!user) return res.status(404).json({ success: false, message: "User not found." });

  // Active listings + sold listings (sold items shown so buyers can see the
  // seller's track record) are fetched separately so the frontend can
  // render them in two distinct sections.
  const [listings, soldListings, reviews] = await Promise.all([
    Listing.find({ seller: user._id, status: "active" }).sort({ createdAt: -1 }),
    Listing.find({ seller: user._id, status: "sold" }).sort({ updatedAt: -1 }),
    Review.find({ seller: user._id })
      .populate("reviewer", "fullName avatarUrl")
      .sort({ createdAt: -1 })
      .limit(10),
  ]);

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  // Check follow status for logged-in user
  let isFollowing = false;
  if (req.user) {
    isFollowing = user.followers.some((f) => String(f) === String(req.user._id));
  }

  res.json({ success: true, user, listings, soldListings, reviews, avgRating, reviewCount: reviews.length, isFollowing });
};

// PATCH /api/users/me  – update own profile (US-37, US-09)
exports.updateProfile = async (req, res) => {
  const allowed = ["fullName", "phone", "city", "bio", "avatarUrl", "bannerUrl", "styleTags"];
  const updates = {};
  allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.json({ success: true, user });
};

// POST /api/users/me/payment-qr
// Seller uploads a QR code image for eSewa or Khalti. `method` in the body
// says which wallet it's for; the file itself comes through multer as
// req.file (field name "qr"), same upload middleware listings use.
exports.uploadPaymentQR = async (req, res) => {
  const { method } = req.body;
  if (!["esewa", "khalti"].includes(method))
    return res.status(400).json({ success: false, message: "Method must be 'esewa' or 'khalti'." });

  if (!req.file)
    return res.status(400).json({ success: false, message: "No QR image uploaded." });

  const url = `/uploads/${req.file.filename}`;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { [`paymentQR.${method}`]: url },
    { new: true }
  ).select("-password");

  res.json({ success: true, user });
};

// POST /api/users/:id/follow  (US-37)
exports.followUser = async (req, res) => {
  if (req.params.id === String(req.user._id))
    return res.status(400).json({ success: false, message: "Cannot follow yourself." });

  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ success: false, message: "User not found." });

  const alreadyFollowing = target.followers.includes(req.user._id);
  if (alreadyFollowing) {
    await User.findByIdAndUpdate(req.params.id, { $pull: { followers: req.user._id } });
    await User.findByIdAndUpdate(req.user._id, { $pull: { following: req.params.id } });
    return res.json({ success: true, following: false });
  }

  await User.findByIdAndUpdate(req.params.id, { $addToSet: { followers: req.user._id } });
  await User.findByIdAndUpdate(req.user._id, { $addToSet: { following: req.params.id } });

  await Notification.create({
    user: req.params.id,
    type: "follow",
    title: `${req.user.fullName} followed you`,
    body: "Check out their profile.",
    meta: { userId: req.user._id },
  });

  res.json({ success: true, following: true });
};

// POST /api/users/:id/block  (US-36)
exports.blockUser = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $addToSet: { blockedUsers: req.params.id } });
  res.json({ success: true, message: "User blocked." });
};

// DELETE /api/users/:id/block  (US-36 unblock)
exports.unblockUser = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $pull: { blockedUsers: req.params.id } });
  res.json({ success: true, message: "User unblocked." });
};

// GET /api/users/me/dashboard  – seller dashboard (US-44, US-09)
exports.getDashboard = async (req, res) => {
  const [listings, pendingOrders, totalSold] = await Promise.all([
    Listing.find({ seller: req.user._id }).sort({ createdAt: -1 }),
    Order.find({ seller: req.user._id, status: "confirmed" }),
    Order.countDocuments({ seller: req.user._id, status: "delivered" }),
  ]);

  const activeListings = listings.filter((l) => l.status === "active");
  const user = await User.findById(req.user._id);

  res.json({
    success: true,
    stats: { activeListings: activeListings.length, pendingOrders: pendingOrders.length, totalSold },
    listings,
    pendingOrders,
    accountabilityScore: user.accountabilityScore,
    profileCompleteness: user.profileCompleteness,
  });
};

// GET /api/users/me/saved  – saved items (US-04)
exports.getSavedItems = async (req, res) => {
  const saved = await SavedItem.find({ user: req.user._id })
    .populate({ path: "listing", populate: { path: "seller", select: "fullName avatarUrl" } })
    .sort({ createdAt: -1 });
  res.json({ success: true, savedItems: saved });
};

// POST /api/users/me/saved  (US-04)
exports.saveItem = async (req, res) => {
  const { listingId, collectionName = "Saved" } = req.body;

  const existing = await SavedItem.findOne({ user: req.user._id, listing: listingId });
  if (existing) {
    await SavedItem.deleteOne({ _id: existing._id });
    await Listing.findByIdAndUpdate(listingId, { $inc: { saveCount: -1 } });
    return res.json({ success: true, saved: false });
  }

  await SavedItem.create({ user: req.user._id, listing: listingId, collectionName });
  await Listing.findByIdAndUpdate(listingId, { $inc: { saveCount: 1 } });
  res.status(201).json({ success: true, saved: true });
};

// GET /api/users/me/notifications
exports.getNotifications = async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({ success: true, notifications });
};

// PATCH /api/users/me/notifications/read-all
exports.markAllRead = async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  res.json({ success: true });
};

// POST /api/users/me/price-alerts  (US-13)
exports.createPriceAlert = async (req, res) => {
  const { keyword, category, maxPrice } = req.body;
  if (!keyword || !maxPrice)
    return res.status(400).json({ success: false, message: "Keyword and maxPrice required." });

  const alert = await PriceAlert.create({ user: req.user._id, keyword, category: category || "", maxPrice });
  res.status(201).json({ success: true, alert });
};

// GET /api/users/me/price-alerts
exports.getPriceAlerts = async (req, res) => {
  const alerts = await PriceAlert.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, alerts });
};

// GET /api/users/me/analytics/:listingId  (US-40)
exports.getListingAnalytics = async (req, res) => {
  const listing = await Listing.findOne({ _id: req.params.listingId, seller: req.user._id })
    .select("title viewCount saveCount shareCount chatInitiations");
  if (!listing) return res.status(404).json({ success: false, message: "Listing not found." });

  const conversionRate = listing.viewCount > 0
    ? ((listing.chatInitiations / listing.viewCount) * 100).toFixed(1)
    : 0;

  res.json({ success: true, analytics: { ...listing.toObject(), conversionRate } });
};