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
    originalPrice: { type: Number, default: null },    
    brand: { type: String, default: "" },
    city: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "reserved", "inactive", "sold", "draft"],
      default: "active",
    },
    openToOffers: { type: Boolean, default: false },   
    meetupAvailable: { type: Boolean, default: true }, 
    imageUrls: { type: [String], default: [] },
    viewCount: { type: Number, default: 0 },           
    saveCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },
    chatInitiations: { type: Number, default: 0 },     
    priceHistory: { type: [priceHistorySchema], default: [] }, 
    scheduledPublishAt: { type: Date, default: null }, 
    minOrderQty: { type: Number, default: 1 },         
    stockQty: { type: Number, default: 1, min: 1 },
    tieredPricing: { type: [tieredPricingSchema], default: [] }, 
    sizeGuide: { type: mongoose.Schema.Types.Mixed, default: null }, 
  },
  { timestamps: true }
);

listingSchema.index({ title: "text", description: "text", brand: "text" });
listingSchema.index({ category: 1, status: 1, createdAt: -1 });
listingSchema.index({ seller: 1, status: 1 });
listingSchema.index({ price: 1 });

listingSchema.pre("save", function (next) {
  if (this.isModified("price")) {
    this.priceHistory.push({ price: this.price, changedAt: new Date() });
  }
  next();
});

listingSchema.virtual("savingsPct").get(function () {
  if (!this.originalPrice || this.originalPrice <= this.price) return 0;
  return Math.round((1 - this.price / this.originalPrice) * 100);
});

listingSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Listing", listingSchema);