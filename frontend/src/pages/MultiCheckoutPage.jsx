// PATH: frontend/src/pages/MultiCheckoutPage.jsx

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";

const DELIVERY_CHARGE = 100;

export default function MultiCheckoutPage() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const [deliveryMethod, setDelivery] = useState("delivery");
  const [address,        setAddress]  = useState("");
  const [meetupLoc,      setMeetup]   = useState("");

  const seller = state?.seller;
  const items  = state?.items || [];

  // This page only makes sense arriving from the cart's "Checkout N items"
  // button, which already guarantees every item is from the same seller.
  // If someone lands here directly (e.g. a stale bookmark) there's no
  // data to check out, so send them back rather than showing a broken page.
  if (!items.length) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "#6B6B67" }}>
        <p style={{ fontWeight: 700, color: "#1C1C1A", marginBottom: 8 }}>Nothing to check out.</p>
        <p style={{ fontSize: "0.9rem", marginBottom: 20 }}>Go back to your cart and try again.</p>
        <button className="btn btn-outline" onClick={() => navigate("/cart")}>← Back to cart</button>
      </div>
    );
  }

  const itemsTotal  = items.reduce((s, it) => s + it.lineTotal, 0);
  // One delivery/meetup covers the whole batch — same seller, one trip —
  // rather than charging delivery separately per item.
  const charge      = deliveryMethod === "delivery" ? DELIVERY_CHARGE : 0;
  const totalAmount = itemsTotal + charge;

  const handleContinue = () => {
    if (deliveryMethod === "delivery" && !address.trim()) {
      toast.error("Please enter a delivery address.");
      return;
    }
    navigate("/payment/batch", {
      state: {
        seller,
        items,
        deliveryMethod,
        address,
        meetupLocation: meetupLoc,
        totalAmount,
      },
    });
  };

  const optionCard = (isSelected) => ({
    display: "flex",
    alignItems: "center",
    gap: 12,
    border: "1.5px solid " + (isSelected ? "#1A6B4A" : "#E2E0D8"),
    borderRadius: 12,
    padding: "14px 16px",
    cursor: "pointer",
    marginBottom: 10,
    background: isSelected ? "#E8F5EE" : "#fff",
    transition: "border-color 0.15s, background 0.15s",
    width: "100%",
    textAlign: "left",
  });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 1.5rem" }}>

      <button
        onClick={() => navigate("/cart")}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, background: "#fff",
          border: "1px solid #E2E0D8", borderRadius: 8, padding: "7px 14px",
          color: "#6B6B67", fontWeight: 600, fontSize: "0.84rem", cursor: "pointer",
          marginBottom: 24, fontFamily: "inherit",
        }}
      >
        ← Back to cart
      </button>

      <h1 style={{ fontWeight: 800, marginBottom: 4 }}>Confirm order</h1>
      <p style={{ color: "#6B6B67", fontSize: "0.88rem", marginBottom: 28 }}>
        {items.length} items from {seller?.fullName || "this seller"} — paid for together in one order
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, alignItems: "flex-start" }}>

        {/* LEFT: items + delivery */}
        <div>
          <div style={{ background: "#fff", border: "1px solid #E2E0D8", borderRadius: 14, padding: 16, marginBottom: 24 }}>
            {items.map((it) => (
              <div key={it.listingId} style={{ display: "flex", gap: 14, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F0EFE9" }}>
                <div style={{ width: 50, height: 50, borderRadius: 10, background: "#F2F0EB", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {it.imageUrl
                    ? <img src={it.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: 22, opacity: 0.3 }}>📦</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.title}</p>
                  <p style={{ fontSize: "0.8rem", color: "#6B6B67" }}>
                    Rs. {it.unitPrice.toLocaleString()} {it.quantity > 1 && `× ${it.quantity}`}
                  </p>
                </div>
                <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>Rs. {it.lineTotal.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <h3 style={{ fontWeight: 700, marginBottom: 14 }}>Delivery method</h3>

          <label style={optionCard(deliveryMethod === "delivery")}>
            <input type="radio" name="deliveryMethod" value="delivery" checked={deliveryMethod === "delivery"}
              onChange={() => setDelivery("delivery")} style={{ accentColor: "#1A6B4A", width: 17, height: 17, flexShrink: 0, cursor: "pointer" }} />
            <span style={{ fontSize: 20, flexShrink: 0 }}>📦</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1C1C1A" }}>Delivery – Rs. {DELIVERY_CHARGE}</p>
              <p style={{ fontSize: "0.78rem", color: "#6B6B67", marginTop: 2 }}>All items delivered together to your address</p>
            </div>
          </label>

          <label style={optionCard(deliveryMethod === "meetup")}>
            <input type="radio" name="deliveryMethod" value="meetup" checked={deliveryMethod === "meetup"}
              onChange={() => setDelivery("meetup")} style={{ accentColor: "#1A6B4A", width: 17, height: 17, flexShrink: 0, cursor: "pointer" }} />
            <span style={{ fontSize: 20, flexShrink: 0 }}>🤝</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1C1C1A" }}>Meetup – Free</p>
              <p style={{ fontSize: "0.78rem", color: "#6B6B67", marginTop: 2 }}>Meet the seller once and pay cash for everything</p>
            </div>
          </label>

          {deliveryMethod === "delivery" && (
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: "0.88rem", fontWeight: 600, display: "block", marginBottom: 6, color: "#1C1C1A" }}>Delivery address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter your full address…"
                style={{ width: "100%", border: "1.5px solid #E2E0D8", borderRadius: 10, padding: "11px 14px", fontSize: "0.9rem", outline: "none", fontFamily: "inherit" }} />
            </div>
          )}

          {deliveryMethod === "meetup" && (
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: "0.88rem", fontWeight: 600, display: "block", marginBottom: 6, color: "#1C1C1A" }}>Meetup location preference</label>
              <input value={meetupLoc} onChange={(e) => setMeetup(e.target.value)} placeholder="e.g. Newroad, Kathmandu…"
                style={{ width: "100%", border: "1.5px solid #E2E0D8", borderRadius: 10, padding: "11px 14px", fontSize: "0.9rem", outline: "none", fontFamily: "inherit" }} />
            </div>
          )}
        </div>

        {/* RIGHT: order summary */}
        <div>
          <div style={{ background: "#fff", border: "1px solid #E2E0D8", borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: 20 }}>Order summary</h3>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ color: "#6B6B67", fontSize: "0.9rem" }}>Items ({items.length})</span>
              <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Rs. {itemsTotal.toLocaleString()}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #E2E0D8" }}>
              <span style={{ color: "#6B6B67", fontSize: "0.9rem" }}>Delivery charge</span>
              <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Rs. {charge}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 800, fontSize: "1rem" }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: "1rem", color: "#1A6B4A" }}>Rs. {totalAmount.toLocaleString()}</span>
            </div>

            <button onClick={handleContinue} style={{
              display: "block", width: "100%", marginTop: 20, background: "#1A6B4A", color: "#fff",
              border: "none", borderRadius: 12, padding: "14px 0", fontWeight: 700, fontSize: "1rem",
              cursor: "pointer", fontFamily: "inherit",
            }}>
              Continue to payment
            </button>

            <button onClick={() => navigate("/cart")} style={{
              display: "block", width: "100%", marginTop: 10, background: "#fff", color: "#6B6B67",
              border: "1px solid #E2E0D8", borderRadius: 12, padding: "12px 0", fontWeight: 600,
              fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit",
            }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}