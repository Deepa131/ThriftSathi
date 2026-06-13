const router = require("express").Router();
const { body } = require("express-validator");
const { register, login, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

router.post("/register", [
  body("fullName").trim().notEmpty().withMessage("Full name is required"),
  body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("city").notEmpty().withMessage("City is required"),
], register);

router.post("/login", login);
router.get("/me", protect, getMe);

module.exports = router;