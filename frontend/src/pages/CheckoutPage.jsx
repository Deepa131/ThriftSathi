// PATH: frontend/src/pages/CheckoutPage.jsx

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listingsAPI } from "../api/index";
import toast from "react-hot-toast";

const DELIVERY_CHARGE = 100;

export default function CheckoutPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [deliveryMethod, setDelivery] = useState("delivery");
  const [address,        setAddress]  = useState("");
  const [meetupLoc,      setMeetup]   = useState("");

  // NOTE: This must use a query key distinct from ["listing", id], which
  // ListingDetailPage.jsx uses to cache the FULL response ({ success, listing, isSaved }).
  // Sharing the same key caused React Query to serve that wrapper object here
  // instead of the unwrapped listing, making listing.price undefined and
  // incorrectly showing "This listing is missing pricing information."
  const { data: listing, isLoading } = useQuery({
    queryKey: ["checkout-listing", id],
    queryFn:  () => listingsAPI.getById(id).then(r => r.data.listing),
  });

  // Fix NaN: make sure price is a number before calculating
  const itemPrice   = Number(listing?.price) || 0;
  const charge      = deliveryMethod === "delivery" ? DELIVERY_CHARGE : 0;
  const totalAmount = itemPrice + charge;

  const handleContinue = () => {
    if (deliveryMethod === "delivery" && !address.trim()) {
      toast.error("Please enter a delivery address.");
      return;
    }
    navigate("/payment/" + id, {
      state: {
        deliveryMethod,
        address,
        meetupLocation: meetupLoc,
        totalAmount,
        listingId: id,
      },
    });
  };

  if (isLoading) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "#6B6B67" }}>
        Loading…
      </div>
    );
  }

  if (!listing) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "#6B6B67" }}>
        Listing not found.
      </div>
    );
  }

  // Guard against incomplete listing data (e.g. a listing created before
  // price validation existed, or with a missing seller). Rather than
  // silently rendering "Rs. 0" and letting checkout proceed, surface it
  // clearly — this is a data problem with the specific listing, not
  // something the buyer can fix.
  if (!listing.price || listing.price <= 0) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "#6B6B67", maxWidth: 480, margin: "0 auto" }}>
        <p style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: 8, color: "#1C1C1A" }}>
          This listing is missing pricing information.
        </p>
        <p style={{ fontSize: "0.9rem", marginBottom: 20 }}>
          It can't be checked out until the seller fixes the price on the listing.
        </p>
        <button className="btn btn-outline" onClick={() => navigate("/listings/" + id)}>← Back to listing</button>
      </div>
    );
  }

  // ── Shared style for delivery option card ─────────────────
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

      {/* Back button */}
      <button
        onClick={() => navigate("/listings/" + id)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "#fff",
          border: "1px solid #E2E0D8",
          borderRadius: 8,
          padding: "7px 14px",
          color: "#6B6B67",
          fontWeight: 600,
          fontSize: "0.84rem",
          cursor: "pointer",
          marginBottom: 24,
          fontFamily: "inherit",
        }}
      >
        ← Back to listing
      </button>

      <h1 style={{ fontWeight: 800, marginBottom: 28 }}>Confirm order</h1>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 28,
        alignItems: "flex-start",
      }}>

        {/* ══ LEFT: Item + Delivery ══════════════════════════ */}
        <div>

          {/* Item card */}
          <div style={{
            background: "#fff",
            border: "1px solid #E2E0D8",
            borderRadius: 14,
            padding: 16,
            display: "flex",
            gap: 14,
            alignItems: "center",
            marginBottom: 24,
          }}>
            <div style={{
              width: 60,
              height: 60,
              borderRadius: 10,
              background: "#F2F0EB",
              flexShrink: 0,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {listing.imageUrls?.[0] ? (
                <img
                  src={listing.imageUrls[0]}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ fontSize: 26, opacity: 0.3 }}>📦</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontWeight: 700,
                fontSize: "0.95rem",
                marginBottom: 2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {listing.title}
              </p>
              <p style={{ fontSize: "0.8rem", color: "#6B6B67", marginBottom: 4 }}>
                Seller: {listing.seller?.fullName || "—"}
              </p>
              <p style={{ fontWeight: 700, color: "#1A6B4A", fontSize: "0.95rem" }}>
                Rs. {itemPrice.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Delivery method heading */}
          <h3 style={{ fontWeight: 700, marginBottom: 14 }}>Delivery method</h3>

          {/* ── Delivery option ──────────────────────────────
              NOTE: label wraps ALL content so clicking anywhere
              on the card selects it. This fixes the broken
              layout from before.
          ─────────────────────────────────────────────────── */}
          <label style={optionCard(deliveryMethod === "delivery")}>
            <input
              type="radio"
              name="deliveryMethod"
              value="delivery"
              checked={deliveryMethod === "delivery"}
              onChange={() => setDelivery("delivery")}
              style={{
                accentColor: "#1A6B4A",
                width: 17,
                height: 17,
                flexShrink: 0,
                cursor: "pointer",
              }}
            />
            <span style={{ fontSize: 20, flexShrink: 0 }}>📦</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1C1C1A" }}>
                Delivery – Rs. {DELIVERY_CHARGE}
              </p>
              <p style={{ fontSize: "0.78rem", color: "#6B6B67", marginTop: 2 }}>
                Item delivered to your address
              </p>
            </div>
          </label>

          {/* ── Meetup option ─────────────────────────────── */}
          <label style={optionCard(deliveryMethod === "meetup")}>
            <input
              type="radio"
              name="deliveryMethod"
              value="meetup"
              checked={deliveryMethod === "meetup"}
              onChange={() => setDelivery("meetup")}
              style={{
                accentColor: "#1A6B4A",
                width: 17,
                height: 17,
                flexShrink: 0,
                cursor: "pointer",
              }}
            />
            <span style={{ fontSize: 20, flexShrink: 0 }}>🤝</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1C1C1A" }}>
                Meetup – Free
              </p>
              <p style={{ fontSize: "0.78rem", color: "#6B6B67", marginTop: 2 }}>
                Meet the seller and pay cash
              </p>
            </div>
          </label>

          {/* Address / meetup input */}
          {deliveryMethod === "delivery" && (
            <div style={{ marginTop: 14 }}>
              <label style={{
                fontSize: "0.88rem",
                fontWeight: 600,
                display: "block",
                marginBottom: 6,
                color: "#1C1C1A",
              }}>
                Delivery address
              </label>
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Enter your full address…"
                style={{
                  width: "100%",
                  border: "1.5px solid #E2E0D8",
                  borderRadius: 10,
                  padding: "11px 14px",
                  fontSize: "0.9rem",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </div>
          )}

          {deliveryMethod === "meetup" && (
            <div style={{ marginTop: 14 }}>
              <label style={{
                fontSize: "0.88rem",
                fontWeight: 600,
                display: "block",
                marginBottom: 6,
                color: "#1C1C1A",
              }}>
                Meetup location preference
              </label>
              <input
                value={meetupLoc}
                onChange={e => setMeetup(e.target.value)}
                placeholder="e.g. Newroad, Kathmandu…"
                style={{
                  width: "100%",
                  border: "1.5px solid #E2E0D8",
                  borderRadius: 10,
                  padding: "11px 14px",
                  fontSize: "0.9rem",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </div>
          )}
        </div>

        {/* ══ RIGHT: Order summary ═══════════════════════════ */}
        <div>
          <div style={{
            background: "#fff",
            border: "1px solid #E2E0D8",
            borderRadius: 16,
            padding: 24,
          }}>
            <h3 style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: 20 }}>
              Order summary
            </h3>

            <div style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 12,
            }}>
              <span style={{ color: "#6B6B67", fontSize: "0.9rem" }}>Item</span>
              <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                Rs. {itemPrice.toLocaleString()}
              </span>
            </div>

            <div style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 16,
              paddingBottom: 16,
              borderBottom: "1px solid #E2E0D8",
            }}>
              <span style={{ color: "#6B6B67", fontSize: "0.9rem" }}>Delivery charge</span>
              <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                Rs. {charge}
              </span>
            </div>

            <div style={{
              display: "flex",
              justifyContent: "space-between",
            }}>
              <span style={{ fontWeight: 800, fontSize: "1rem" }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: "1rem", color: "#1A6B4A" }}>
                Rs. {totalAmount.toLocaleString()}
              </span>
            </div>

            <button
              onClick={handleContinue}
              style={{
                display: "block",
                width: "100%",
                marginTop: 20,
                background: "#1A6B4A",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "14px 0",
                fontWeight: 700,
                fontSize: "1rem",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Continue to payment
            </button>

            <button
              onClick={() => navigate("/listings/" + id)}
              style={{
                display: "block",
                width: "100%",
                marginTop: 10,
                background: "#fff",
                color: "#6B6B67",
                border: "1px solid #E2E0D8",
                borderRadius: 12,
                padding: "12px 0",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}