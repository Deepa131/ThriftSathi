const { Conversation, Message } = require("../models/Message");
const Listing = require("../models/Listing");
const { Notification } = require("../models/index");

// GET /api/messages/conversations
// Returns all conversations for the logged-in user
exports.getConversations = async (req, res) => {
  const conversations = await Conversation.find({
    $or: [{ buyer: req.user._id }, { seller: req.user._id }],
  })
    .populate("listing", "title imageUrls price condition status")
    .populate("buyer", "fullName avatarUrl")
    .populate("seller", "fullName avatarUrl")
    .sort({ lastMessageAt: -1 });

  res.json({ success: true, conversations });
};

// POST /api/messages/conversations
// Start or retrieve a conversation for a listing
exports.startConversation = async (req, res) => {
  const { listingId } = req.body;

  const listing = await Listing.findById(listingId).populate("seller", "_id");
  if (!listing) return res.status(404).json({ success: false, message: "Listing not found." });

  if (String(listing.seller._id) === String(req.user._id))
    return res.status(400).json({ success: false, message: "Cannot message yourself." });

  // Find existing or create new
  let conversation = await Conversation.findOne({
    listing: listingId,
    buyer: req.user._id,
  });

  if (!conversation) {
    conversation = await Conversation.create({
      listing: listingId,
      buyer: req.user._id,
      seller: listing.seller._id,
    });
    // Increment chat initiations on listing (US-40)
    await Listing.findByIdAndUpdate(listingId, { $inc: { chatInitiations: 1 } });
  }

  const populated = await Conversation.findById(conversation._id)
    .populate("listing", "title imageUrls price condition")
    .populate("buyer", "fullName avatarUrl")
    .populate("seller", "fullName avatarUrl");

  res.status(201).json({ success: true, conversation: populated });
};

// GET /api/messages/:conversationId
// Get all messages in a conversation
exports.getMessages = async (req, res) => {
  const convo = await Conversation.findOne({
    _id: req.params.conversationId,
    $or: [{ buyer: req.user._id }, { seller: req.user._id }],
  });
  if (!convo) return res.status(404).json({ success: false, message: "Conversation not found." });

  const messages = await Message.find({ conversation: req.params.conversationId })
    .populate("sender", "fullName avatarUrl")
    .sort({ createdAt: 1 });

  // Mark messages sent to this user as read
  await Message.updateMany(
    { conversation: req.params.conversationId, sender: { $ne: req.user._id }, isRead: false },
    { isRead: true }
  );

  res.json({ success: true, messages });
};

// POST /api/messages/:conversationId
// Send a message (HTTP fallback — real-time uses socket)
exports.sendMessage = async (req, res) => {
  const { body, messageType = "text", structuredData } = req.body;

  const convo = await Conversation.findOne({
    _id: req.params.conversationId,
    $or: [{ buyer: req.user._id }, { seller: req.user._id }],
  });
  if (!convo) return res.status(404).json({ success: false, message: "Conversation not found." });

  const message = await Message.create({
    conversation: req.params.conversationId,
    sender: req.user._id,
    body,
    messageType,
    structuredData: structuredData || null,
  });

  await Conversation.findByIdAndUpdate(req.params.conversationId, {
    lastMessage: body.substring(0, 80),
    lastMessageAt: new Date(),
  });

  const recipientId = String(req.user._id) === String(convo.buyer)
    ? convo.seller : convo.buyer;

  await Notification.create({
    user: recipientId,
    type: "new_message",
    title: `New message from ${req.user.fullName}`,
    body: body.substring(0, 100),
    meta: { conversationId: convo._id },
  });

  const populated = await Message.findById(message._id).populate("sender", "fullName avatarUrl");
  res.status(201).json({ success: true, message: populated });
};