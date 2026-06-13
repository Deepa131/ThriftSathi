const router = require("express").Router();
const ctrl = require("../controller/listingController");
const { protect, optionalAuth } = require("../middleware/auth");
const upload = require("../middleware/upload");

// Public routes
router.get("/",           optionalAuth, ctrl.getListings);
router.get("/recent",     optionalAuth, ctrl.getRecentListings);
router.get("/sold-prices",             ctrl.getSoldPrices);
router.get("/seller/:sellerId",        ctrl.getSellerListings);
router.get("/:id",        optionalAuth, ctrl.getListingById);
router.get("/:id/price-history",       ctrl.getPriceHistory);

// Protected routes (must be logged in)
router.post("/",          protect, ctrl.createListing);
router.patch("/:id",      protect, ctrl.updateListing);
router.patch("/:id/status", protect, ctrl.updateStatus);
router.delete("/:id",     protect, ctrl.deleteListing);
router.post("/:id/duplicate", protect, ctrl.duplicateListing);

// Image upload — returns array of file URLs
// US-07: up to 5 photos
router.post("/upload-images", protect, upload.array("images", 5), (req, res) => {
  if (!req.files?.length)
    return res.status(400).json({ success: false, message: "No images uploaded." });

  const urls = req.files.map((f) => `/uploads/${f.filename}`);
  res.json({ success: true, urls });
});

module.exports = router;