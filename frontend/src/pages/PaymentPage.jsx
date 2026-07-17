import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ordersAPI, listingsAPI } from "../api/index";
import toast from "react-hot-toast";

const METHODS = [
  { id: "esewa",  label: "eSewa",             sub: "Digital wallet – scan the seller's QR to pay",  icon: "💚" },
  { id: "khalti", label: "Khalti",            sub: "Digital wallet – scan the seller's QR to pay",  icon: "💜" },
  { id: "cod",    label: "Cash on delivery",  sub: "Pay cash when item arrives or at meetup point",  icon: "💵" },
];

export default function PaymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();

  const [method, setMethod]   = useState("esewa");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState(null);

  const total = state?.totalAmount || 0;

  // Distinct query key from ["listing", id] (ListingDetailPage) and
  // ["checkout-listing", id] (CheckoutPage) — each of those caches a
  // different shape under its own key, so this one needs its own to
  // avoid the same stale-cache bug that broke Checkout earlier. We only
  // need the seller's QR codes here.
  const { data: listing } = useQuery({
    queryKey: ["payment-listing", id],
    queryFn:  () => listingsAPI.getById(id).then(r => r.data.listing),
  });

  const isDigitalWallet = method === "esewa" || method === "khalti";
  const qrUrl = isDigitalWallet ? listing?.seller?.paymentQR?.[method] : null;

  const handlePay = async () => {
    // Digital wallets need a seller QR to scan — without one there's
    // nothing for the buyer to actually pay against.
    if (isDigitalWallet && !qrUrl) {
      toast.error(`The seller hasn't set up a ${method === "esewa" ? "eSewa" : "Khalti"} QR code yet. Try another payment method or message them first.`);
      return;
    }
    setLoading(true);
    try {
      const { data } = await ordersAPI.create({
        listingId:       id,
        deliveryMethod:  state?.deliveryMethod,
        deliveryAddress: state?.address,
        meetupLocation:  state?.meetupLocation,
        paymentMethod:   method,
      });
      setOrderId(data.order._id);
      setSuccess(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    // Three distinct outcomes, not one generic "success":
    //  - COD: nothing to confirm, item just gets paid for at handoff.
    //  - Digital wallet: buyer says they paid, but the seller hasn't
    //    confirmed the money actually arrived yet. This used to say
    //    "Payment received" immediately, which wasn't true — the seller
    //    has to confirm it from their side first.
    const isCod = method === "cod";
    return (
      <div style={{ maxWidth: 480, margin: "80px auto", textAlign: "center", padding: "0 1.5rem" }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>{isCod ? "✅" : "⏳"}</div>
        <h1 style={{ marginBottom: 8 }}>{isCod ? "Order placed!" : "Order placed — waiting on the seller"}</h1>
        <p className="text-muted" style={{ marginBottom: 24 }}>
          {isCod
            ? "Pay cash at delivery or meetup."
            : "We've let the seller know you've paid. Once they confirm they've received the money, your order status will update."}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button className="btn btn-primary" onClick={() => navigate(`/orders/${orderId}`)}>View order</button>
          <button className="btn btn-ghost" onClick={() => navigate("/")}>Back to home</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 540, margin: "0 auto", padding: "28px 1.5rem" }}>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }} onClick={() => navigate(-1)}>
        ← Back to checkout
      </button>
      <h1 style={{ marginBottom: 6 }}>Payment</h1>
      <p className="text-muted" style={{ marginBottom: 28 }}>Choose payment method</p>

      {METHODS.map((m) => (
        <label key={m.id} style={{ display: "flex", gap: 14, alignItems: "center", border: `1.5px solid ${method === m.id ? "var(--green)" : "var(--border)"}`, borderRadius: 10, padding: "14px 16px", cursor: "pointer", marginBottom: 10, background: method === m.id ? "var(--green-light)" : "#fff" }}>
          <input type="radio" name="payment" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} />
          <span style={{ fontSize: 22 }}>{m.icon}</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: "0.95rem" }}>{m.label}</p>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{m.sub}</p>
          </div>
        </label>
      ))}

      {/* QR panel — only for eSewa/Khalti, once the listing (and its
          seller's QR) has loaded. This is the "how do I actually pay"
          step that was previously entirely missing. */}
      {isDigitalWallet && (
        <div style={{
          border: "1.5px dashed var(--border)",
          borderRadius: 12,
          padding: 20,
          marginTop: 6,
          marginBottom: 16,
          textAlign: "center",
          background: "#fff",
        }}>
          {qrUrl ? (
            <>
              <p style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 12 }}>
                Scan with {method === "esewa" ? "eSewa" : "Khalti"} to pay Rs. {total.toLocaleString()}
              </p>
              <img
                src={qrUrl}
                alt={`Seller's ${method} QR code`}
                style={{ width: 200, height: 200, objectFit: "contain", borderRadius: 8, border: "1px solid var(--border)" }}
              />
              <p className="text-muted text-sm" style={{ marginTop: 12 }}>
                After paying, tap the button below. The seller will confirm they've received it before your order is marked paid.
              </p>
            </>
          ) : (
            <p className="text-muted text-sm">
              This seller hasn't uploaded a {method === "esewa" ? "eSewa" : "Khalti"} QR code yet. Choose Cash on delivery, or message the seller to ask them to add one.
            </p>
          )}
        </div>
      )}

      <button
        className="btn btn-primary btn-full btn-lg"
        style={{ marginTop: 12 }}
        onClick={handlePay}
        disabled={loading || (isDigitalWallet && !qrUrl)}
      >
        {loading
          ? "Processing…"
          : isDigitalWallet
            ? `I've paid Rs. ${total.toLocaleString()} — notify seller`
            : `Confirm order — Rs. ${total.toLocaleString()}`}
      </button>
    </div>
  );
}