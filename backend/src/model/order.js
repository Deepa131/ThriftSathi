const mongoose = require("mongoose");

const timelineStepSchema = new mongoose.Schema({
  step: { type: String, required: true },
  buyerNote: { type: String, default: "" },
  sellerNote: { type: String, default: "" },
  note: { type: String, default: "" }, 
  occurredAt: { type: Date, default: Date.now },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    listingSnapshot: {
      title: String,
      price: Number,
      condition: String,
      category: String,
      imageUrls: [String],
    },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true },
    deliveryCharge: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    deliveryMethod: { type: String, enum: ["delivery", "meetup"], required: true },
    deliveryAddress: { type: String, default: "" },
    meetupLocation: { type: String, default: "" },
    paymentMethod: {
      type: String,
      enum: ["esewa", "khalti", "cod"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "awaiting_confirmation", "paid", "failed"],
      default: "pending",
    },
    status: {
      type: String,
      enum: ["confirmed", "shipped", "delivered", "disputed", "cancelled"],
      default: "confirmed",
    },
    timeline: { type: [timelineStepSchema], default: [] }, 
    batchId: { type: String, default: null, index: true },
    disputeReason: { type: String, default: "" },
    disputeStatus: {
      type: String,
      enum: ["none", "raised", "seller_notified", "evidence_review", "resolved"],
      default: "none",
    },
  },
  { timestamps: true }
);

orderSchema.pre("save", async function (next) {
  if (this.isNew && !this.orderNumber) {
    const count = await mongoose.model("Order").countDocuments();
    this.orderNumber = `ORD-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);