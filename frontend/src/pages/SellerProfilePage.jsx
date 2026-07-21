import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usersAPI, messagesAPI } from "../api/index";
import { useAuth } from "../context/AuthContext";
import ListingCard from "../components/common/ListingCard";
import toast from "react-hot-toast";

export default function SellerProfilePage() {
  const { id }  = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["seller", id],
    queryFn:  () => usersAPI.getProfile(id).then((r) => r.data),
  });

  const handleFollow = async () => {
    if (!user) return navigate("/login");
    try {
      const { data: d } = await usersAPI.follow(id);
      toast.success(d.following ? "Following!" : "Unfollowed.");
      qc.invalidateQueries(["seller", id]);
    } catch { toast.error("Failed."); }
  };

  const handleBlock = async () => {
    if (!user) return navigate("/login");
    if (!window.confirm("Block this user?")) return;
    try {
      await usersAPI.block(id);
      toast.success("User blocked.");
      navigate("/");
    } catch { toast.error("Failed."); }
  };

  const handleMessage = async () => {
    if (!user) return navigate("/login");
    // Open messages page – no specific listing
    navigate("/messages");
  };

  if (isLoading) return <div style={{ padding: 48, textAlign: "center" }}>Loading…</div>;
  if (!data)     return <div style={{ padding: 48, textAlign: "center" }}>User not found.</div>;

  const { user: seller, listings, soldListings, reviews, avgRating, reviewCount, isFollowing } = data;

  return (
    <div className="page-padding" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 32 }}>

      {/* Left sidebar: profile card */}
      <aside>
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: 24, textAlign: "center", position: "sticky", top: 76 }}>
          {/* Banner */}
          {seller.bannerUrl && (
            <div style={{ height: 80, borderRadius: 10, overflow: "hidden", marginBottom: -36, margin: "0 -24px 0" }}>
              <img src={seller.bannerUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
          {/* Avatar */}
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--green)", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid #fff", overflow: "hidden", position: "relative", zIndex: 1 }}>
            {seller.avatarUrl
              ? <img src={seller.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ color: "#fff", fontWeight: 800, fontSize: 22 }}>{seller.fullName?.slice(0, 2).toUpperCase()}</span>}
          </div>

          <h2 style={{ marginBottom: 4 }}>{seller.fullName}</h2>
          <p className="text-muted text-sm">📍 {seller.city}</p>

          {/* Style tags (US-37) */}
          {seller.styleTags?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center", margin: "10px 0" }}>
              {seller.styleTags.map((t) => (
                <span key={t} style={{ background: "var(--bg)", color: "var(--text-muted)", fontSize: "0.74rem", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>{t}</span>
              ))}
            </div>
          )}

          {/* Verification + rating */}
          {seller.phoneVerified && <div style={{ fontSize: "0.8rem", color: "var(--green)", fontWeight: 600, marginBottom: 4 }}>✓ Phone verified</div>}
          <div style={{ marginBottom: 14, fontSize: "0.85rem", color: "var(--text-muted)" }}>
            ⭐ {avgRating} · {reviewCount} reviews
          </div>

          {/* Seller stats (US-23, US-44) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            {[
              ["Trust score",   seller.trustScore || 0],
              ["Listings",      listings?.length || 0],
              ["Sold items",    soldListings?.length || 0],
              ["Reviews",       reviewCount || reviews?.length || 0],
            ].map(([label, val]) => (
              <div key={label} style={{ background: "var(--bg)", borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
                <p style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginBottom: 3, fontWeight: 600 }}>{label}</p>
                <p style={{ fontWeight: 800, fontSize: "1.12rem", color: "var(--green)", lineHeight: 1.1 }}>{val}</p>
              </div>
            ))}
          </div>

          {user?._id !== id && (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <button className="btn btn-outline" style={{ flex: 1, fontSize: "0.82rem" }} onClick={handleFollow}>
                  {isFollowing ? "✓ Following" : "+ Follow"}
                </button>
                <button className="btn btn-ghost" style={{ flex: 1, fontSize: "0.82rem" }} onClick={handleBlock}>Block</button>
              </div>
              <button className="btn btn-primary btn-full" onClick={handleMessage}>Message seller</button>
            </>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div>
        <h2 style={{ marginBottom: 16 }}>Active listings ({listings?.length || 0})</h2>
        {listings?.length ? (
          <div className="listing-grid" style={{ marginBottom: 40 }}>
            {listings.map((l) => <ListingCard key={l._id} listing={l} />)}
          </div>
        ) : (
          <p className="text-muted" style={{ marginBottom: 40 }}>No active listings.</p>
        )}

        {/* Sold items — lets buyers see this seller's track record */}
        <h2 style={{ marginBottom: 16 }}>Sold items ({soldListings?.length || 0})</h2>
        {soldListings?.length ? (
          <div className="listing-grid" style={{ marginBottom: 40 }}>
            {soldListings.map((l) => <ListingCard key={l._id} listing={l} />)}
          </div>
        ) : (
          <p className="text-muted" style={{ marginBottom: 40 }}>No sold items yet.</p>
        )}

        {/* Reviews (US-19) */}
        <h2 style={{ marginBottom: 16 }}>Reviews</h2>
        {reviews?.length ? reviews.map((r) => (
          <div key={r._id} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 }}>
                  {r.reviewer?.fullName?.slice(0, 2).toUpperCase()}
                </div>
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{r.reviewer?.fullName}</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: "#F5A623" }}>{"★".repeat(r.rating)}</span>
                {r.verifiedPurchase && <span className="badge badge-verified">Verified purchase</span>}
              </div>
            </div>
            {r.body && <p style={{ fontSize: "0.86rem", color: "var(--text-muted)" }}>{r.body}</p>}
            {r.styleRating && <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>Style rating: {"★".repeat(r.styleRating)}</p>}
          </div>
        )) : <p className="text-muted">No reviews yet.</p>}
      </div>
    </div>
  );
}