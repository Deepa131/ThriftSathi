const router = require("express").Router();
const ctrl = require("../controller/userController");
const { protect, optionalAuth } = require("../middleware/auth");

// Public
router.get("/:id", optionalAuth, ctrl.getProfile);

// Protected
router.use(protect);
router.patch("/me/profile",                ctrl.updateProfile);
router.get("/me/dashboard",               ctrl.getDashboard);
router.get("/me/saved",                   ctrl.getSavedItems);
router.post("/me/saved",                  ctrl.saveItem);
router.get("/me/notifications",           ctrl.getNotifications);
router.patch("/me/notifications/read-all", ctrl.markAllRead);
router.post("/me/price-alerts",           ctrl.createPriceAlert);
router.get("/me/price-alerts",            ctrl.getPriceAlerts);
router.get("/me/analytics/:listingId",    ctrl.getListingAnalytics);
router.post("/:id/follow",               ctrl.followUser);
router.post("/:id/block",                ctrl.blockUser);
router.delete("/:id/block",              ctrl.unblockUser);

module.exports = router;