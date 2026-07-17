// Badge component
export function Badge({ condition }) {
  const map = {
    "Like New": "badge-like-new",
    "Good":     "badge-good",
    "Fair":     "badge-fair",
  };
  return <span className={`badge ${map[condition] || "badge-fair"}`}>{condition}</span>;
}

// Status badge
export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

// Payment status badge — separate from order StatusBadge because the
// underlying values ("awaiting_confirmation") aren't readable if you just
// capitalize the first letter, and COD's "pending" needs its own wording
// so it doesn't look like a stalled digital payment.
export function PaymentStatusBadge({ status, method }) {
  const map = {
    paid:                  { label: "Payment confirmed",         cls: "badge-paid" },
    awaiting_confirmation: { label: "Awaiting seller confirmation", cls: "badge-awaiting-confirmation" },
    pending:               { label: method === "cod" ? "Pay on delivery/meetup" : "Payment pending", cls: "badge-pending-payment" },
    failed:                { label: "Payment failed",            cls: "badge-disputed" },
  };
  const { label, cls } = map[status] || { label: status, cls: "badge-pending-payment" };
  return <span className={`badge ${cls}`}>{label}</span>;
}

// Condition to CSS class helper
export function conditionClass(c) {
  if (c === "Like New") return "badge-like-new";
  if (c === "Good")     return "badge-good";
  return "badge-fair";
}