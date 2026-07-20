const User = require("../model/user");
const Listing = require("../model/listing");
const Order = require("../model/order");
const { Review, SavedItem, Notification, PriceAlert, CartItem } = require("../model/index");

function effectiveUnitPrice(listing, quantity) {
  if (!listing.tieredPricing?.length) return listing.price;
  const tier = listing.tieredPricing.find(
    (t) => quantity >= t.minQty && (t.maxQty == null || quantity <= t.maxQty)
  );
  return tier ? tier.price : listing.price;
}

exports.getProfile = async (req, res) => {
  const user = await User.findById(req.params.id).select("-password -blockedUsers");
  if (!user) return res.status(404).json({ success: false, message: "User not found." });

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

  let isFollowing = false;
  if (req.user) {
    isFollowing = user.followers.some((f) => String(f) === String(req.user._id));
  }

  res.json({ success: true, user, listings, soldListings, reviews, avgRating, reviewCount: reviews.length, isFollowing });
};

exports.updateProfile = async (req, res) => {
  const allowed = ["fullName", "phone", "city", "bio", "avatarUrl", "bannerUrl", "styleTags"];
  const updates = {};
  allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.json({ success: true, user });
};

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

exports.blockUser = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $addToSet: { blockedUsers: req.params.id } });
  res.json({ success: true, message: "User blocked." });
};

exports.unblockUser = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $pull: { blockedUsers: req.params.id } });
  res.json({ success: true, message: "User unblocked." });
};

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

exports.getSavedItems = async (req, res) => {
  const saved = await SavedItem.find({ user: req.user._id })
    .populate({ path: "listing", populate: { path: "seller", select: "fullName avatarUrl" } })
    .sort({ createdAt: -1 });
  res.json({ success: true, savedItems: saved });
};

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

exports.getNotifications = async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({ success: true, notifications });
};

exports.markAllRead = async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  res.json({ success: true });
};

exports.markNotificationRead = async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({ success: false, message: "Notification not found." });
  }

  res.json({ success: true, notification });
};

exports.createPriceAlert = async (req, res) => {
  const { keyword, category, maxPrice } = req.body;
  if (!keyword || !maxPrice)
    return res.status(400).json({ success: false, message: "Keyword and maxPrice required." });

  const alert = await PriceAlert.create({ user: req.user._id, keyword, category: category || "", maxPrice });
  res.status(201).json({ success: true, alert });
};

exports.getPriceAlerts = async (req, res) => {
  const alerts = await PriceAlert.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, alerts });
};

exports.getListingAnalytics = async (req, res) => {
  const listing = await Listing.findOne({ _id: req.params.listingId, seller: req.user._id })
    .select("title viewCount saveCount shareCount chatInitiations");
  if (!listing) return res.status(404).json({ success: false, message: "Listing not found." });

  const conversionRate = listing.viewCount > 0
    ? ((listing.chatInitiations / listing.viewCount) * 100).toFixed(1)
    : 0;

  res.json({ success: true, analytics: { ...listing.toObject(), conversionRate } });
};

async function buildCartResponse(userId) {
  const items = await CartItem.find({ user: userId })
    .populate({ path: "listing", populate: { path: "seller", select: "fullName avatarUrl city" } })
    .sort({ createdAt: -1 });

  let itemCount = 0;
  let subtotal = 0;
  const withPricing = items.map((item) => {
    const listing = item.listing;
    const isAvailable = !!listing && listing.status === "active";
    const unitPrice = isAvailable ? effectiveUnitPrice(listing, item.quantity) : 0;
    const lineTotal = isAvailable ? unitPrice * item.quantity : 0;
    if (isAvailable) {
      itemCount += item.quantity;
      subtotal += lineTotal;
    }
    return { _id: item._id, listing, quantity: item.quantity, isAvailable, unitPrice, lineTotal };
  });

  return { items: withPricing, itemCount, subtotal };
}

exports.getCart = async (req, res) => {
  const cart = await buildCartResponse(req.user._id);
  res.json({ success: true, ...cart });
};

exports.addToCart = async (req, res) => {
  const { listingId, quantity = 1 } = req.body;
  if (!listingId) return res.status(400).json({ success: false, message: "listingId is required." });

  const listing = await Listing.findById(listingId);
  if (!listing) return res.status(404).json({ success: false, message: "Listing not found." });
  if (listing.status !== "active")
    return res.status(400).json({ success: false, message: "This listing is not available for purchase." });
  if (String(listing.seller) === String(req.user._id))
    return res.status(400).json({ success: false, message: "You can't add your own listing to cart." });

  const minQty = listing.minOrderQty || 1;
  const maxQty = listing.stockQty || 1;
  const existing = await CartItem.findOne({ user: req.user._id, listing: listingId });

  const requestedQty = existing
    ? existing.quantity + (Number(quantity) || 1)
    : Math.max(Number(quantity) || 1, minQty);

  if (requestedQty > maxQty)
    return res.status(400).json({ success: false, message: `Only ${maxQty} left in stock.` });

  if (existing) {
    existing.quantity = requestedQty;
    await existing.save();
  } else {
    await CartItem.create({
      user: req.user._id,
      listing: listingId,
      quantity: requestedQty,
    });
  }

  const cart = await buildCartResponse(req.user._id);
  res.status(201).json({ success: true, ...cart });
};

exports.updateCartItem = async (req, res) => {
  const { quantity } = req.body;
  if (!quantity || quantity < 1)
    return res.status(400).json({ success: false, message: "quantity must be at least 1." });

  const item = await CartItem.findOne({ user: req.user._id, listing: req.params.listingId });
  if (!item) return res.status(404).json({ success: false, message: "Item not in cart." });

  const listing = await Listing.findById(req.params.listingId);
  const maxQty = listing?.stockQty || 1;
  if (quantity > maxQty)
    return res.status(400).json({ success: false, message: `Only ${maxQty} left in stock.` });

  item.quantity = quantity;
  await item.save();

  const cart = await buildCartResponse(req.user._id);
  res.json({ success: true, ...cart });
};

exports.removeFromCart = async (req, res) => {
  await CartItem.deleteOne({ user: req.user._id, listing: req.params.listingId });
  const cart = await buildCartResponse(req.user._id);
  res.json({ success: true, ...cart });
};

exports.clearCart = async (req, res) => {
  await CartItem.deleteMany({ user: req.user._id });
  res.json({ success: true, items: [], itemCount: 0, subtotal: 0 });
};