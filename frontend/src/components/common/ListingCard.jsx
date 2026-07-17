// Save this file to: frontend/src/components/common/ListingCard.jsx

import { useNavigate } from "react-router-dom";

function Badge({ condition }) {
  const map = {
    "Like New": { bg: "#E8F5EE", color: "#0F4A33" },
    "Good":     { bg: "#FFF8E1", color: "#8B6500" },
    "Fair":     { bg: "#FFF0EB", color: "#C04010" },
  };
  const style = map[condition] || map["Fair"];
  return (
    <span style={{
      display: "inline-block",
      fontSize: "0.72rem",
      fontWeight: 700,
      padding: "3px 10px",
      borderRadius: 20,
      letterSpacing: "0.3px",
      background: style.bg,
      color: style.color,
      whiteSpace: "nowrap",
    }}>
      {condition}
    </span>
  );
}

export default function ListingCard({ listing, onCompareToggle, isCompared }) {
  const navigate   = useNavigate();
  const img        = listing.imageUrls?.[0];
  const price      = listing.price;
  const origPrice  = listing.originalPrice;
  const savingsPct = (origPrice && origPrice > price)
    ? Math.round((1 - price / origPrice) * 100)
    : null;

  const catIcon = {
    "Electronics":     "💻",
    "Fashion":         "👗",
    "Bikes and parts": "🏍️",
    "Home and living": "🏠",
    "Other":           "📦",
  };

  return (
    <div
      onClick={() => navigate(`/listings/${listing._id}`)}
      style={{
        background: "#fff",
        border: isCompared ? "2px solid #1A6B4A" : "1.5px solid #E2E0D8",
        borderRadius: 14,
        overflow: "hidden",
        cursor: "pointer",
        transition: "box-shadow 0.15s, border-color 0.15s",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.09)";
        if (!isCompared) e.currentTarget.style.borderColor = "#C5E5D5";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "none";
        if (!isCompared) e.currentTarget.style.borderColor = "#E2E0D8";
      }}
    >
      {/* Image area */}
      <div style={{
        position: "relative",
        background: "#F2F0EB",
        height: 168,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flexShrink: 0,
      }}>
        {img ? (
          <img
            src={img}
            alt={listing.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{ fontSize: 52, opacity: 0.22 }}>
            {catIcon[listing.category] || "📦"}
          </span>
        )}

        {/* Savings badge top-left */}
        {savingsPct > 0 && (
          <div style={{
            position: "absolute",
            top: 8,
            left: 8,
            background: "#1A6B4A",
            color: "#fff",
            fontSize: "0.68rem",
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: 10,
          }}>
            -{savingsPct}%
          </div>
        )}

        {/* Reserved badge */}
        {listing.status === "reserved" && (
          <div style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: "#D4880A",
            color: "#fff",
            fontSize: "0.68rem",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 10,
          }}>RESERVED</div>
        )}

        {/* Sold badge — shown on the seller's profile "Sold items" section */}
        {listing.status === "sold" && (
          <div style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: "#6B6B67",
            color: "#fff",
            fontSize: "0.68rem",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 10,
          }}>SOLD</div>
        )}

        {/* Compare checkbox */}
        {onCompareToggle && (
          <div
            onClick={e => { e.stopPropagation(); onCompareToggle(listing._id); }}
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              width: 22,
              height: 22,
              borderRadius: 5,
              border: `2px solid ${isCompared ? "#1A6B4A" : "rgba(255,255,255,0.85)"}`,
              background: isCompared ? "#1A6B4A" : "rgba(255,255,255,0.85)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            {isCompared && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, lineHeight: 1 }}>✓</span>}
          </div>
        )}
      </div>

      {/* Info area */}
      <div style={{ padding: "12px 14px 14px" }}>
        <p style={{
          fontWeight: 600,
          fontSize: "0.87rem",
          color: "#1C1C1A",
          marginBottom: 4,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {listing.title}
        </p>

        <p style={{
          fontWeight: 800,
          fontSize: "1rem",
          color: "#1C1C1A",
          marginBottom: 8,
        }}>
          Rs. {price?.toLocaleString()}
        </p>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
          <Badge condition={listing.condition} />
          {listing.city && (
            <span style={{ fontSize: "0.72rem", color: "#A0A09C", whiteSpace: "nowrap" }}>
              📍 {listing.city}
            </span>
          )}
        </div>

        {listing.seller?.fullName && (
          <p style={{ fontSize: "0.74rem", color: "#6B6B67", marginTop: 7 }}>
            {listing.seller.phoneVerified && (
              <span style={{ color: "#1A6B4A" }}>✓ </span>
            )}
            {listing.seller.fullName}
          </p>
        )}
      </div>
    </div>
  );
}