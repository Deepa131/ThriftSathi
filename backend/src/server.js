require("dotenv").config();
require("express-async-errors");

const express    = require("express");
const http       = require("http");
const cors       = require("cors");
const helmet     = require("helmet");
const morgan     = require("morgan");
const rateLimit  = require("express-rate-limit");
const path       = require("path");
const { Server } = require("socket.io");

const connectDB  = require("./config/db");
const setupSocket = require("./socket/index");
const { errorHandler } = require("./middleware/error");

// Route imports
const authRoutes    = require("./routes/auth");
const listingRoutes = require("./routes/listings");
const orderRoutes   = require("./routes/orders");
const userRoutes    = require("./routes/users");
const { msgRouter, revRouter, repRouter, offerRouter } = require("./routes/other");

// Connect to MongoDB
connectDB();

const app    = express();
const server = http.createServer(app);

// Socket.io 
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true },
});
setupSocket(io);

// Global middleware 
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Serve uploaded images as static files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Rate limiting 
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: "Too many attempts. Try again later." } }));
app.use("/api",      rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// Health check 
app.get("/health", (_, res) => res.json({ status: "ok", timestamp: new Date() }));

// API routes 
app.use("/api/auth",     authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/orders",   orderRoutes);
app.use("/api/users",    userRoutes);
app.use("/api/messages", msgRouter);
app.use("/api/reviews",  revRouter);
app.use("/api/reports",  repRouter);
app.use("/api/offers",   offerRouter);

// 404 
app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` }));

// Error handler (must be last) 
app.use(errorHandler);

// Start server 
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 ThriftSathi API running on http://localhost:${PORT}`);
  console.log(`   ENV : ${process.env.NODE_ENV}`);
  console.log(`   CORS: ${process.env.CLIENT_URL}\n`);
});

module.exports = { app, server };