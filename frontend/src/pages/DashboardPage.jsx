import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usersAPI, listingsAPI, ordersAPI } from "../api/index";
import { StatusBadge } from "../components/common/Badge";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const TABS = ["dashboard", "profile", "listings", "orders", "saved", "notifications", "reviews"];

// Maps each tab to the route the navbar/links actually use, so visiting
// /orders, /profile, /saved, /notifications, or /reviews directly opens
// the right tab instead of always landing on "Dashboard" (which is what
// was happening before — every one of those links rendered the same
// component with the tab hardcoded to "dashboard").
const PATH_TO_TAB = {
  "/dashboard": "dashboard",
  "/profile": "profile",
  "/orders": "orders",
  "/saved": "saved",
  "/notifications": "notifications",
  "/reviews": "reviews",
};
const TAB_TO_PATH = {
  dashboard: "/dashboard", profile: "/profile", orders: "/orders",
  saved: "/saved", notifications: "/notifications", reviews: "/reviews",
};

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const [tab, setTab] = useState(PATH_TO_TAB[location.pathname] || "dashboard");
  const [orderView, setOrderView] = useState("buying"); // "buying" | "selling"

  // Keep the tab in sync if the URL changes from elsewhere (navbar links,
  // browser back/forward, etc.)
  useEffect(() => {
    if (PATH_TO_TAB[location.pathname]) setTab(PATH_TO_TAB[location.pathname]);
  }, [location.pathname]);

  const selectTab = (t) => {
    setTab(t);
    if (TAB_TO_PATH[t]) navigate(TAB_TO_PATH[t]);
  };

  const { data: dash } = useQuery({
    queryKey: ["dashboard"],
    queryFn:  () => usersAPI.getDashboard().then((r) => r.data),
    enabled: tab === "dashboard" || tab === "listings",
  });
  const { data: buyingOrders } = useQuery({
    queryKey: ["my-orders"],
    queryFn:  () => ordersAPI.getMyOrders().then((r) => r.data.orders),
    enabled: tab === "orders" && orderView === "buying",
  });
  const { data: sellingOrders } = useQuery({
    queryKey: ["selling-orders"],
    queryFn:  () => ordersAPI.getSellingOrders().then((r) => r.data.orders),
    enabled: tab === "orders" && orderView === "selling",
  });
  const ordersData = orderView === "buying" ? buyingOrders : sellingOrders;
  const { data: savedData } = useQuery({
    queryKey: ["saved"],
    queryFn:  () => usersAPI.getSaved().then((r) => r.data.savedItems),
    enabled: tab === "saved",
  });
  const { data: notifData } = useQuery({
    queryKey: ["notifications"],
    queryFn:  () => usersAPI.getNotifications().then((r) => r.data.notifications),
    enabled: tab === "notifications",
  });

  const handleDeleteListing = async (id) => {
    if (!window.confirm("Delete this listing?")) return;
    try {
      await listingsAPI.delete(id);
      toast.success("Listing deleted.");
      qc.invalidateQueries(["dashboard"]);
      qc.invalidateQueries(["recent-listings"]);
    } catch { toast.error("Failed."); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await listingsAPI.setStatus(id, status);
      toast.success(`Listing marked as ${status}.`);
      qc.invalidateQueries(["dashboard"]);
    } catch { toast.error("Failed."); }
  };

  const handleMarkAllRead = async () => {
    await usersAPI.markAllRead();
    qc.invalidateQueries(["notifications"]);
  };

  const score     = dash?.accountabilityScore ?? 100;
  const scoreColor = score >= 80 ? "var(--green)" : score >= 60 ? "var(--warning)" : "var(--danger)";

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 1.5rem", display: "flex", gap: 28, alignItems: "flex-start" }}>

      {/* ── Sidebar nav ───────────────────────────────────────────────── */}
      <aside style={{ width: 200, flexShrink: 0, position: "sticky", top: 76 }}>
        <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-light)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, padding: "0 12px" }}>My account</p>
        {TABS.map((t) => (
          <button key={t} onClick={() => selectTab(t)}
            style={{ display: "flex", width: "100%", textAlign: "left", padding: "9px 12px", background: tab === t ? "var(--green-light)" : "none", border: "none", borderRadius: 8, cursor: "pointer", color: tab === t ? "var(--green)" : "var(--text-muted)", fontWeight: tab === t ? 700 : 500, fontSize: "0.88rem", marginBottom: 2, textTransform: "capitalize" }}>
            {t === "dashboard" ? "Seller dashboard" : t === "listings" ? "My listings" : t}
          </button>
        ))}
        <button onClick={() => { logout(); navigate("/"); }}
          style={{ display: "flex", width: "100%", textAlign: "left", padding: "9px 12px", background: "none", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", color: "var(--danger)", fontWeight: 600, fontSize: "0.88rem", marginTop: 12 }}>
          Log out
        </button>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1 }}>

        {/* DASHBOARD TAB */}
        {tab === "dashboard" && (
          <>
            <h1 style={{ marginBottom: 20 }}>Dashboard</h1>

            {/* Stats cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
              {[
                { label: "Active listings", value: dash?.stats.activeListings ?? 0,    icon: "📦" },
                { label: "Pending orders",  value: dash?.stats.pendingOrders  ?? 0,    icon: "🕐" },
                { label: "Total items sold",value: dash?.stats.totalSold      ?? 0,    icon: "✅" },
              ].map((s) => (
                <div key={s.label} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px" }}>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 6 }}>{s.icon} {s.label}</p>
                  <p style={{ fontSize: "2rem", fontWeight: 800 }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Accountability score (US-44) */}
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <h3 style={{ marginBottom: 14 }}>Seller accountability score</h3>
              <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", border: `4px solid ${scoreColor}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontWeight: 800, fontSize: "1.4rem", color: scoreColor }}>{score}</span>
                </div>
                <div>
                  <p style={{ fontWeight: 600, color: scoreColor }}>{score >= 80 ? "Good standing" : score >= 60 ? "Needs attention" : "At risk"}</p>
                  <p className="text-muted text-sm" style={{ marginTop: 4 }}>Respond faster to buyers and complete orders on time to improve your score.</p>
                </div>
              </div>
              {/* Profile completeness (US-09) */}
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <p style={{ fontSize: "0.82rem", fontWeight: 600 }}>Profile completeness</p>
                  <p style={{ fontSize: "0.82rem", color: "var(--green)", fontWeight: 700 }}>{dash?.profileCompleteness ?? 0}%</p>
                </div>
                <div style={{ background: "var(--bg)", borderRadius: 6, height: 8 }}>
                  <div style={{ width: `${dash?.profileCompleteness ?? 0}%`, background: "var(--green)", height: "100%", borderRadius: 6, transition: "width 0.4s" }} />
                </div>
              </div>
            </div>

            {/* Pending orders */}
            <h3 style={{ marginBottom: 12 }}>Pending orders</h3>
            {dash?.pendingOrders?.length ? dash.pendingOrders.map((o) => (
              <div key={o._id} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: 14, display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>#{o.orderNumber} – {o.listingSnapshot?.title}</p>
                  <p className="text-muted text-sm">Rs. {o.totalAmount?.toLocaleString()} · {o.deliveryMethod}</p>
                </div>
                <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => navigate(`/orders/${o._id}`)}>View order</button>
              </div>
            )) : <p className="text-muted text-sm">No pending orders.</p>}
          </>
        )}

        {/* LISTINGS TAB */}
        {tab === "listings" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h1>My listings</h1>
              <button className="btn btn-primary btn-sm" onClick={() => navigate("/sell")}>+ New listing</button>
            </div>
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
                <thead>
                  <tr style={{ background: "var(--bg)" }}>
                    {["Item", "Price", "Status", "Actions"].map((h) => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)", fontSize: "0.75rem", letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dash?.listings?.length ? dash.listings.map((l) => (
                    <tr key={l._id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 600 }}>{l.title}</td>
                      <td style={{ padding: "12px 16px" }}>Rs. {l.price?.toLocaleString()}</td>
                      <td style={{ padding: "12px 16px" }}><StatusBadge status={l.status} /></td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/sell/edit/${l._id}`)}>Edit</button>
                          {l.status === "active" && <button className="btn btn-ghost btn-sm" onClick={() => handleStatusChange(l._id, "reserved")}>Reserve</button>}
                          {l.status === "active" && <button className="btn btn-ghost btn-sm" onClick={() => handleStatusChange(l._id, "inactive")}>Pause</button>}
                          {l.status === "inactive" && <button className="btn btn-ghost btn-sm" onClick={() => handleStatusChange(l._id, "active")}>Reactivate</button>}
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteListing(l._id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>No listings yet. <button className="btn btn-ghost btn-sm" onClick={() => navigate("/sell")}>List an item</button></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ORDERS TAB */}
        {tab === "orders" && (
          <>
            <h1 style={{ marginBottom: 14 }}>Orders</h1>
            {/* Buying vs Selling — these are two different things: orders
                you placed as a buyer, vs orders other people placed on
                your listings that you need to fulfill as a seller. */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <button
                className={orderView === "buying" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
                onClick={() => setOrderView("buying")}>
                Buying
              </button>
              <button
                className={orderView === "selling" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
                onClick={() => setOrderView("selling")}>
                Selling
              </button>
            </div>
            {ordersData?.length ? ordersData.map((o) => (
              <div key={o._id} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: 16, marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <p style={{ fontWeight: 700 }}>#{o.orderNumber}</p>
                    <p className="text-muted text-sm">{new Date(o.createdAt).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 52, height: 52, borderRadius: 8, background: "var(--bg)", overflow: "hidden", flexShrink: 0 }}>
                    {o.listingSnapshot?.imageUrls?.[0]
                      ? <img src={o.listingSnapshot.imageUrls[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ display: "block", paddingTop: 14, textAlign: "center", fontSize: 22 }}>📦</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>{o.listingSnapshot?.title}</p>
                    <p className="text-muted text-sm">
                      {orderView === "buying"
                        ? `Seller: ${o.seller?.fullName || "—"}`
                        : `Buyer: ${o.buyer?.fullName || "—"}`} · Rs. {o.totalAmount?.toLocaleString()}
                    </p>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/orders/${o._id}`)}>View order</button>
                </div>
              </div>
            )) : <p className="text-muted">{orderView === "buying" ? "You haven't bought anything yet." : "No one has ordered your listings yet."}</p>}
          </>
        )}

        {/* SAVED TAB */}
        {tab === "saved" && (
          <>
            <h1 style={{ marginBottom: 20 }}>Saved items</h1>
            {savedData?.length ? (
              <div className="listing-grid">
                {savedData.map((s) => s.listing && (
                  <div key={s._id} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", cursor: "pointer" }} onClick={() => navigate(`/listings/${s.listing._id}`)}>
                    <div style={{ background: "var(--bg)", height: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {s.listing.imageUrls?.[0]
                        ? <img src={s.listing.imageUrls[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <span style={{ fontSize: 36, opacity: 0.3 }}>📦</span>}
                    </div>
                    <div style={{ padding: 12 }}>
                      <p style={{ fontWeight: 600, fontSize: "0.86rem" }}>{s.listing.title}</p>
                      <p style={{ fontWeight: 700, color: "var(--green)" }}>Rs. {s.listing.price?.toLocaleString()}</p>
                      <p style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>Collection: {s.collectionName}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-muted">No saved items.</p>}
          </>
        )}

        {/* NOTIFICATIONS TAB */}
        {tab === "notifications" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h1>Notifications</h1>
              <button className="btn btn-ghost btn-sm" onClick={handleMarkAllRead}>Mark all read</button>
            </div>
            {notifData?.length ? notifData.map((n) => (
              <div key={n._id} style={{ display: "flex", gap: 12, padding: "14px 0", borderBottom: "1px solid var(--border)", alignItems: "flex-start", opacity: n.isRead ? 0.6 : 1 }}>
                <span style={{ fontSize: 20 }}>
                  {n.type === "new_message" ? "💬" : n.type === "order_update" ? "📦" : n.type === "price_alert" ? "🔔" : n.type === "new_offer" ? "💰" : "🔔"}
                </span>
                <div>
                  <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>{n.title}</p>
                  <p className="text-muted text-sm">{n.body}</p>
                  <p style={{ fontSize: "0.74rem", color: "var(--text-light)", marginTop: 2 }}>{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.isRead && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", flexShrink: 0, marginTop: 6 }} />}
              </div>
            )) : <p className="text-muted">No notifications yet.</p>}
          </>
        )}

        {/* PROFILE TAB */}
        {tab === "profile" && <ProfileTab user={user} />}

        {/* REVIEWS TAB */}
        {tab === "reviews" && <ReviewsTab userId={user?._id} />}
      </div>
    </div>
  );
}

// Profile sub-component
function ProfileTab({ user }) {
  const { updateUser } = useAuth();
  const qc = useQueryClient();
  // Phone is stored as "+977XXXXXXXXXX"; strip the prefix for editing
  // and only the 10 local digits live in form state.
  const [form, setForm] = useState({
    fullName: user?.fullName || "",
    phone: (user?.phone || "").replace("+977", ""),
    city: user?.city || "",
    bio: user?.bio || "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingQR, setUploadingQR] = useState(null); // "esewa" | "khalti" | null
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleQRUpload = async (method, file) => {
    if (!file) return;
    setUploadingQR(method);
    try {
      const fd = new FormData();
      fd.append("qr", file);
      fd.append("method", method);
      const { data } = await usersAPI.uploadPaymentQR(fd);
      updateUser(data.user);
      toast.success(`${method === "esewa" ? "eSewa" : "Khalti"} QR code saved.`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed.");
    } finally {
      setUploadingQR(null);
    }
  };

  const handleSave = async () => {
    if (form.phone && !/^9[678]\d{8}$/.test(form.phone)) {
      toast.error("Enter a valid Nepali mobile number (starts with 98, 97, or 96, 10 digits total).");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, phone: form.phone ? `+977${form.phone}` : "" };
      const { data } = await usersAPI.updateProfile(payload);
      updateUser(data.user);
      toast.success("Profile updated!");
    } catch { toast.error("Failed."); }
    finally { setSaving(false); }
  };

  return (
    <>
      <h1 style={{ marginBottom: 20 }}>Profile</h1>
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: 24, maxWidth: 500 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 22 }}>{user?.fullName?.slice(0, 2).toUpperCase()}</span>
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: "1.1rem" }}>{user?.fullName}</p>
            <p className="text-muted text-sm">{user?.email}</p>
          </div>
        </div>
        {[["Full name", "fullName", "text"], ["City", "city", "text"], ["Bio", "bio", "text"]].map(([label, key, type]) => (
          <div className="form-group" key={key}>
            <label>{label}</label>
            <input type={type} value={form[key]} onChange={(e) => set(key, e.target.value)} />
          </div>
        ))}

        {/* Phone — same fixed +977 + 10-digit format as registration */}
        <div className="form-group">
          <label>Phone</label>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{
              padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--border)",
              background: "var(--bg)", color: "var(--text-muted)", fontWeight: 600,
            }}>+977</span>
            <input
              type="tel"
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="98XXXXXXXX"
              style={{ flex: 1 }}
            />
          </div>
        </div>
        <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
      </div>

      {/* Payment QR codes — buyers see these on the payment page when
          they pick eSewa/Khalti, so they have something real to scan
          and pay instead of the app just declaring payment received. */}
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: 24, maxWidth: 500, marginTop: 20 }}>
        <h3 style={{ marginBottom: 4 }}>Payment QR codes</h3>
        <p className="text-muted text-sm" style={{ marginBottom: 18 }}>
          Upload your eSewa and Khalti QR codes so buyers can scan and pay you directly.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            { method: "esewa",  label: "eSewa QR",  icon: "💚" },
            { method: "khalti", label: "Khalti QR", icon: "💜" },
          ].map(({ method, label, icon }) => (
            <div key={method} style={{ border: "1.5px dashed var(--border)", borderRadius: 10, padding: 14, textAlign: "center" }}>
              <p style={{ fontWeight: 600, fontSize: "0.86rem", marginBottom: 10 }}>{icon} {label}</p>
              {user?.paymentQR?.[method] ? (
                <img
                  src={user.paymentQR[method]}
                  alt={`${label} preview`}
                  style={{ width: 110, height: 110, objectFit: "contain", borderRadius: 8, border: "1px solid var(--border)", marginBottom: 10 }}
                />
              ) : (
                <div style={{ width: 110, height: 110, borderRadius: 8, background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", color: "var(--text-light)", fontSize: "0.72rem" }}>
                  No QR yet
                </div>
              )}
              <label className="btn btn-ghost btn-sm" style={{ display: "inline-block", cursor: "pointer" }}>
                {uploadingQR === method ? "Uploading…" : user?.paymentQR?.[method] ? "Replace" : "Upload"}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  disabled={uploadingQR === method}
                  onChange={(e) => handleQRUpload(method, e.target.files?.[0])}
                />
              </label>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// Reviews sub-component
function ReviewsTab({ userId }) {
  const { data } = useQuery({
    queryKey: ["my-reviews", userId],
    queryFn:  () => import("../api/index").then(({ reviewsAPI }) => reviewsAPI.getSellerReviews(userId).then((r) => r.data)),
  });
  return (
    <>
      <h1 style={{ marginBottom: 20 }}>Reviews</h1>
      {data?.reviews?.length ? data.reviews.map((r) => (
        <div key={r._id} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontWeight: 600 }}>{r.reviewer?.fullName}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <span style={{ color: "#F5A623" }}>{"★".repeat(r.rating)}</span>
              {r.verifiedPurchase && <span className="badge badge-verified">Verified purchase</span>}
            </div>
          </div>
          {r.body && <p className="text-muted text-sm">{r.body}</p>}
        </div>
      )) : <p className="text-muted">No reviews yet.</p>}
    </>
  );
}