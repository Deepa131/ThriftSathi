import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ordersAPI, reviewsAPI } from "../api/index";
import { useAuth } from "../context/AuthContext";
import { StatusBadge, PaymentStatusBadge } from "../components/common/Badge";
import toast from "react-hot-toast";

export default function OrderDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [disputeOpen, setDisputeOpen]   = useState(false);
  const [disputeText, setDisputeText]   = useState("");
  const [reviewOpen, setReviewOpen]     = useState(false);
  const [rating, setRating]             = useState(5);
  const [reviewBody, setReviewBody]     = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn:  () => ordersAPI.getById(id).then((r) => r.data.order),
  });
  const order = data;

  const isBuyer  = order && String(order.buyer?._id) === String(user?._id);
  const isSeller = order && String(order.seller?._id) === String(user?._id);

  const handleConfirmReceipt = async () => {
    try {
      await ordersAPI.updateStatus(id, "delivered", "Buyer confirmed receipt.");
      toast.success("Receipt confirmed.");
      qc.invalidateQueries(["order", id]);
    } catch { toast.error("Failed."); }
  };

  const handleDispute = async () => {
    if (!disputeText.trim()) return;
    try {
      await ordersAPI.raiseDispute(id, disputeText);
      toast.success("Dispute raised.");
      setDisputeOpen(false);
      qc.invalidateQueries(["order", id]);
    } catch (err) { toast.error(err.response?.data?.message || "Failed."); }
  };

  const handleReview = async () => {
    try {
      await reviewsAPI.create({ orderId: id, rating, body: reviewBody });
      toast.success("Review submitted!");
      setReviewOpen(false);
      qc.invalidateQueries(["order", id]);
    } catch (err) { toast.error(err.response?.data?.message || "Already reviewed."); }
  };

  const handleConfirmPayment = async () => {
    try {
      await ordersAPI.confirmPayment(id);
      toast.success("Payment confirmed. The buyer has been notified.");
      qc.invalidateQueries(["order", id]);
    } catch (err) { toast.error(err.response?.data?.message || "Failed."); }
  };

  const handleSellerShip = async () => {
    try {
      await ordersAPI.updateStatus(id, "shipped", "Item sent for delivery.");
      toast.success("Marked as shipped.");
      qc.invalidateQueries(["order", id]);
    } catch { toast.error("Failed."); }
  };

  if (isLoading) return <div style={{ padding: 48, textAlign: "center" }}>Loading…</div>;
  if (!order)    return <div style={{ padding: 48, textAlign: "center" }}>Order not found.</div>;

  const STEPS = [
    { key: "confirmed", label: "Order confirmed" },
    { key: "shipped",   label: "Sent for delivery" },
    { key: "delivered", label: "Delivered" },
  ];
  const currentStep = STEPS.findIndex((s) => s.key === order.status);

  // Buyer and seller are on opposite sides of the same event, so each
  // timeline entry carries a buyerNote and a sellerNote from the API.
  // Older orders created before this change only have the single
  // generic "note" field, so that's kept as a fallback.
  const timelineNoteFor = (step) =>
    (isSeller ? step.sellerNote : step.buyerNote) || step.note || "";

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 1.5rem" }}>

      {/* Simple back link — this page previously had its own sidebar with
          a different set of links/styling than the Dashboard's "Orders"
          tab it's reached from, which was confusing since it looked like
          a totally different section of the app. */}
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }} onClick={() => navigate("/orders")}>
        ← Back to Orders
      </button>

      {/* Order detail */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: "1.3rem" }}>Order #{order.orderNumber}</h1>
            <p className="text-muted text-sm">Placed {new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Item snapshot */}
        <div style={{ display: "flex", gap: 16, background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ width: 70, height: 70, borderRadius: 8, background: "var(--bg)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {order.listingSnapshot?.imageUrls?.[0]
              ? <img src={order.listingSnapshot.imageUrls[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: 28, opacity: 0.3 }}>📦</span>}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700 }}>{order.listingSnapshot?.title}</p>
            <p className="text-muted text-sm">{order.listingSnapshot?.condition} · {order.listingSnapshot?.category}</p>
            <p style={{ fontWeight: 700, color: "var(--green)", marginTop: 4 }}>Rs. {order.totalAmount?.toLocaleString()} <span style={{ fontWeight: 400, fontSize: "0.8rem", color: "var(--text-muted)" }}>({order.paymentMethod.toUpperCase()})</span></p>
            <div style={{ marginTop: 6 }}>
              <PaymentStatusBadge status={order.paymentStatus} method={order.paymentMethod} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/messages`)}>Message {isBuyer ? "seller" : "buyer"}</button>
            {isBuyer && order.status === "delivered" && (
              <button className="btn btn-primary btn-sm" onClick={() => setReviewOpen(true)}>Leave a review</button>
            )}
            {/* This must fire on "shipped", not "confirmed" — the flow is
                confirmed -> shipped -> delivered. "Confirm receipt" is the
                buyer's acknowledgement that the shipped item arrived, which
                is what moves status to "delivered" and unlocks reviews.
                It was previously checking "confirmed", which is the status
                right after checkout, before the seller ships anything — so
                orders could never reach "delivered" and the review box
                could never appear. */}
            {isBuyer && order.status === "shipped" && (
              <button className="btn btn-primary btn-sm" onClick={handleConfirmReceipt}>Confirm receipt</button>
            )}
            {isBuyer && ["confirmed", "shipped"].includes(order.status) && (
              <button className="btn btn-danger btn-sm" onClick={() => setDisputeOpen(true)}>Raise a dispute</button>
            )}
            {/* Seller must actively confirm eSewa/Khalti money arrived —
                the buyer tapping "I've paid" on the payment page only
                notifies the seller, it doesn't mark the order paid. */}
            {isSeller && order.paymentMethod !== "cod" && order.paymentStatus === "awaiting_confirmation" && (
              <button className="btn btn-primary btn-sm" onClick={handleConfirmPayment}>Confirm payment received</button>
            )}
            {isSeller && order.status === "confirmed" && (
              <button className="btn btn-primary btn-sm" onClick={handleSellerShip}>Mark as shipped</button>
            )}
          </div>
        </div>

        {/* Delivery details & contact info — this data (delivery address /
            meetup location, and the buyer's phone/city) was already being
            saved on the order and returned by the API, but no page ever
            displayed it. Without it the seller had everything except the
            one thing they actually need to ship the item. */}
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ marginBottom: 14 }}>Delivery details</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <p className="text-muted text-sm" style={{ marginBottom: 2 }}>Method</p>
              <p style={{ fontWeight: 600 }}>{order.deliveryMethod === "delivery" ? "📦 Delivery" : "🤝 Meetup"}</p>
            </div>
            <div>
              <p className="text-muted text-sm" style={{ marginBottom: 2 }}>
                {order.deliveryMethod === "delivery" ? "Delivery address" : "Meetup location"}
              </p>
              <p style={{ fontWeight: 600 }}>
                {(order.deliveryMethod === "delivery" ? order.deliveryAddress : order.meetupLocation) || "Not provided"}
              </p>
            </div>
          </div>

          {/* The seller needs the buyer's contact info to actually deliver
              the item; the buyer sees the seller's, for the same reason. */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <p className="text-muted text-sm" style={{ marginBottom: 8 }}>
              {isSeller ? "Buyer contact" : "Seller contact"}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <div>
                <p className="text-muted text-sm" style={{ marginBottom: 2 }}>Name</p>
                <p style={{ fontWeight: 600 }}>{(isSeller ? order.buyer?.fullName : order.seller?.fullName) || "—"}</p>
              </div>
              <div>
                <p className="text-muted text-sm" style={{ marginBottom: 2 }}>Phone</p>
                <p style={{ fontWeight: 600 }}>{(isSeller ? order.buyer?.phone : order.seller?.phone) || "Not provided"}</p>
              </div>
              <div>
                <p className="text-muted text-sm" style={{ marginBottom: 2 }}>City</p>
                <p style={{ fontWeight: 600 }}>{(isSeller ? order.buyer?.city : order.seller?.city) || "—"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Order timeline (US-21) — note text is role-aware: the buyer
            and seller each see the event described from their own point
            of view instead of one shared sentence written for only one
            side (e.g. a seller viewing their own order previously saw
            "Seller has been notified.", which reads wrong from their side). */}
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
          <h3 style={{ marginBottom: 16 }}>Order timeline</h3>
          {order.timeline?.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: "var(--green)", flexShrink: 0, marginTop: 3 }} />
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>{step.step}</p>
                {timelineNoteFor(step) && <p className="text-muted text-sm">{timelineNoteFor(step)}</p>}
                <p style={{ fontSize: "0.74rem", color: "var(--text-light)" }}>{new Date(step.occurredAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
          {/* Pending steps */}
          {order.status !== "delivered" && (
            <div style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start", opacity: 0.4 }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--border)", flexShrink: 0, marginTop: 3 }} />
              <p style={{ fontSize: "0.88rem" }}>Leave a review</p>
            </div>
          )}
        </div>
      </div>

      {/* Dispute modal */}
      {disputeOpen && (
        <div className="modal-overlay" onClick={() => setDisputeOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Raise a dispute <button className="modal-close" onClick={() => setDisputeOpen(false)}>✕</button></div>
            <div className="form-group">
              <label>Describe the issue</label>
              <textarea value={disputeText} onChange={(e) => setDisputeText(e.target.value)} placeholder="What went wrong?" rows={4} />
            </div>
            <button className="btn btn-danger btn-full" style={{ background: "var(--danger)", color: "#fff", border: "none" }} onClick={handleDispute}>Submit dispute</button>
          </div>
        </div>
      )}

      {/* Review modal */}
      {reviewOpen && (
        <div className="modal-overlay" onClick={() => setReviewOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Leave a review <button className="modal-close" onClick={() => setReviewOpen(false)}>✕</button></div>
            <div className="form-group">
              <label>Rating</label>
              <div style={{ display: "flex", gap: 6, fontSize: 28 }}>
                {[1,2,3,4,5].map((n) => (
                  <span key={n} style={{ cursor: "pointer", color: n <= rating ? "#F5A623" : "var(--border)" }} onClick={() => setRating(n)}>★</span>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Review (optional)</label>
              <textarea value={reviewBody} onChange={(e) => setReviewBody(e.target.value)} placeholder="Share your experience…" rows={3} />
            </div>
            <button className="btn btn-primary btn-full" onClick={handleReview}>Submit review</button>
          </div>
        </div>
      )}
    </div>
  );
}