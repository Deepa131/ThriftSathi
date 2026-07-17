const express = require("express");

const messageCtrl = require("../controller/messageController");
const reviewCtrl = require("../controller/reviewController");
const reportOfferCtrl = require("../controller/reportOfferController");
const { protect } = require("../middleware/auth");

const msgRouter = express.Router();
msgRouter.use(protect);
msgRouter.get("/conversations", messageCtrl.getConversations);
msgRouter.post("/conversations", messageCtrl.startConversation);
// IMPORTANT: this must stay above the "/:conversationId" route below.
// Express matches routes top-to-bottom, so if "/:conversationId" were
// declared first, a request to "/unread-count" would be swallowed by it
// (treating "unread-count" as a conversation id) and crash.
msgRouter.get("/unread-count", messageCtrl.getUnreadCount);
msgRouter.get("/:conversationId", messageCtrl.getMessages);
msgRouter.post("/:conversationId", messageCtrl.sendMessage);

const revRouter = express.Router();
revRouter.use(protect);
revRouter.post("/", reviewCtrl.createReview);
revRouter.get("/seller/:sellerId", reviewCtrl.getSellerReviews);

const repRouter = express.Router();
repRouter.use(protect);
repRouter.post("/", reportOfferCtrl.createReport);
repRouter.get("/mine", reportOfferCtrl.getMyReports);

const offerRouter = express.Router();
offerRouter.use(protect);
offerRouter.post("/", reportOfferCtrl.createOffer);
offerRouter.patch("/:id", reportOfferCtrl.respondToOffer);
offerRouter.get("/listing/:listingId", reportOfferCtrl.getOffersForListing);

module.exports = { msgRouter, revRouter, repRouter, offerRouter };