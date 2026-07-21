// Save this file to: frontend/src/components/layout/Navbar.jsx

import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { messagesAPI, usersAPI } from "../../api/index";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount: cartCount } = useCart();
  const navigate         = useNavigate();
  const location         = useLocation();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifications, setNotifications]   = useState([]);
  const [notifOpen, setNotifOpen]           = useState(false);
  const [menuOpen, setMenuOpen]             = useState(false);

  const unreadNotifications = notifications.filter((n) => !n.isRead).length;

  // The badge shows unseen CHAT MESSAGES only (not every notification type),
  // so it matches what the "Messages" button actually links to. It's driven
  // by messagesAPI.getUnreadCount, which sums each conversation's
  // unreadBuyer/unreadSeller counters. Those counters are reset to 0 on the
  // backend the moment the user opens that conversation (see
  // messageController.getMessages), so as soon as the user has actually
  // seen the message the count drops on its own — it won't keep showing
  // "3" forever like a message the user already read.
  useEffect(() => {
    if (!user) { setUnreadMessages(0); return; }

    const fetchUnread = () => {
      messagesAPI.getUnreadCount()
        .then(({ data }) => setUnreadMessages(data.count))
        .catch(() => {});
    };

    fetchUnread(); // check right away (covers navigating away from /messages after reading)
    const interval = setInterval(fetchUnread, 8000); // keep it fresh for new incoming messages
    return () => clearInterval(interval);
  }, [user, location.pathname]);

  useEffect(() => {
    if (!user) { setNotifications([]); return; }

    const fetchNotifications = () => {
      usersAPI.getNotifications()
        .then(({ data }) => setNotifications(data.notifications || []))
        .catch(() => {});
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [user, location.pathname]);

  const getNotificationTarget = (n) => {
    if (n?.meta?.conversationId) return "/messages";
    if (n?.meta?.orderId) return `/orders/${n.meta.orderId}`;
    if (n?.meta?.listingId) return `/listings/${n.meta.listingId}`;
    return "/notifications";
  };

  const handleNotificationClick = async (notification) => {
    if (!notification) return;

    try {
      if (!notification.isRead) {
        await usersAPI.markRead(notification._id);
      }
    } catch {
      // Even if the request fails, still remove locally to match click behavior.
    }

    setNotifications((prev) => prev.filter((n) => n._id !== notification._id));
    setNotifOpen(false);
    navigate(getNotificationTarget(notification));
  };

  const navLinkStyle = {
    padding: "6px 14px",
    borderRadius: 8,
    color: "#6B6B67",
    fontWeight: 500,
    fontSize: "0.9rem",
    textDecoration: "none",
    display: "inline-block",
  };

  return (
    <nav style={{
      background: "#ffffff",
      borderBottom: "1px solid #E2E0D8",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "0 1.5rem",
        height: 58,
        display: "flex",
        alignItems: "center",
        gap: 24,
      }}>

        {/* ── Logo ──────────────────────────────────────────── */}
        <Link to="/" style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          textDecoration: "none",
          marginRight: "auto",
          flexShrink: 0,
        }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: "#1A6B4A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>TS</span>
          </div>
          <span style={{
            fontWeight: 700,
            fontSize: "1.12rem",
            color: "#1C1C1A",
            letterSpacing: "-0.3px",
          }}>ThriftSathi</span>
        </Link>

        {/* ── Centre nav links ──────────────────────────────── */}
        <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Link to="/browse" style={navLinkStyle}>Browse</Link>
          {user && <Link to="/sell" style={navLinkStyle}>Sell</Link>}
        </div>

        {/* ── Right side ────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {user ? (
            <>
              {/* Cart icon */}
              <button
                onClick={() => navigate("/cart")}
                aria-label="Cart"
                style={{
                  position: "relative",
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  border: "1px solid #D8D5CC",
                  background: "#fff",
                  color: "#5A5954",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.6h7.5a2 2 0 0 0 2-1.6L21 8H6"
                    stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
                  />
                  <circle cx="9.5" cy="20.5" r="1.4" fill="currentColor" />
                  <circle cx="17.5" cy="20.5" r="1.4" fill="currentColor" />
                </svg>
                {cartCount > 0 && (
                  <span style={{
                    position: "absolute",
                    top: -5,
                    right: -5,
                    background: "#1A6B4A",
                    color: "#fff",
                    borderRadius: 10,
                    minWidth: 16,
                    height: 16,
                    padding: "0 4px",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                  }}>{cartCount > 99 ? "99+" : cartCount}</span>
                )}
              </button>

              {/* Messages button */}
              <button
                onClick={() => navigate("/messages")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#E8F5EE",
                  border: "1px solid #C5E5D5",
                  color: "#1A6B4A",
                  padding: "8px 16px",
                  borderRadius: 20,
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ fontSize: 15, lineHeight: 1 }}>✉</span>
                Messages
                {unreadMessages > 0 && (
                  <span style={{
                    background: "#1A6B4A",
                    color: "#fff",
                    borderRadius: 10,
                    padding: "1px 6px",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                  }}>{unreadMessages}</span>
                )}
              </button>

              {/* Notifications bell */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => {
                    setNotifOpen((v) => !v);
                    setMenuOpen(false);
                  }}
                  aria-label="Notifications"
                  style={{
                    position: "relative",
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    border: "1px solid #D8D5CC",
                    background: "#fff",
                    color: "#5A5954",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 3.2a2 2 0 0 1 2 2v.5a6.8 6.8 0 0 1 4.2 6.3v2.2c0 1.7.5 3.4 1.5 4.8H4.3a8.3 8.3 0 0 0 1.5-4.8V12A6.8 6.8 0 0 1 10 5.7v-.5a2 2 0 0 1 2-2Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9 9.6a3.7 3.7 0 0 1 3-1.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                    <path
                      d="M10.2 19a1.9 1.9 0 0 0 3.6 0"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                  {unreadNotifications > 0 && (
                    <span style={{
                      position: "absolute",
                      top: -5,
                      right: -5,
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      background: "#C0392B",
                      color: "#fff",
                      fontSize: "0.64rem",
                      lineHeight: "18px",
                      textAlign: "center",
                      padding: "0 4px",
                      fontWeight: 700,
                      border: "2px solid #fff",
                    }}>
                      {unreadNotifications > 99 ? "99+" : unreadNotifications}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <>
                    <div
                      onClick={() => setNotifOpen(false)}
                      style={{ position: "fixed", inset: 0, zIndex: 149 }}
                    />
                    <div style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      width: 320,
                      maxHeight: 380,
                      overflowY: "auto",
                      background: "#fff",
                      border: "1px solid #E2E0D8",
                      borderRadius: 12,
                      boxShadow: "0 10px 28px rgba(0,0,0,0.14)",
                      zIndex: 150,
                    }}>
                      <div style={{
                        padding: "10px 12px",
                        borderBottom: "1px solid #E2E0D8",
                        fontWeight: 700,
                        fontSize: "0.86rem",
                        color: "#1C1C1A",
                      }}>
                        Notifications
                      </div>

                      {notifications.length ? notifications.slice(0, 8).map((n) => (
                        <button
                          key={n._id}
                          onClick={() => handleNotificationClick(n)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            border: "none",
                            background: "#fff",
                            padding: "11px 12px",
                            borderBottom: "1px solid #F0EEE7",
                            cursor: "pointer",
                            opacity: n.isRead ? 0.7 : 1,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <span style={{ fontSize: 16, lineHeight: 1.1 }}>
                              {n.type === "new_message" ? "💬" : n.type === "order_update" ? "📦" : n.type === "new_offer" ? "💰" : "🔔"}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1C1C1A" }}>{n.title}</p>
                              {n.body && (
                                <p style={{
                                  fontSize: "0.76rem",
                                  color: "#6B6B67",
                                  marginTop: 2,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}>{n.body}</p>
                              )}
                            </div>
                            {!n.isRead && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1A6B4A", marginTop: 5, flexShrink: 0 }} />}
                          </div>
                        </button>
                      )) : (
                        <p style={{ padding: "14px 12px", fontSize: "0.8rem", color: "#6B6B67" }}>
                          No notifications.
                        </p>
                      )}

                      <button
                        onClick={() => {
                          setNotifOpen(false);
                          navigate("/notifications");
                        }}
                        style={{
                          width: "100%",
                          border: "none",
                          borderTop: "1px solid #E2E0D8",
                          background: "#FAFAF8",
                          padding: "10px 12px",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          color: "#1A6B4A",
                          cursor: "pointer",
                        }}
                      >
                        View all notifications
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Avatar + dropdown */}
              <div style={{ position: "relative" }}>
                <div
                  onClick={() => {
                    setMenuOpen((o) => !o);
                    setNotifOpen(false);
                  }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "#1A6B4A",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  {user.avatarUrl
                    ? <img src={user.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.8rem" }}>
                        {user.fullName ? user.fullName.slice(0, 2).toUpperCase() : "TS"}
                      </span>
                  }
                </div>

                {menuOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      onClick={() => setMenuOpen(false)}
                      style={{ position: "fixed", inset: 0, zIndex: 149 }}
                    />
                    {/* Dropdown panel */}
                    <div style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      background: "#fff",
                      border: "1px solid #E2E0D8",
                      borderRadius: 12,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      minWidth: 200,
                      zIndex: 150,
                      overflow: "hidden",
                    }}>
                      {/* User info header */}
                      <div style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid #E2E0D8",
                      }}>
                        <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1C1C1A" }}>{user.fullName}</p>
                        <p style={{ fontSize: "0.76rem", color: "#6B6B67", marginTop: 2 }}>{user.email}</p>
                      </div>

                      {/* Menu links */}
                      {[
                        { label: "Dashboard",     path: "/dashboard" },
                        { label: "Cart",          path: "/cart" },
                        { label: "My Orders",     path: "/orders" },
                        { label: "Saved items",   path: "/saved" },
                        { label: "Notifications", path: "/notifications" },
                        { label: "Profile",       path: "/profile" },
                      ].map(item => (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setMenuOpen(false)}
                          style={{
                            display: "block",
                            padding: "10px 16px",
                            color: "#1C1C1A",
                            fontSize: "0.88rem",
                            fontWeight: 500,
                            textDecoration: "none",
                          }}
                        >
                          {item.label}
                        </Link>
                      ))}

                      {/* Logout */}
                      <button
                        onClick={() => { logout(); setMenuOpen(false); navigate("/"); }}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "10px 16px",
                          background: "none",
                          border: "none",
                          borderTop: "1px solid #E2E0D8",
                          color: "#C0392B",
                          fontWeight: 600,
                          fontSize: "0.88rem",
                          cursor: "pointer",
                        }}
                      >Log out</button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login">
                <button style={{
                  background: "none",
                  border: "1px solid #E2E0D8",
                  color: "#1C1C1A",
                  padding: "7px 18px",
                  borderRadius: 20,
                  fontWeight: 600,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                }}>Log in</button>
              </Link>
              <Link to="/register">
                <button style={{
                  background: "#1A6B4A",
                  border: "none",
                  color: "#fff",
                  padding: "7px 18px",
                  borderRadius: 20,
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                }}>Register</button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}