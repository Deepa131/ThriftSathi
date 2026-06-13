const router = require("express").Router();
const ctrl = require("../controller/orderController");
const { protect } = require("../middleware/auth");

router.use(protect); // all order routes require login

router.post("/",               ctrl.createOrder);
router.get("/",                ctrl.getMyOrders);
router.get("/selling",         ctrl.getSellingOrders);
router.get("/:id",             ctrl.getOrderById);
router.patch("/:id/status",    ctrl.updateOrderStatus);
router.post("/:id/dispute",    ctrl.raiseDispute);

module.exports = router;