const { Report, Offer, Notification } = require("../models/index");
const Listing = require("../models/Listing");

// ── REPORT CONTROLLER ─────────────────────────────────────────────────────────

// POST /api/reports
exports.createReport = async (req, res) => {
  const { listingId, reason, note } = req.body;

  const listing = await Listing.findById(listingId);
  if (!listing) return res.status(404).json({ success: false, message: "Listing not found." });

  const report = await Report.create({
    reporter: req.user._id,
    listing: listingId,
    reason,
    note: note || "",
  });

  res.status(201).json({ success: true, report });
};

// GET /api/reports/mine  – buyer tracks their own reports (US-20)
exports.getMyReports = async (req, res) => {
  const reports = await Report.find({ reporter: req.user._id })
    .populate("listing", "title imageUrls")
    .sort({ createdAt: -1 });
  res.json({ success: true, reports });
};

// ── OFFER CONTROLLER (US-15) ──────────────────────────────────────────────────

// POST /api/offers
exports.createOffer = async (req, res) => {
  const { listingId, amount } = req.body;

  const listing = await Listing.findById(listingId);
  if (!listing || !listing.openToOffers)
    return res.status(400).json({ success: false, message: "This listing does not accept offers." });

  if (String(listing.seller) === String(req.user._id))
    return res.status(400).json({ success: false, message: "Cannot offer on your own listing." });

  // Check active offer count (max 3 rounds)
  const existingOffers = await Offer.find({ listing: listingId, buyer: req.user._id });
  if (existingOffers.length >= 3)
    return res.status(400).json({ success: false, message: "Maximum 3 offer rounds reached." });

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48hrs
  const offer = await Offer.create({
    listing: listingId,
    buyer: req.user._id,
    amount,
    round: existingOffers.length + 1,
    expiresAt,
  });

  await Notification.create({
    user: listing.seller,
    type: "new_offer",
    title: `New offer on "${listing.title}"`,
    body: `${req.user.fullName} offered Rs. ${amount}`,
    meta: { offerId: offer._id, listingId },
  });

  res.status(201).json({ success: true, offer });
};

// PATCH /api/offers/:id  – accept / decline / counter
exports.respondToOffer = async (req, res) => {
  const { action, counterAmount } = req.body; // action: accept|decline|counter

  const offer = await Offer.findById(req.params.id).populate("listing");
  if (!offer) return res.status(404).json({ success: false, message: "Offer not found." });
  if (String(offer.listing.seller) !== String(req.user._id))
    return res.status(403).json({ success: false, message: "Not authorised." });

  if (action === "accept") offer.status = "accepted";
  else if (action === "decline") offer.status = "declined";
  else if (action === "counter") {
    if (!counterAmount) return res.status(400).json({ success: false, message: "Counter amount required." });
    offer.status = "countered";
    // Create counter offer
    await Offer.create({
      listing: offer.listing._id,
      buyer: offer.buyer,
      amount: counterAmount,
      round: offer.round + 1,
      parentOffer: offer._id,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    });
  }

  await offer.save();

  await Notification.create({
    user: offer.buyer,
    type: "new_offer",
    title: `Your offer was ${action}ed`,
    body: action === "counter" ? `Seller countered with Rs. ${counterAmount}` : `Your offer of Rs. ${offer.amount} was ${action}ed`,
    meta: { offerId: offer._id },
  });

  res.json({ success: true, offer });
};

// GET /api/offers/listing/:listingId
exports.getOffersForListing = async (req, res) => {
  const listing = await Listing.findOne({ _id: req.params.listingId, seller: req.user._id });
  if (!listing) return res.status(403).json({ success: false, message: "Not authorised." });

  const offers = await Offer.find({ listing: req.params.listingId })
    .populate("buyer", "fullName avatarUrl")
    .sort({ createdAt: -1 });

  res.json({ success: true, offers });
};