import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listingsAPI } from "../api/index";
import ListingCard from "../components/common/ListingCard";

const CATEGORIES = [
  { name: "Electronics",     icon: "💻" },
  { name: "Fashion",         icon: "👗" },
  { name: "Bikes and parts", icon: "🏍️" },
  { name: "Home and living", icon: "🏠" },
];

const CITIES = ["Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara", "Chitwan"];

export default function HomePage() {
  const navigate = useNavigate();
  const [searchQ,   setQ]    = useState("");
  const [city,      setCity] = useState("");
  const [category,  setCat]  = useState("");

  // Fetch real listings from the backend
  const { data, isLoading } = useQuery({
    queryKey: ["recent-listings"],
    queryFn: () => listingsAPI.getRecent({ limit: 8 }).then(r => r.data.listings),
    staleTime: 60_000,
  });

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQ)   params.set("q", searchQ);
    if (city)      params.set("city", city);
    if (category)  params.set("category", category);
    navigate("/browse?" + params.toString());
  };

  // ── Shared input/select style ──────────────────────────────
  const fieldStyle = {
    border: "none",
    outline: "none",
    fontSize: "0.92rem",
    color: "#1C1C1A",
    background: "transparent",
    fontFamily: "inherit",
    cursor: "pointer",
  };

  return (
    <div>
      {/* ═══════════════════════════════════════════════════════
          HERO SECTION
          ═══════════════════════════════════════════════════════ */}
      <div style={{
        background: "linear-gradient(160deg, #E8F5EE 0%, #EDF7F2 40%, #F2F0EB 100%)",
        padding: "60px 1.5rem 52px",
        textAlign: "center",
      }}>
        {/* Label */}
        <p style={{
          fontSize: "0.7rem",
          fontWeight: 700,
          letterSpacing: "0.18em",
          color: "#1A6B4A",
          textTransform: "uppercase",
          marginBottom: 16,
        }}>
          Nepal's Second-Hand Marketplace
        </p>

        {/* Headline */}
        <h1 style={{
          fontSize: "3rem",
          fontWeight: 800,
          lineHeight: 1.1,
          color: "#1C1C1A",
          marginBottom: 16,
          letterSpacing: "-1px",
        }}>
          Buy and sell<br />
          <span style={{ color: "#1A6B4A" }}>preloved items nearby</span>
        </h1>

        {/* Sub-heading */}
        <p style={{
          fontSize: "1rem",
          color: "#6B6B67",
          maxWidth: 440,
          margin: "0 auto 36px",
          lineHeight: 1.65,
        }}>
          Find great deals on electronics, fashion, and more from verified sellers across Nepal.
        </p>

        {/* ── Search bar ── matches prototype exactly ─────────
            Single white card, search field top-full-width,
            then city dropdown | categories dropdown | Search button
            all on ONE row below.
        ─────────────────────────────────────────────────────── */}
        <form onSubmit={handleSearch} style={{
          background: "#ffffff",
          borderRadius: 18,
          padding: "18px 20px 18px",
          maxWidth: 660,
          margin: "0 auto",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          textAlign: "left",
        }}>
          {/* Text search row */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            paddingBottom: 14,
            borderBottom: "1px solid #E2E0D8",
            marginBottom: 12,
          }}>
            <span style={{ color: "#A0A09C", fontSize: 16, flexShrink: 0 }}>🔍</span>
            <input
              value={searchQ}
              onChange={e => setQ(e.target.value)}
              placeholder="Search for laptops, phones, GPU and clothes"
              style={{
                ...fieldStyle,
                flex: 1,
                fontSize: "0.95rem",
              }}
            />
          </div>

          {/* City | Categories | Button on one row */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <select
              value={city}
              onChange={e => setCity(e.target.value)}
              style={{
                ...fieldStyle,
                flex: 1,
                color: city ? "#1C1C1A" : "#A0A09C",
                appearance: "none",
                WebkitAppearance: "none",
              }}
            >
              <option value="">All cities</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <div style={{ width: 1, height: 20, background: "#E2E0D8", flexShrink: 0 }} />

            <select
              value={category}
              onChange={e => setCat(e.target.value)}
              style={{
                ...fieldStyle,
                flex: 1,
                color: category ? "#1C1C1A" : "#A0A09C",
                appearance: "none",
                WebkitAppearance: "none",
              }}
            >
              <option value="">All categories</option>
              {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>

            <button
              type="submit"
              style={{
                flexShrink: 0,
                background: "#1A6B4A",
                color: "#fff",
                border: "none",
                borderRadius: 24,
                padding: "10px 24px",
                fontWeight: 700,
                fontSize: "0.92rem",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* ═══════════════════════════════════════════════════════
          CONTENT SECTION
          ═══════════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "44px 1.5rem" }}>

        {/* Recently listed */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}>
          <h2 style={{ fontSize: "1.45rem", fontWeight: 800 }}>Recently listed</h2>
          <button
            onClick={() => navigate("/browse")}
            style={{
              background: "none",
              border: "none",
              color: "#1A6B4A",
              fontWeight: 700,
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            See all →
          </button>
        </div>

        {isLoading ? (
          <div className="listing-grid">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton" style={{ height: 260 }} />
            ))}
          </div>
        ) : !data?.length ? (
          /* Empty state — shows when no one has listed anything yet */
          <div style={{
            background: "#fff",
            border: "1.5px solid #E2E0D8",
            borderRadius: 16,
            padding: "56px 24px",
            textAlign: "center",
          }}>
            <p style={{ fontSize: 52, marginBottom: 14 }}>📦</p>
            <h3 style={{ marginBottom: 8, fontWeight: 700 }}>No listings yet</h3>
            <p style={{ color: "#6B6B67", fontSize: "0.9rem", marginBottom: 20 }}>
              Be the first to sell something on ThriftSathi!
            </p>
            <button
              onClick={() => navigate("/sell")}
              style={{
                background: "#1A6B4A",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "10px 24px",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              List an item →
            </button>
          </div>
        ) : (
          <div className="listing-grid">
            {data.map(l => <ListingCard key={l._id} listing={l} />)}
          </div>
        )}

        {/* Browse by category */}
        <div style={{ marginTop: 52 }}>
          <h2 style={{ fontSize: "1.45rem", fontWeight: 800, marginBottom: 20 }}>
            Browse by category
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))",
            gap: 14,
          }}>
            {CATEGORIES.map(cat => (
              <div
                key={cat.name}
                onClick={() => navigate(`/browse?category=${encodeURIComponent(cat.name)}`)}
                style={{
                  background: "#fff",
                  border: "1.5px solid #E2E0D8",
                  borderRadius: 14,
                  padding: "28px 16px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 14,
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "#1A6B4A";
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(26,107,74,0.09)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "#E2E0D8";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <span style={{ fontSize: 36 }}>{cat.icon}</span>
                <span style={{ fontWeight: 600, fontSize: "0.92rem", color: "#1C1C1A" }}>
                  {cat.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}