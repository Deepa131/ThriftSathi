const Order = require("../models/Order");
const Listing = require("../models/Listing");
const { Notification } = require("../models/index");

// POST /api/orders
exports.createOrder = async (req, res) => {
  const { listingId, deliveryMethod, deliveryAddress, meetupLocation, paymentMethod, quantity = 1 } = req.body;

  const listing = await Listing.findById(listingId);
  if (!listing || listing.status !== "active")
    return res.status(404).json({ success: false, message: "Listing not available." });

  if (String(listing.seller) === String(req.user._id))
    return res.status(400).json({ success: false, message: "You cannot buy your own listing." });

  if (quantity < listing.minOrderQty)
    return res.status(400).json({
      success: false,
      message: `Minimum order quantity is ${listing.minOrderQty} units.`,
    });

  // Calculate unit price (tiered pricing US-45)
  let unitPrice = listing.price;
  if (listing.tieredPricing?.length) {
    for (const tier of listing.tieredPricing) {
      if (quantity >= tier.minQty && (!tier.maxQty || quantity <= tier.maxQty)) {
        unitPrice = tier.price;
        break;
      }
    }
  }

  const deliveryCharge = deliveryMethod === "delivery" ? 100 : 0;
  const totalAmount = unitPrice * quantity + deliveryCharge;

  const order = await Order.create({
    listing: listing._id,
    buyer: req.user._id,
    seller: listing.seller,
    listingSnapshot: {
      title: listing.title,
      price: listing.price,
      condition: listing.condition,
      category: listing.category,
      imageUrls: listing.imageUrls,
    },
    quantity,
    unitPrice,
    deliveryCharge,
    totalAmount,
    deliveryMethod,
    deliveryAddress: deliveryAddress || "",
    meetupLocation: meetupLocation || "",
    paymentMethod,
    paymentStatus: paymentMethod === "cod" ? "pending" : "paid",
    status: "confirmed",
    timeline: [{ step: "Order confirmed", note: "Seller has been notified." }],
  });

  // Mark listing as sold
  await Listing.findByIdAndUpdate(listingId, { status: "sold" });

  // Notify seller
  await Notification.create({
    user: listing.seller,
    type: "order_update",
    title: "New order received!",
    body: `${req.user.fullName} ordered "${listing.title}" for Rs. ${totalAmount}.`,
    meta: { orderId: order._id },
  });

  const populated = await Order.findById(order._id)
    .populate("listing", "title imageUrls category condition")
    .populate("buyer", "fullName email phone")
    .populate("seller", "fullName email phone");

  res.status(201).json({ success: true, order: populated });
};

// GET /api/orders  – buyer's purchases
exports.getMyOrders = async (req, res) => {
  const orders = await Order.find({ buyer: req.user._id })
    .populate("listing", "title imageUrls category condition")
    .populate("seller", "fullName avatarUrl")
    .sort({ createdAt: -1 });
  res.json({ success: true, orders });
};

// GET /api/orders/selling  – seller's incoming orders
exports.getSellingOrders = async (req, res) => {
  const orders = await Order.find({ seller: req.user._id })
    .populate("listing", "title imageUrls")
    .populate("buyer", "fullName email phone")
    .sort({ createdAt: -1 });
  res.json({ success: true, orders });
};

// GET /api/orders/:id
exports.getOrderById = async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    $or: [{ buyer: req.user._id }, { seller: req.user._id }],
  })
    .populate("listing", "title imageUrls category condition city")
    .populate("buyer", "fullName email phone city")
    .populate("seller", "fullName email phone city avatarUrl");

  if (!order) return res.status(404).json({ success: false, message: "Order not found." });
  res.json({ success: true, order });
};

// PATCH /api/orders/:id/status
exports.updateOrderStatus = async (req, res) => {
  const { status, note } = req.body;
  const valid = ["confirmed", "shipped", "delivered", "cancelled"];
  if (!valid.includes(status)) return res.status(400).json({ success: false, message: "Invalid status." });

  const order = await Order.findOne({
    _id: req.params.id,
    $or: [{ buyer: req.user._id }, { seller: req.user._id }],
  });
  if (!order) return res.status(404).json({ success: false, message: "Order not found." });

  order.status = status;
  order.timeline.push({ step: status.charAt(0).toUpperCase() + status.slice(1), note: note || "" });
  await order.save();

  const notifyId = String(req.user._id) === String(order.buyer) ? order.seller : order.buyer;
  await Notification.create({
    user: notifyId,
    type: "order_update",
    title: `Order ${status}`,
    body: note || `Your order status is now: ${status}`,
    meta: { orderId: order._id },
  });

  res.json({ success: true, order });
};

// POST /api/orders/:id/dispute  (US-21)
exports.raiseDispute = async (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ success: false, message: "Reason required." });

  const order = await Order.findOne({ _id: req.params.id, buyer: req.user._id });
  if (!order) return res.status(404).json({ success: false, message: "Order not found." });

  const ageHrs = (Date.now() - new Date(order.createdAt)) / 3_600_000;
  if (ageHrs > 72)
    return res.status(400).json({ success: false, message: "Disputes must be raised within 72 hours." });

  order.disputeReason = reason;
  order.disputeStatus = "raised";
  order.status = "disputed";
  order.timeline.push({ step: "Dispute raised", note: reason });
  await order.save();

  await Notification.create({
    user: order.seller,
    type: "order_update",
    title: "Dispute raised on your order",
    body: reason,
    meta: { orderId: order._id },
  });

  res.json({ success: true, order });
};