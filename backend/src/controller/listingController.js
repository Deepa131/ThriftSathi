const Listing = require("../model/listing");
const { PriceAlert, Notification, SavedItem } = require("../model/index");

exports.getListings = async (req, res) => {
  const {
    q, category, condition, city, minPrice, maxPrice,
    sort = "newest", meetupOnly, verifiedOnly, page = 1, limit = 12,
  } = req.query;

  const filter = { status: "active" };

  if (q) filter.$text = { $search: q };
  if (category) filter.category = category;
  if (condition) filter.condition = { $in: condition.split(",") };
  if (city) filter.city = city;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (meetupOnly === "true") filter.meetupAvailable = true;

  const sortMap = {
    newest: { createdAt: -1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
  };

  const skip = (Number(page) - 1) * Number(limit);
  const total = await Listing.countDocuments(filter);

  let query = Listing.find(filter)
    .populate("seller", "fullName avatarUrl phoneVerified city")
    .sort(sortMap[sort] || { createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  if (verifiedOnly === "true") {
    const listings = await query;
    const filtered = listings.filter((l) => l.seller?.phoneVerified);
    return res.json({ success: true, listings: filtered, total });
  }

  const listings = await query;
  res.json({ success: true, listings, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
};

exports.getRecentListings = async (req, res) => {
  const { category, limit = 8 } = req.query;
  const filter = { status: "active" };
  if (category) filter.category = category;

  const listings = await Listing.find(filter)
    .populate("seller", "fullName avatarUrl phoneVerified city")
    .sort({ createdAt: -1 })
    .limit(Number(limit));

  res.json({ success: true, listings });
};

exports.getSoldPrices = async (req, res) => {
  const { category } = req.query;
  const filter = { status: "sold" };
  if (category) filter.category = category;

  const sold = await Listing.find(filter)
    .sort({ updatedAt: -1 })
    .limit(10)
    .select("title price condition updatedAt");

  const prices = sold.map((l) => l.price);
  const median = prices.length
    ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)]
    : 0;

  res.json({ success: true, soldItems: sold, medianPrice: median });
};

exports.getListingById = async (req, res) => {
  const listing = await Listing.findById(req.params.id)
    .populate("seller", "fullName avatarUrl phoneVerified city responseRate avgReplyMinutes trustScore accountabilityScore followers paymentQR");

  if (!listing) return res.status(404).json({ success: false, message: "Listing not found." });

  Listing.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } }).exec();

  let isSaved = false;
  if (req.user) {
    const saved = await SavedItem.findOne({ user: req.user._id, listing: listing._id });
    isSaved = !!saved;
  }

  res.json({ success: true, listing, isSaved });
};

exports.createListing = async (req, res) => {
  const {
    title, description, category, condition, price, originalPrice,
    brand, city, openToOffers, meetupAvailable, imageUrls,
    scheduledPublishAt, minOrderQty, tieredPricing, sizeGuide,
  } = req.body;

  const status = scheduledPublishAt ? "draft" : "active";

  const listing = await Listing.create({
    seller: req.user._id,
    title, description, category, condition,
    price: Number(price),
    originalPrice: originalPrice ? Number(originalPrice) : null,
    brand, city, status,
    openToOffers: openToOffers === true || openToOffers === "true",
    meetupAvailable: meetupAvailable !== false && meetupAvailable !== "false",
    imageUrls: imageUrls || [],
    scheduledPublishAt: scheduledPublishAt || null,
    minOrderQty: minOrderQty || 1,
    tieredPricing: tieredPricing || [],
    sizeGuide: sizeGuide || null,
  });

  if (status === "active") triggerPriceAlerts(listing);

  res.status(201).json({ success: true, listing });
};

exports.updateListing = async (req, res) => {
  const listing = await Listing.findOne({ _id: req.params.id, seller: req.user._id });
  if (!listing) return res.status(404).json({ success: false, message: "Listing not found or access denied." });

  const allowed = ["title", "description", "condition", "price", "originalPrice",
    "brand", "city", "openToOffers", "meetupAvailable", "imageUrls",
    "minOrderQty", "tieredPricing", "sizeGuide"];

  allowed.forEach((f) => { if (req.body[f] !== undefined) listing[f] = req.body[f]; });
  await listing.save();

  res.json({ success: true, listing });
};

exports.updateStatus = async (req, res) => {
  const { status } = req.body;
  const valid = ["active", "reserved", "inactive", "sold", "draft"];
  if (!valid.includes(status)) return res.status(400).json({ success: false, message: "Invalid status." });

  const listing = await Listing.findOneAndUpdate(
    { _id: req.params.id, seller: req.user._id },
    { status },
    { new: true }
  );
  if (!listing) return res.status(404).json({ success: false, message: "Listing not found." });

  res.json({ success: true, listing });
};

exports.deleteListing = async (req, res) => {
  const listing = await Listing.findOneAndDelete({ _id: req.params.id, seller: req.user._id });
  if (!listing) return res.status(404).json({ success: false, message: "Listing not found." });
  res.json({ success: true, message: "Listing deleted." });
};

exports.duplicateListing = async (req, res) => {
  const original = await Listing.findOne({ _id: req.params.id, seller: req.user._id });
  if (!original) return res.status(404).json({ success: false, message: "Listing not found." });

  const copy = original.toObject();
  delete copy._id;
  delete copy.createdAt;
  delete copy.updatedAt;
  copy.status = "draft";
  copy.viewCount = 0;
  copy.saveCount = 0;
  copy.priceHistory = [];

  const duplicate = await Listing.create(copy);
  res.status(201).json({ success: true, listing: duplicate });
};

exports.getPriceHistory = async (req, res) => {
  const listing = await Listing.findById(req.params.id).select("priceHistory title price");
  if (!listing) return res.status(404).json({ success: false, message: "Listing not found." });
  res.json({ success: true, priceHistory: listing.priceHistory });
};

exports.getSellerListings = async (req, res) => {
  const listings = await Listing.find({ seller: req.params.sellerId, status: "active" })
    .sort({ createdAt: -1 });
  res.json({ success: true, listings });
};

async function triggerPriceAlerts(listing) {
  try {
    const alerts = await PriceAlert.find({
      isActive: true,
      maxPrice: { $gte: listing.price },
      $or: [
        { category: "" },
        { category: listing.category },
      ],
    });

    for (const alert of alerts) {
      const keywordMatch = listing.title.toLowerCase().includes(alert.keyword.toLowerCase()) ||
        listing.description?.toLowerCase().includes(alert.keyword.toLowerCase());
      if (!keywordMatch) continue;

      await Notification.create({
        user: alert.user,
        type: "price_alert",
        title: "Price alert matched!",
        body: `"${listing.title}" listed for Rs. ${listing.price} — within your alert.`,
        meta: { listingId: listing._id },
      });
    }
  } catch (err) {
    console.error("Price alert trigger error:", err.message);
  }
}