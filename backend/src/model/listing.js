const mongoose = require("mongoose");

const priceHistorySchema = new mongoose.Schema({
  price: { type: Number, required: true },
  changedAt: { type: Date, default: Date.now },
});

const tieredPricingSchema = new mongoose.Schema({
  minQty: Number,
  maxQty: Number,
  price: Number,
});

const listingSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: {
      type: String,
      required: true,
      enum: ["Electronics", "Fashion", "Bikes and parts", "Home and living", "Other"],
    },
    condition: {
      type: String,
      required: true,
      enum: ["Like New", "Good", "Fair"],
    },
    price: { type: Number, required: true, min: 1 },
    originalPrice: { type: Number, default: null },    // US-02: retail price comparison
    brand: { type: String, default: "" },
    city: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "reserved", "inactive", "sold", "draft"],
      default: "active",
    },
    openToOffers: { type: Boolean, default: false },   // US-15
    meetupAvailable: { type: Boolean, default: true }, // US-31
    imageUrls: { type: [String], default: [] },
    viewCount: { type: Number, default: 0 },           // US-06
    saveCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },
    chatInitiations: { type: Number, default: 0 },     // US-40
    priceHistory: { type: [priceHistorySchema], default: [] }, // US-14
    scheduledPublishAt: { type: Date, default: null }, // US-42
    minOrderQty: { type: Number, default: 1 },         // US-48
    tieredPricing: { type: [tieredPricingSchema], default: [] }, // US-45
    sizeGuide: { type: mongoose.Schema.Types.Mixed, default: null }, // US-12
  },
  { timestamps: true }
);

// Text index for full-text search
listingSchema.index({ title: "text", description: "text", brand: "text" });
listingSchema.index({ category: 1, status: 1, createdAt: -1 });
listingSchema.index({ seller: 1, status: 1 });
listingSchema.index({ price: 1 });

// Record price in history when price changes
listingSchema.pre("save", function (next) {
  if (this.isModified("price")) {
    this.priceHistory.push({ price: this.price, changedAt: new Date() });
  }
  next();
});

// Virtual: savings percentage
listingSchema.virtual("savingsPct").get(function () {
  if (!this.originalPrice || this.originalPrice <= this.price) return 0;
  return Math.round((1 - this.price / this.originalPrice) * 100);
});

listingSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Listing", listingSchema);