export function Badge({ condition }) {
  const map = {
    "Like New": "badge-like-new",
    "Good":     "badge-good",
    "Fair":     "badge-fair",
  };
  return <span className={`badge ${map[condition] || "badge-fair"}`}>{condition}</span>;
}

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

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

export function conditionClass(c) {
  if (c === "Like New") return "badge-like-new";
  if (c === "Good")     return "badge-good";
  return "badge-fair";
}