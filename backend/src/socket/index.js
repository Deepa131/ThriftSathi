const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { Conversation, Message } = require("../models/Message");
const { Notification } = require("../models/index");

function setupSocket(io) {
  // Authenticate every socket connection with JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Auth required"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = await User.findById(decoded.id).select("_id fullName avatarUrl");
      if (!socket.user) return next(new Error("User not found"));
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = String(socket.user._id);
    socket.join(`user:${userId}`); // Personal room for push notifications

    // Join a conversation room to receive messages in real time
    socket.on("join_conversation", async (conversationId) => {
      const convo = await Conversation.findOne({
        _id: conversationId,
        $or: [{ buyer: socket.user._id }, { seller: socket.user._id }],
      });
      if (convo) socket.join(`convo:${conversationId}`);
    });

    socket.on("leave_conversation", (conversationId) => {
      socket.leave(`convo:${conversationId}`);
    });

    // Real-time message send
    socket.on("send_message", async ({ conversationId, body, messageType = "text", structuredData }) => {
      try {
        const convo = await Conversation.findOne({
          _id: conversationId,
          $or: [{ buyer: socket.user._id }, { seller: socket.user._id }],
        });
        if (!convo) return;

        const message = await Message.create({
          conversation: conversationId,
          sender: socket.user._id,
          body,
          messageType,
          structuredData: structuredData || null,
        });

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: body.substring(0, 80),
          lastMessageAt: new Date(),
        });

        const populated = {
          ...message.toObject(),
          sender: { _id: socket.user._id, fullName: socket.user.fullName, avatarUrl: socket.user.avatarUrl },
        };

        // Broadcast to everyone in the conversation room
        io.to(`convo:${conversationId}`).emit("new_message", populated);

        // Push notification to the recipient
        const recipientId = String(socket.user._id) === String(convo.buyer)
          ? String(convo.seller) : String(convo.buyer);

        await Notification.create({
          user: recipientId,
          type: "new_message",
          title: `New message from ${socket.user.fullName}`,
          body: body.substring(0, 100),
          meta: { conversationId },
        });

        io.to(`user:${recipientId}`).emit("notification", {
          type: "new_message",
          title: `${socket.user.fullName}`,
          body: body.substring(0, 60),
          meta: { conversationId },
        });
      } catch (err) {
        socket.emit("error", { message: "Failed to send message." });
      }
    });

    // Typing indicators
    socket.on("typing", ({ conversationId }) => {
      socket.to(`convo:${conversationId}`).emit("user_typing", {
        userId, name: socket.user.fullName,
      });
    });
    socket.on("stop_typing", ({ conversationId }) => {
      socket.to(`convo:${conversationId}`).emit("user_stop_typing", { userId });
    });

    socket.on("disconnect", () => {
      console.log(` Disconnected: ${socket.user.fullName}`);
    });
  });
}

module.exports = setupSocket;