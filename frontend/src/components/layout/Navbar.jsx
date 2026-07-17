// Save this file to: frontend/src/components/layout/Navbar.jsx

import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { messagesAPI } from "../../api/index";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const location         = useLocation();
  const [unread, setUnread]     = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  // The badge shows unseen CHAT MESSAGES only (not every notification type),
  // so it matches what the "Messages" button actually links to. It's driven
  // by messagesAPI.getUnreadCount, which sums each conversation's
  // unreadBuyer/unreadSeller counters. Those counters are reset to 0 on the
  // backend the moment the user opens that conversation (see
  // messageController.getMessages), so as soon as the user has actually
  // seen the message the count drops on its own — it won't keep showing
  // "3" forever like a message the user already read.
  useEffect(() => {
    if (!user) { setUnread(0); return; }

    const fetchUnread = () => {
      messagesAPI.getUnreadCount()
        .then(({ data }) => setUnread(data.count))
        .catch(() => {});
    };

    fetchUnread(); // check right away (covers navigating away from /messages after reading)
    const interval = setInterval(fetchUnread, 8000); // keep it fresh for new incoming messages
    return () => clearInterval(interval);
  }, [user, location.pathname]);

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
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "#1A6B4A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 13 }}>TS</span>
          </div>
          <span style={{
            fontWeight: 700,
            fontSize: "1.05rem",
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
              {/* Messages button */}
              <button
                onClick={() => navigate("/messages")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#E8F5EE",
                  border: "1px solid #C5E5D5",
                  color: "#1A6B4A",
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <span>✉</span>
                Messages
                {unread > 0 && (
                  <span style={{
                    background: "#1A6B4A",
                    color: "#fff",
                    borderRadius: 10,
                    padding: "1px 6px",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                  }}>{unread}</span>
                )}
              </button>

              {/* Avatar + dropdown */}
              <div style={{ position: "relative" }}>
                <div
                  onClick={() => setMenuOpen(o => !o)}
                  style={{
                    width: 36,
                    height: 36,
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