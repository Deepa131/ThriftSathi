const mongoose = require("mongoose");

// One conversation per listing per buyer
const conversationSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date, default: Date.now },
    unreadBuyer: { type: Number, default: 0 },
    unreadSeller: { type: Number, default: 0 },
  },
  { timestamps: true }
);

conversationSchema.index({ buyer: 1, seller: 1, listing: 1 }, { unique: true });

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true },
    // US-08: quick_inquiry | US-33: meetup_proposal | US-15: offer | text
    messageType: {
      type: String,
      enum: ["text", "quick_inquiry", "meetup_proposal", "offer"],
      default: "text",
    },
    // Stores structured card data for non-text messages
    structuredData: { type: mongoose.Schema.Types.Mixed, default: null },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Conversation = mongoose.model("Conversation", conversationSchema);
const Message = mongoose.model("Message", messageSchema);

module.exports = { Conversation, Message };