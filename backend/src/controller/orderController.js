const mongoose = require("mongoose");
const Order = require("../model/order");
const Listing = require("../model/listing");
const { Notification, CartItem } = require("../model/index");

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

  if (quantity > (listing.stockQty || 1))
    return res.status(400).json({
      success: false,
      message: `Only ${listing.stockQty || 1} left in stock.`,
    });

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
    paymentStatus: paymentMethod === "cod" ? "pending" : "awaiting_confirmation",
    status: "confirmed",
    timeline: [{
      step: "Order placed",
      buyerNote: paymentMethod === "cod"
        ? "Seller has been notified. Pay cash on delivery/meetup."
        : "Seller has been notified and asked to confirm your payment.",
      sellerNote: paymentMethod === "cod"
        ? `${req.user.fullName} placed an order and will pay cash on delivery/meetup.`
        : `${req.user.fullName} placed an order and is waiting for you to confirm the payment.`,
    }],
  });

  await Listing.findByIdAndUpdate(listingId, { status: "sold" });

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

exports.createBatchOrder = async (req, res) => {
  const { items, deliveryMethod, deliveryAddress, meetupLocation, paymentMethod } = req.body;

  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ success: false, message: "No items to check out." });

  const listingIds = items.map((i) => i.listingId);
  const listings = await Listing.find({ _id: { $in: listingIds } });

  if (listings.length !== listingIds.length)
    return res.status(404).json({ success: false, message: "One or more listings are no longer available." });

  const sellerId = String(listings[0].seller);
  const sameSeller = listings.every((l) => String(l.seller) === sellerId);
  if (!sameSeller)
    return res.status(400).json({ success: false, message: "All items in a combined checkout must be from the same seller." });

  if (sellerId === String(req.user._id))
    return res.status(400).json({ success: false, message: "You cannot buy your own listing." });

  for (const listing of listings) {
    if (listing.status !== "active")
      return res.status(400).json({ success: false, message: `"${listing.title}" is no longer available.` });
  }

  const byId = Object.fromEntries(listings.map((l) => [String(l._id), l]));

    for (const { listingId, quantity = 1 } of items) {
    const listing = byId[listingId];
    if (quantity < (listing.minOrderQty || 1))
      return res.status(400).json({ success: false, message: `Minimum order for "${listing.title}" is ${listing.minOrderQty} units.` });
    if (quantity > (listing.stockQty || 1))
      return res.status(400).json({ success: false, message: `Only ${listing.stockQty || 1} left in stock for "${listing.title}".` });
  }

  const batchId = new mongoose.Types.ObjectId().toString();
  const createdOrders = [];
  let batchTotal = 0;

  for (const { listingId, quantity = 1 } of items) {
    const listing = byId[listingId];

    let unitPrice = listing.price;
    if (listing.tieredPricing?.length) {
      for (const tier of listing.tieredPricing) {
        if (quantity >= tier.minQty && (!tier.maxQty || quantity <= tier.maxQty)) {
          unitPrice = tier.price;
          break;
        }
      }
    }

    const deliveryCharge = createdOrders.length === 0 && deliveryMethod === "delivery" ? 100 : 0;
    const totalAmount = unitPrice * quantity + deliveryCharge;
    batchTotal += totalAmount;

    const order = await Order.create({
      listing: listing._id,
      buyer: req.user._id,
      seller: listing.seller,
      batchId,
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
      paymentStatus: paymentMethod === "cod" ? "pending" : "awaiting_confirmation",
      status: "confirmed",
      timeline: [{
        step: "Order placed",
        buyerNote: paymentMethod === "cod"
          ? "Seller has been notified. Pay cash on delivery/meetup."
          : "Seller has been notified and asked to confirm your payment.",
        sellerNote: paymentMethod === "cod"
          ? `${req.user.fullName} placed a combined order and will pay cash on delivery/meetup.`
          : `${req.user.fullName} placed a combined order and is waiting for you to confirm the payment.`,
      }],
    });

    await Listing.findByIdAndUpdate(listing._id, { status: "sold" });
    await CartItem.deleteOne({ user: req.user._id, listing: listing._id });

    createdOrders.push(order);
  }

  await Notification.create({
    user: sellerId,
    type: "order_update",
    title: "New order received!",
    body: `${req.user.fullName} placed a combined order for ${createdOrders.length} item(s) totalling Rs. ${batchTotal}.`,
    meta: { batchId },
  });

  const populated = await Order.find({ batchId })
    .populate("listing", "title imageUrls category condition")
    .populate("buyer", "fullName email phone")
    .populate("seller", "fullName email phone");

  res.status(201).json({ success: true, batchId, totalAmount: batchTotal, orders: populated });
};
exports.getMyOrders = async (req, res) => {
  const orders = await Order.find({ buyer: req.user._id })
    .populate("listing", "title imageUrls category condition")
    .populate("seller", "fullName avatarUrl")
    .sort({ createdAt: -1 });
  res.json({ success: true, orders });
};

exports.getSellingOrders = async (req, res) => {
  const orders = await Order.find({ seller: req.user._id })
    .populate("listing", "title imageUrls")
    .populate("buyer", "fullName email phone")
    .sort({ createdAt: -1 });
  res.json({ success: true, orders });
};

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

  let buyerNote = note || "";
  let sellerNote = note || "";
  if (status === "shipped") {
    buyerNote  = "Seller marked your item as shipped.";
    sellerNote = "You marked the item as shipped.";
  } else if (status === "delivered") {
    buyerNote  = "You confirmed you received the item.";
    sellerNote = "Buyer confirmed they received the item.";
  } else if (status === "cancelled") {
    buyerNote  = note || "This order was cancelled.";
    sellerNote = note || "This order was cancelled.";
  } else if (status === "confirmed") {
    buyerNote  = note || "Order confirmed.";
    sellerNote = note || "Order confirmed.";
  }

  order.timeline.push({
    step: status.charAt(0).toUpperCase() + status.slice(1),
    buyerNote,
    sellerNote,
  });
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

exports.confirmPayment = async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, seller: req.user._id });
  if (!order) return res.status(404).json({ success: false, message: "Order not found." });

  if (order.paymentMethod === "cod")
    return res.status(400).json({ success: false, message: "Cash on delivery orders don't need payment confirmation." });

  if (order.paymentStatus === "paid")
    return res.status(400).json({ success: false, message: "Payment was already confirmed." });

  order.paymentStatus = "paid";
  order.timeline.push({
    step: "Payment confirmed",
    buyerNote: "Seller confirmed your payment was received.",
    sellerNote: "You confirmed the payment was received.",
  });
  await order.save();

  await Notification.create({
    user: order.buyer,
    type: "order_update",
    title: "Payment confirmed!",
    body: `The seller confirmed your ${order.paymentMethod.toUpperCase()} payment for order #${order.orderNumber}.`,
    meta: { orderId: order._id },
  });

  const populated = await Order.findById(order._id)
    .populate("listing", "title imageUrls category condition")
    .populate("buyer", "fullName email phone")
    .populate("seller", "fullName email phone");

  res.json({ success: true, order: populated });
};

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
  order.timeline.push({
    step: "Dispute raised",
    buyerNote: `You raised a dispute: "${reason}"`,
    sellerNote: `Buyer raised a dispute: "${reason}"`,
  });
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