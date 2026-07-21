import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listingsAPI } from "../api/index";
import ListingCard from "../components/common/ListingCard";
import CompareModal from "./CompareModal";

const CATEGORIES = ["Electronics", "Fashion", "Bikes and parts", "Home and living", "Other"];
const CITIES     = ["Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara", "Chitwan"];
const CONDITIONS = ["Like New", "Good", "Fair"];

// Small reusable checkbox / radio row 
function FilterRow({ type, name, label, checked, onChange }) {
  return (
    <label style={{
      display: "flex",
      alignItems: "center",
      gap: 9,
      marginBottom: 9,
      cursor: "pointer",
      userSelect: "none",
      lineHeight: 1.4,
    }}>
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        style={{
          accentColor: "#1A6B4A",
          width: 15,
          height: 15,
          flexShrink: 0,
          cursor: "pointer",
        }}
      />
      <span style={{ fontSize: "0.87rem", color: "#6B6B67" }}>{label}</span>
    </label>
  );
}

// Section heading in sidebar 
function FilterHeading({ children }) {
  return (
    <p style={{
      fontSize: "0.72rem",
      fontWeight: 700,
      color: "#A0A09C",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      marginBottom: 10,
    }}>
      {children}
    </p>
  );
}

export default function BrowsePage() {
  const [sp, setSP]    = useSearchParams();
  const navigate       = useNavigate();

  const [q,         setQ]       = useState(sp.get("q") || "");
  const [category,  setCat]     = useState(sp.get("category") || "");
  const [condition, setCond]    = useState(sp.get("condition") || "");
  const [city,      setCity]    = useState(sp.get("city") || "");
  const [minPrice,  setMin]     = useState("");
  const [maxPrice,  setMax]     = useState("");
  const [sort,      setSort]    = useState("newest");
  const [meetup,    setMeetup]  = useState(false);
  const [verified,  setVerified]= useState(false);
  const [page,      setPage]    = useState(1);
  const [compareIds, setCompare]= useState([]);
  const [showCompare, setShowC] = useState(false);

  // Sync filters → URL
  useEffect(() => {
    const p = {};
    if (q)        p.q = q;
    if (category) p.category = category;
    if (condition) p.condition = condition;
    if (city)     p.city = city;
    if (sort !== "newest") p.sort = sort;
    setSP(p);
    setPage(1);
  }, [q, category, condition, city, sort]);

  const params = {
    q, category, condition, city,
    minPrice, maxPrice, sort,
    meetupOnly: meetup,
    verifiedOnly: verified,
    page, limit: 12,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["listings", params],
    queryFn:  () => listingsAPI.getAll(params).then(r => r.data),
    keepPreviousData: true,
  });

  const toggleCompare = id =>
    setCompare(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < 3 ? [...prev, id] : prev
    );

  const clearAll = () => {
    setQ(""); setCat(""); setCond(""); setCity("");
    setMin(""); setMax(""); setSort("newest");
    setMeetup(false); setVerified(false);
  };

  return (
    <div style={{
      maxWidth: 1100,
      margin: "0 auto",
      padding: "28px 1.5rem",
      display: "flex",
      gap: 28,
      alignItems: "flex-start",
    }}>

      <aside style={{ width: 220, flexShrink: 0 }}>
        <h3 style={{ fontWeight: 800, fontSize: "1rem", marginBottom: 24 }}>Filters</h3>

        {/* Condition */}
        <div style={{ marginBottom: 24 }}>
          <FilterHeading>Condition</FilterHeading>
          {CONDITIONS.map(c => (
            <FilterRow
              key={c}
              type="checkbox"
              label={c}
              checked={condition === c}
              onChange={() => setCond(condition === c ? "" : c)}
            />
          ))}
        </div>

        {/* Category */}
        <div style={{ marginBottom: 24 }}>
          <FilterHeading>Category</FilterHeading>
          {["", ...CATEGORIES].map(c => (
            <FilterRow
              key={c}
              type="radio"
              name="category"
              label={c || "All"}
              checked={category === c}
              onChange={() => setCat(c)}
            />
          ))}
        </div>

        {/* Price range */}
        <div style={{ marginBottom: 24 }}>
          <FilterHeading>Price range</FilterHeading>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              value={minPrice}
              onChange={e => setMin(e.target.value)}
              placeholder="Min"
              style={{
                width: "46%",
                padding: "8px 10px",
                border: "1.5px solid #E2E0D8",
                borderRadius: 8,
                fontSize: "0.84rem",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <span style={{ color: "#A0A09C", fontSize: "0.9rem", flexShrink: 0 }}>—</span>
            <input
              value={maxPrice}
              onChange={e => setMax(e.target.value)}
              placeholder="Max"
              style={{
                width: "46%",
                padding: "8px 10px",
                border: "1.5px solid #E2E0D8",
                borderRadius: 8,
                fontSize: "0.84rem",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>
        </div>

        {/* Location */}
        <div style={{ marginBottom: 20 }}>
          <FilterHeading>Location</FilterHeading>
          <select
            value={city}
            onChange={e => setCity(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px",
              border: "1.5px solid #E2E0D8",
              borderRadius: 8,
              fontSize: "0.84rem",
              color: "#1C1C1A",
              background: "#fff",
              cursor: "pointer",
              outline: "none",
              fontFamily: "inherit",
              appearance: "none",
              WebkitAppearance: "none",
            }}
          >
            <option value="">All cities</option>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Toggles */}
        <div style={{ marginBottom: 24 }}>
          <FilterRow
            type="checkbox"
            label="Meetup"
            checked={meetup}
            onChange={() => setMeetup(!meetup)}
          />
          <FilterRow
            type="checkbox"
            label="Verified sellers only"
            checked={verified}
            onChange={() => setVerified(!verified)}
          />
        </div>

        {/* Clear button */}
        <button
          onClick={clearAll}
          style={{
            width: "100%",
            background: "none",
            border: "1.5px solid #E2E0D8",
            borderRadius: 8,
            padding: "9px 0",
            cursor: "pointer",
            color: "#6B6B67",
            fontSize: "0.86rem",
            fontWeight: 600,
            fontFamily: "inherit",
          }}
        >
          Clear all
        </button>
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Search + sort bar */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search listings…"
            style={{
              flex: 1,
              padding: "10px 14px",
              border: "1.5px solid #E2E0D8",
              borderRadius: 10,
              fontSize: "0.9rem",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={{
              padding: "10px 16px",
              border: "1.5px solid #E2E0D8",
              borderRadius: 10,
              fontSize: "0.88rem",
              color: "#1C1C1A",
              background: "#fff",
              cursor: "pointer",
              outline: "none",
              fontFamily: "inherit",
              appearance: "none",
              WebkitAppearance: "none",
              minWidth: 150,
            }}
          >
            <option value="newest">Sort: Newest</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
          </select>
        </div>

        {/* Results count */}
        <p style={{ fontSize: "0.82rem", color: "#6B6B67", marginBottom: 16 }}>
          {data?.total ?? 0} results{category ? " in " + category : " for all categories"}
          {city ? " in " + city : ""}
        </p>

        {/* Grid */}
        {isLoading ? (
          <div className="listing-grid">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="skeleton" style={{ height: 250 }} />
            ))}
          </div>
        ) : !data?.listings?.length ? (
          <div style={{
            textAlign: "center",
            padding: "60px 0",
            color: "#6B6B67",
          }}>
            <p style={{ fontSize: 48, marginBottom: 12 }}>🔍</p>
            <p style={{ fontWeight: 700, fontSize: "1rem", color: "#1C1C1A", marginBottom: 6 }}>
              No listings found
            </p>
            <p style={{ fontSize: "0.88rem" }}>
              Try adjusting your filters or search term.
            </p>
          </div>
        ) : (
          <div className="listing-grid">
            {data.listings.map(l => (
              <ListingCard
                key={l._id}
                listing={l}
                onCompareToggle={toggleCompare}
                isCompared={compareIds.includes(l._id)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {data?.pages > 1 && (
          <div style={{
            display: "flex",
            gap: 6,
            justifyContent: "center",
            marginTop: 28,
          }}>
            {Array.from({ length: data.pages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  padding: "7px 13px",
                  borderRadius: 8,
                  border: "1px solid",
                  borderColor: p === page ? "#1A6B4A" : "#E2E0D8",
                  background: p === page ? "#1A6B4A" : "#fff",
                  color: p === page ? "#fff" : "#6B6B67",
                  fontWeight: 600,
                  fontSize: "0.84rem",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Compare sticky bar */}
      {compareIds.length >= 2 && (
        <div style={{
          position: "fixed",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          background: "#1A6B4A",
          color: "#fff",
          borderRadius: 32,
          padding: "12px 20px",
          display: "flex",
          gap: 12,
          alignItems: "center",
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          zIndex: 300,
        }}>
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
            {compareIds.length} items selected
          </span>
          <button
            onClick={() => setShowC(true)}
            style={{
              background: "#fff",
              color: "#1A6B4A",
              border: "none",
              borderRadius: 20,
              padding: "6px 16px",
              fontWeight: 700,
              fontSize: "0.84rem",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Compare
          </button>
          <button
            onClick={() => setCompare([])}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.8)",
              cursor: "pointer",
              fontSize: "1rem",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {showCompare && (
        <CompareModal ids={compareIds} onClose={() => setShowC(false)} />
      )}
    </div>
  );
}