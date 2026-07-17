import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

function EyeIcon(props) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOffIcon(props) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.6 21.6 0 0 1 5.06-6.06M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a21.5 21.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

const CITIES = ["Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara", "Chitwan", "Butwal"];

// Shared styles  
const pageWrap = {
  minHeight: "100vh",
  background: "#F2F0EB",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "2rem 1rem",
};

const card = {
  background: "#ffffff",
  borderRadius: 20,
  padding: "40px 40px 36px",
  width: "100%",
  maxWidth: 440,
  boxShadow: "0 2px 24px rgba(0,0,0,0.07)",
};

const logoBox = {
  width: 44,
  height: 44,
  borderRadius: 12,
  background: "#1A6B4A",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const fieldLabel = {
  display: "block",
  fontSize: "0.88rem",
  fontWeight: 600,
  color: "#1C1C1A",
  marginBottom: 6,
};

const fieldInput = {
  display: "block",
  width: "100%",
  border: "1.5px solid #E2E0D8",
  borderRadius: 10,
  padding: "11px 14px",
  fontSize: "0.92rem",
  color: "#1C1C1A",
  background: "#ffffff",
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color 0.15s",
};

const submitBtn = {
  display: "block",
  width: "100%",
  background: "#1A6B4A",
  color: "#ffffff",
  border: "none",
  borderRadius: 12,
  padding: "14px 0",
  fontWeight: 700,
  fontSize: "1rem",
  cursor: "pointer",
  fontFamily: "inherit",
  marginTop: 4,
};

// LOGIN PAGE
export function LoginPage() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const from       = location.state?.from?.pathname || "/";

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [focusField, setFocus]  = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageWrap}>
      <div style={card}>

        {/* Logo row */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          marginBottom: 28,
        }}>
          <div style={logoBox}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>TS</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: "1.15rem", color: "#1C1C1A" }}>
            ThriftSathi
          </span>
        </div>

        {/* Title */}
        <h1 style={{
          fontWeight: 800,
          fontSize: "1.6rem",
          color: "#1C1C1A",
          textAlign: "center",
          marginBottom: 6,
        }}>
          Welcome back
        </h1>
        <p style={{
          color: "#6B6B67",
          fontSize: "0.92rem",
          textAlign: "center",
          marginBottom: 32,
        }}>
          Login to your ThriftSathi account
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit}>

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={fieldLabel}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              onFocus={() => setFocus("email")}
              onBlur={() => setFocus("")}
              style={{
                ...fieldInput,
                borderColor: focusField === "email" ? "#1A6B4A" : "#E2E0D8",
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 8 }}>
            <label style={fieldLabel}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                onFocus={() => setFocus("password")}
                onBlur={() => setFocus("")}
                style={{
                  ...fieldInput,
                  paddingRight: 44,
                  borderColor: focusField === "password" ? "#1A6B4A" : "#E2E0D8",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "#6B6B67", padding: 4, lineHeight: 1, display: "flex",
                }}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* Forgot password */}
          <div style={{ textAlign: "right", marginBottom: 24 }}>
            <span style={{
              fontSize: "0.84rem",
              color: "#1A6B4A",
              fontWeight: 600,
              cursor: "pointer",
            }}>
              Forgot password?
            </span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...submitBtn,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        {/* Register link */}
        <p style={{
          textAlign: "center",
          marginTop: 24,
          fontSize: "0.9rem",
          color: "#6B6B67",
        }}>
          No account?{" "}
          <Link
            to="/register"
            style={{ color: "#1A6B4A", fontWeight: 700, textDecoration: "none" }}
          >
            Register →
          </Link>
        </p>
      </div>
    </div>
  );
}

// REGISTER PAGE
export function RegisterPage() {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email:    "",
    phone:    "",
    password: "",
    city:     "Kathmandu",
  });
  const [loading,    setLoading]  = useState(false);
  const [focusField, setFocus]    = useState("");

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    // 10 digits isn't enough on its own — a real Nepali mobile number
    // must start with 96, 97, or 98.
    if (form.phone && !/^9[678]\d{8}$/.test(form.phone)) {
      toast.error("Enter a valid Nepali mobile number (starts with 98, 97, or 96, 10 digits total).");
      return;
    }
    setLoading(true);
    try {
      await register({ ...form, phone: form.phone ? `+977${form.phone}` : "" });
      toast.success("Account created! Welcome to ThriftSathi.");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: "fullName", label: "Full name",    type: "text",     placeholder: "Deepa Paudel"        },
    { key: "email",    label: "Email",         type: "email",    placeholder: "example@gmail.com"   },
  ];
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div style={pageWrap}>
      <div style={{ ...card, maxWidth: 480 }}>

        {/* Title */}
        <h1 style={{
          fontWeight: 800,
          fontSize: "1.6rem",
          color: "#1C1C1A",
          textAlign: "center",
          marginBottom: 6,
        }}>
          Create your account
        </h1>
        <p style={{
          color: "#6B6B67",
          fontSize: "0.92rem",
          textAlign: "center",
          marginBottom: 32,
        }}>
          Profile setup – name, phone
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit}>

          {/* Text fields */}
          {fields.map(f => (
            <div key={f.key} style={{ marginBottom: 16 }}>
              <label style={fieldLabel}>{f.label}</label>
              <input
                type={f.type}
                value={form[f.key]}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                required
                minLength={f.key === "password" ? 6 : undefined}
                onFocus={() => setFocus(f.key)}
                onBlur={() => setFocus("")}
                style={{
                  ...fieldInput,
                  borderColor: focusField === f.key ? "#1A6B4A" : "#E2E0D8",
                }}
              />
            </div>
          ))}

          <div style={{ marginBottom: 16 }}>
            <label style={fieldLabel}>Phone number (optional)</label>
            <div style={{ display: "flex", gap: 8 }}>
              <span style={{
                ...fieldInput,
                width: 64,
                flexShrink: 0,
                textAlign: "center",
                background: "#F2F0EB",
                color: "#6B6B67",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>+977</span>
              <input
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={e => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="98XXXXXXXX"
                onFocus={() => setFocus("phone")}
                onBlur={() => setFocus("")}
                style={{
                  ...fieldInput,
                  flex: 1,
                  borderColor: focusField === "phone" ? "#1A6B4A" : "#E2E0D8",
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={fieldLabel}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={e => set("password", e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                onFocus={() => setFocus("password")}
                onBlur={() => setFocus("")}
                style={{
                  ...fieldInput,
                  paddingRight: 44,
                  borderColor: focusField === "password" ? "#1A6B4A" : "#E2E0D8",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "#6B6B67", padding: 4, lineHeight: 1, display: "flex",
                }}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* City */}
          <div style={{ marginBottom: 24 }}>
            <label style={fieldLabel}>City</label>
            <select
              value={form.city}
              onChange={e => set("city", e.target.value)}
              onFocus={() => setFocus("city")}
              onBlur={() => setFocus("")}
              style={{
                ...fieldInput,
                cursor: "pointer",
                appearance: "none",
                WebkitAppearance: "none",
                borderColor: focusField === "city" ? "#1A6B4A" : "#E2E0D8",
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236B6B67' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 14px center",
                paddingRight: 36,
              }}
            >
              {CITIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...submitBtn,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        {/* Login link */}
        <p style={{
          textAlign: "center",
          marginTop: 24,
          fontSize: "0.9rem",
          color: "#6B6B67",
        }}>
          Already have an account?{" "}
          <Link
            to="/login"
            style={{ color: "#1A6B4A", fontWeight: 700, textDecoration: "none" }}
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}