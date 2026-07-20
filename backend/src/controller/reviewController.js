const { Review } = require("../model/index");
const Order = require("../model/order");
const User = require("../model/user");

exports.createReview = async (req, res) => {
  const { orderId, rating, styleRating, body, photoUrls } = req.body;

  const order = await Order.findOne({ _id: orderId, buyer: req.user._id, status: "delivered" });
  if (!order)
    return res.status(400).json({ success: false, message: "Order not found or not yet delivered." });

  const existing = await Review.findOne({ order: orderId });
  if (existing)
    return res.status(409).json({ success: false, message: "You already reviewed this order." });

  const review = await Review.create({
    order: orderId,
    reviewer: req.user._id,
    seller: order.seller,
    listing: order.listing,
    rating,
    styleRating: styleRating || null,
    body: body || "",
    photoUrls: photoUrls || [],
    verifiedPurchase: true,
  });

  await recalcSellerScore(order.seller);

  const populated = await Review.findById(review._id).populate("reviewer", "fullName avatarUrl");
  res.status(201).json({ success: true, review: populated });
};

exports.getSellerReviews = async (req, res) => {
  const reviews = await Review.find({ seller: req.params.sellerId, verifiedPurchase: true })
    .populate("reviewer", "fullName avatarUrl")
    .sort({ createdAt: -1 });

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  res.json({ success: true, reviews, averageRating: Number(avg), totalReviews: reviews.length });
};

async function recalcSellerScore(sellerId) {
  const reviews = await Review.find({ seller: sellerId });
  if (!reviews.length) return;
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const trustScore = Math.min(100, Math.round(avg * 20));
  await User.findByIdAndUpdate(sellerId, { trustScore });
}