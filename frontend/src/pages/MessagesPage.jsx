import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { messagesAPI } from "../api/index";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

let socket = null;

export default function MessagesPage() {
  const { conversationId } = useParams(); // optional – from URL
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const bottomRef = useRef(null);

  const [activeId, setActiveId]     = useState(conversationId || null);
  const [messages, setMessages]     = useState([]);
  const [text, setText]             = useState("");
  const [typing, setTyping]         = useState(false);
  const [typingUser, setTypingUser] = useState("");
  const typingTimer = useRef(null);

  // Fetch conversations
  const { data: convoData } = useQuery({
    queryKey: ["conversations"],
    queryFn:  () => messagesAPI.getConversations().then((r) => r.data.conversations),
    refetchInterval: 10000,
  });
  const conversations = convoData || [];
  const activeConvo   = conversations.find((c) => c._id === activeId);

  // Fetch messages for active conversation
  useEffect(() => {
    if (!activeId) return;
    messagesAPI.getMessages(activeId)
      .then(({ data }) => setMessages(data.messages))
      .catch(() => {});
  }, [activeId]);

  // Setup Socket.io
  useEffect(() => {
    const token = localStorage.getItem("ts_token");
    if (!token) return;

    // IMPORTANT: connect directly to the backend, not the Vite dev server.
    // window.location.origin (http://localhost:5173) has no Socket.io
    // endpoint — only /api and /uploads are proxied to the backend, so a
    // real-time connection there silently fails and no message ever
    // arrives, even though it looks "sent".
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
    socket = io(SOCKET_URL, { auth: { token }, transports: ["websocket"] });

    socket.on("connect_error", (err) => {
      toast.error("Chat connection failed. Refresh and try again.");
      console.error("Socket connect_error:", err.message);
    });

    socket.on("new_message", (msg) => {
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      qc.invalidateQueries(["conversations"]);
    });

    socket.on("user_typing",      ({ name }) => setTypingUser(name));
    socket.on("user_stop_typing", ()          => setTypingUser(""));

    return () => { socket?.disconnect(); socket = null; };
  }, []);

  // Join conversation room when active changes
  useEffect(() => {
    if (!activeId || !socket) return;
    socket.emit("join_conversation", activeId);
  }, [activeId]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim() || !activeId) return;
    socket?.emit("send_message", { conversationId: activeId, body: text });
    setText("");
    socket?.emit("stop_typing", { conversationId: activeId });
  };

  const handleTyping = (val) => {
    setText(val);
    socket?.emit("typing", { conversationId: activeId });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket?.emit("stop_typing", { conversationId: activeId }), 1500);
  };

  const sendQuickInquiry = () => {
    if (!activeId || !activeConvo) return;
    const card = {
      body: "Quick Inquiry",
      messageType: "quick_inquiry",
      structuredData: {
        conditionQuestion: `Is the condition confirmed as "${activeConvo.listing?.condition}"?`,
        location: activeConvo.listing?.city,
      },
    };
    socket?.emit("send_message", { conversationId: activeId, ...card });
  };

  const otherPerson = (convo) => {
    if (!user) return {};
    return user._id === convo.buyer?._id ? convo.seller : convo.buyer;
  };

  return (
    <div style={s.page}>

      {/* Sidebar: conversation list */}
      <div style={s.sidebar}>
        <div style={s.sidebarTop}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Messages</h2>
          <input placeholder="Search conversations…" style={{ fontSize: "0.82rem", padding: "7px 10px", marginTop: 8 }} />
        </div>
        <div style={s.sidebarList}>
          {conversations.length === 0 && (
            <p style={{ padding: 16, fontSize: "0.84rem", color: "var(--text-muted)" }}>No conversations yet.</p>
          )}
          {conversations.map((c) => {
            const other = otherPerson(c);
            const unread = user?._id === String(c.buyer?._id) ? c.unreadBuyer : c.unreadSeller;
            return (
              <div key={c._id} onClick={() => setActiveId(c._id)} style={{ ...s.convoItem, background: activeId === c._id ? "var(--green-light)" : "transparent" }}>
                <div style={s.convoAvatar}>
                  {other.avatarUrl
                    ? <img src={other.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                    : <span style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--green)" }}>{other.fullName?.slice(0, 2).toUpperCase()}</span>}
                </div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <p style={{ fontWeight: 600, fontSize: "0.86rem" }}>{other.fullName}</p>
                  <p style={{ fontSize: "0.76rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.listing?.title}</p>
                </div>
                {unread > 0 && <span style={s.unreadBadge}>{unread}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat panel */}
      {activeConvo ? (
        <div style={s.chat}>
          {/* Header */}
          <div style={s.chatHeader}>
            <div style={s.convoAvatar}>
              <span style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--green)" }}>
                {otherPerson(activeConvo).fullName?.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>{otherPerson(activeConvo).fullName}</p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {activeConvo.listing?.title} – Rs. {activeConvo.listing?.price?.toLocaleString()}
              </p>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/listings/${activeConvo.listing?._id}`)}>View listing</button>
              <button className="btn btn-ghost btn-sm" onClick={sendQuickInquiry}>Quick inquiry</button>
            </div>
          </div>

          {/* Messages */}
          <div style={s.messages}>
            {messages.map((m) => {
              const isMe = String(m.sender?._id || m.sender) === String(user?._id);
              if (m.messageType === "quick_inquiry") {
                return (
                  <div key={m._id} style={s.inquiryCard}>
                    <p style={{ fontWeight: 700, color: "var(--green)", marginBottom: 6 }}>Quick Inquiry</p>
                    <p style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>{m.structuredData?.conditionQuestion}</p>
                    <p style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}>Location: {m.structuredData?.location}</p>
                  </div>
                );
              }
              return (
                <div key={m._id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 8 }}>
                  <div style={{ ...s.bubble, background: isMe ? "var(--green)" : "var(--bg)", color: isMe ? "#fff" : "var(--text)" }}>
                    {m.body}
                  </div>
                </div>
              );
            })}
            {typingUser && <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", padding: "0 4px" }}>{typingUser} is typing…</p>}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={s.inputBar}>
            <input
              value={text}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type a message…"
              style={{ flex: 1, border: "1px solid var(--border)" }}
            />
            <button className="btn btn-primary" onClick={handleSend} disabled={!text.trim()}>▷</button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 48 }}>💬</p>
            <p style={{ fontWeight: 600, marginTop: 12 }}>Select a conversation</p>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page:        { display: "flex", height: "calc(100vh - 61px)", background: "#fff", maxWidth: 1100, margin: "0 auto", border: "1px solid var(--border)", borderTop: "none" },
  sidebar:     { width: 260, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" },
  sidebarTop:  { padding: "16px 14px", borderBottom: "1px solid var(--border)" },
  sidebarList: { flex: 1, overflowY: "auto" },
  convoItem:   { display: "flex", gap: 10, alignItems: "center", padding: "12px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)" },
  convoAvatar: { width: 38, height: 38, borderRadius: "50%", background: "var(--green-light)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" },
  unreadBadge: { background: "var(--green)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, borderRadius: 10, padding: "1px 6px" },
  chat:        { flex: 1, display: "flex", flexDirection: "column" },
  chatHeader:  { padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "center" },
  messages:    { flex: 1, overflowY: "auto", padding: "16px 20px" },
  bubble:      { maxWidth: "68%", padding: "9px 14px", borderRadius: 12, fontSize: "0.88rem", lineHeight: 1.5 },
  inquiryCard: { background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", marginBottom: 10, maxWidth: "70%" },
  inputBar:    { padding: "12px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 8 },
};
