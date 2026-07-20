const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    styleRating: { type: Number, min: 1, max: 5, default: null }, // US-41
    body: { type: String, default: "" },
    photoUrls: { type: [String], default: [] },
    verifiedPurchase: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    reason: {
      type: String,
      enum: ["Fake item", "Wrong condition", "Scam", "Duplicate listing", "Overpriced or misleading price", "Other"],
      required: true,
    },
    note: { type: String, default: "" },
    status: {
      type: String,
      enum: ["under_review", "resolved", "dismissed"],
      default: "under_review",
    },
  },
  { timestamps: true }
);

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["price_alert", "new_message", "order_update", "new_offer", "review_request", "follow"],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const savedItemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    collectionName: { type: String, default: "Saved" },
  },
  { timestamps: true }
);
savedItemSchema.index({ user: 1, listing: 1 }, { unique: true });

const priceAlertSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    keyword: { type: String, required: true },
    category: { type: String, default: "" },
    maxPrice: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const cartItemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    quantity: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true }
);
cartItemSchema.index({ user: 1, listing: 1 }, { unique: true });

const offerSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    round: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "countered", "expired"],
      default: "pending",
    },
    parentOffer: { type: mongoose.Schema.Types.ObjectId, ref: "Offer", default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = {
  Review: mongoose.model("Review", reviewSchema),
  Report: mongoose.model("Report", reportSchema),
  Notification: mongoose.model("Notification", notificationSchema),
  SavedItem: mongoose.model("SavedItem", savedItemSchema),
  PriceAlert: mongoose.model("PriceAlert", priceAlertSchema),
  Offer: mongoose.model("Offer", offerSchema),
  CartItem: mongoose.model("CartItem", cartItemSchema),
};