import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { listingsAPI, usersAPI, reportsAPI, offersAPI, messagesAPI } from "../api/index";
import { useAuth } from "../context/AuthContext";
import { Badge } from "../components/common/Badge";
import toast from "react-hot-toast";

export default function ListingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [reportOpen, setReportOpen]     = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [offerOpen, setOfferOpen]       = useState(false);
  const [offerAmount, setOfferAmount]   = useState("");
  const [activeImg, setActiveImg]       = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn:  () => listingsAPI.getById(id).then((r) => r.data),
  });
  const { data: histData } = useQuery({
    queryKey: ["price-history", id],
    queryFn:  () => listingsAPI.getPriceHistory(id).then((r) => r.data.priceHistory),
  });

  const listing   = data?.listing;
  const isSaved   = data?.isSaved;
  const seller    = listing?.seller;
  const savingsPct = listing?.originalPrice && listing.originalPrice > listing.price
    ? Math.round((1 - listing.price / listing.originalPrice) * 100) : null;

  const handleToggleSave = async () => {
    if (!user) return navigate("/login");
    try {
      await usersAPI.toggleSave(id);
      qc.invalidateQueries(["listing", id]);
      toast.success(isSaved ? "Removed from saved" : "Saved!");
    } catch { toast.error("Failed."); }
  };

  const handleReport = async () => {
    if (!reportReason) return;
    try {
      await reportsAPI.create({ listingId: id, reason: reportReason });
      toast.success("Report submitted. We'll review it shortly.");
      setReportOpen(false);
    } catch { toast.error("Failed to submit report."); }
  };

  const handleOffer = async () => {
    if (!offerAmount) return;
    try {
      await offersAPI.create(id, Number(offerAmount));
      toast.success("Offer sent! Seller will respond shortly.");
      setOfferOpen(false);
    } catch (err) { toast.error(err.response?.data?.message || "Failed."); }
  };

  const handleMessage = async () => {
    if (!user) return navigate("/login");
    try {
      const { data: d } = await messagesAPI.startConversation(id);
      navigate(`/messages/${d.conversation._id}`);
    } catch { toast.error("Failed to open chat."); }
  };

  if (isLoading) return <div style={{ padding: 48, textAlign: "center" }}>Loading…</div>;
  if (!listing)  return <div style={{ padding: 48, textAlign: "center" }}>Listing not found.</div>;

  return (
    <div className="page-padding">
      {/* Breadcrumb */}
      <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 20 }}>
        <span style={{ cursor: "pointer" }} onClick={() => navigate("/browse")}>Browse</span>
        {" › "}{listing.category}{" › "}{listing.title}
        {listing.status !== "sold" && (
          <span style={{ float: "right", display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={handleToggleSave}>
              {isSaved ? "✓ Saved" : "♡ Save"}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setReportOpen(true)}>⚑ Report</button>
          </span>
        )}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 40 }}>
        {/* Left: images */}
        <div>
          <div style={{ background: "var(--bg)", borderRadius: "var(--radius-lg)", height: 340, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 10 }}>
            {listing.imageUrls?.[activeImg]
              ? <img src={listing.imageUrls[activeImg]} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              : <span style={{ fontSize: 72, opacity: 0.2 }}>📷</span>}
          </div>
          {listing.imageUrls?.length > 1 && (
            <div style={{ display: "flex", gap: 8 }}>
              {listing.imageUrls.map((url, i) => (
                <div key={i} onClick={() => setActiveImg(i)} style={{ width: 60, height: 60, borderRadius: 8, overflow: "hidden", border: `2px solid ${i === activeImg ? "var(--green)" : "var(--border)"}`, cursor: "pointer" }}>
                  <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 20, padding: 16, background: "var(--bg)", borderRadius: "var(--radius-lg)" }}>
            <h3 style={{ marginBottom: 8 }}>Item description</h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.7 }}>{listing.description || "No description provided."}</p>
            <div style={{ marginTop: 12, display: "flex", gap: 16, fontSize: "0.8rem", color: "var(--text-muted)" }}>
              <span>👁 {listing.viewCount} views</span>
              <span>♡ {listing.saveCount} saves</span>
            </div>
          </div>

          {/* Price history chart (US-14) */}
          {histData?.length > 1 && (
            <div style={{ marginTop: 20, padding: 16, background: "var(--bg)", borderRadius: "var(--radius-lg)" }}>
              <h3 style={{ marginBottom: 12 }}>Price history</h3>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={histData.map((h) => ({ price: h.price, date: new Date(h.changedAt).toLocaleDateString() }))}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={55} tickFormatter={(v) => `Rs.${v/1000}k`} />
                  <Tooltip formatter={(v) => `Rs. ${v.toLocaleString()}`} />
                  <Line type="monotone" dataKey="price" stroke="var(--green)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Right: details + actions */}
        <div>
          <h1 style={{ fontSize: "1.6rem", marginBottom: 8 }}>{listing.title}</h1>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
            <Badge condition={listing.condition} />
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>📍 {listing.city}</span>
            {listing.status === "reserved" && <span className="badge badge-reserved">Reserved</span>}
          </div>

          {/* Price block (US-02) */}
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: "2rem", fontWeight: 800 }}>Rs. {listing.price?.toLocaleString()}</p>
            {listing.originalPrice && (
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
                <span style={{ fontSize: "0.88rem", color: "var(--text-muted)", textDecoration: "line-through" }}>
                  Rs. {listing.originalPrice.toLocaleString()}
                </span>
                {savingsPct > 0 && (
                  <span style={{ background: "var(--green-light)", color: "var(--green)", fontSize: "0.78rem", fontWeight: 700, padding: "2px 8px", borderRadius: 12 }}>
                    {savingsPct}% below retail
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Seller card (US-03) */}
          {seller && (
            <div style={{ background: "var(--bg)", borderRadius: "var(--radius-lg)", padding: 14, marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                  {seller.avatarUrl
                    ? <img src={seller.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{seller.fullName?.slice(0, 2).toUpperCase()}</span>}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>{seller.fullName}</p>
                  {seller.phoneVerified && <span style={{ fontSize: "0.75rem", color: "var(--green)", fontWeight: 600 }}>✓ Phone verified</span>}
                </div>
                {listing.status !== "sold" && (
                  <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={() => navigate(`/sellers/${seller._id}`)}>
                    View profile
                  </button>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                {[
                  ["Trust score",   seller.trustScore || "—"],
                ].map(([label, val]) => (
                  <div key={label} style={{ background: "var(--white)", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 2 }}>{label}</p>
                    <p style={{ fontWeight: 700, color: "var(--green)", fontSize: "0.9rem" }}>{val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          {listing.status === "sold" ? (
            <div style={{
              padding: "16px",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              textAlign: "center",
              fontWeight: 700,
              color: "var(--text-muted)",
              fontSize: "0.95rem",
            }}>
              Already sold
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button className="btn btn-primary btn-full btn-lg"
                onClick={() => user ? navigate(`/checkout/${id}`) : navigate("/login")}>
                Buy now – Rs. {listing.price?.toLocaleString()}
              </button>
              <button className="btn btn-outline btn-full" onClick={handleMessage}>
                Message seller
              </button>
              {listing.openToOffers && (
                <button className="btn btn-ghost btn-full" onClick={() => user ? setOfferOpen(true) : navigate("/login")}>
                  Make an offer
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Report modal */}
      {reportOpen && (
        <div className="modal-overlay" onClick={() => setReportOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Report listing <button className="modal-close" onClick={() => setReportOpen(false)}>✕</button></div>
            {["Fake item", "Wrong condition", "Scam", "Duplicate listing", "Overpriced or misleading price", "Other"].map((r) => (
              <label key={r} style={{ display: "flex", gap: 8, marginBottom: 10, cursor: "pointer", fontSize: "0.88rem" }}>
                <input type="radio" name="report" value={r} checked={reportReason === r} onChange={() => setReportReason(r)} /> {r}
              </label>
            ))}
            <button className="btn btn-danger btn-full" style={{ marginTop: 12, background: reportReason ? "var(--danger)" : "var(--border)", color: "#fff", border: "none" }} onClick={handleReport} disabled={!reportReason}>Submit report</button>
          </div>
        </div>
      )}

      {/* Offer modal */}
      {offerOpen && (
        <div className="modal-overlay" onClick={() => setOfferOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Make an offer <button className="modal-close" onClick={() => setOfferOpen(false)}>✕</button></div>
            <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginBottom: 16 }}>Asking price: Rs. {listing.price?.toLocaleString()}</p>
            <div className="form-group"><label>Your offer (Rs.)</label><input type="number" value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} placeholder="Enter amount" /></div>
            <button className="btn btn-primary btn-full" onClick={handleOffer} disabled={!offerAmount}>Send offer</button>
          </div>
        </div>
      )}
    </div>
  );
}