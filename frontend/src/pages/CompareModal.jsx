import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listingsAPI } from "../api/index";
import { Badge } from "../components/common/Badge";

export default function CompareModal({ ids, onClose }) {
  const navigate = useNavigate();
  const { data: listings = [] } = useQuery({
    queryKey: ["compare", ids],
    queryFn: () => Promise.all(ids.map((id) => listingsAPI.getById(id).then((r) => r.data.listing))),
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 28, maxWidth: 860, width: "95%", maxHeight: "85vh", overflow: "auto" }}>
        <div className="modal-title">
          Compare listings
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${listings.length}, 1fr)`, gap: 16 }}>
          {listings.map((l) => (
            <div key={l._id} style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ background: "var(--bg)", height: 130, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {l.imageUrls?.[0]
                  ? <img src={l.imageUrls[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: 40, opacity: 0.3 }}>📦</span>}
              </div>
              <div style={{ padding: 12 }}>
                <p style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: 6 }}>{l.title}</p>
                <p style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--green)", marginBottom: 6 }}>Rs. {l.price?.toLocaleString()}</p>
                <Badge condition={l.condition} />
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 6 }}>
                  ⭐ {l.seller?.trustScore || "—"} · {l.seller?.fullName}
                </p>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>📍 {l.city}</p>
                <button className="btn btn-outline btn-full btn-sm" style={{ marginTop: 10 }} onClick={() => { onClose(); navigate(`/listings/${l._id}`); }}>
                  View listing
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
