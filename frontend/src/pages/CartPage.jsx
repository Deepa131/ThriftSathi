// PATH: frontend/src/pages/CartPage.jsx

import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function CartPage() {
  const navigate = useNavigate();
  const { items, itemCount, subtotal, loading, updateQuantity, removeFromCart, clearCart } = useCart();

  if (loading && items.length === 0) {
    return <div style={{ padding: 60, textAlign: "center", color: "#6B6B67" }}>Loading…</div>;
  }

  if (items.length === 0) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "60px 1.5rem", textAlign: "center" }}>
        <div style={{ fontSize: 52, opacity: 0.25, marginBottom: 14 }}>🛒</div>
        <h2 style={{ marginBottom: 8 }}>Your cart is empty</h2>
        <p style={{ color: "#6B6B67", fontSize: "0.9rem", marginBottom: 24 }}>
          Browse listings and tap "Add to cart" to save items here.
        </p>
        <button className="btn btn-primary" onClick={() => navigate("/browse")}>Browse listings</button>
      </div>
    );
  }

  // Items that no longer have a listing at all (deleted) can't be grouped
  // by seller, so they get their own bucket and are rendered plainly.
  const unavailableNoListing = items.filter((it) => !it.listing);

  // Group everything else by seller. A seller's _id is assigned once at
  // signup and never changes or collides — registration already blocks
  // duplicate emails/phones — so grouping on listing.seller._id is a
  // reliable way to know two listings really are from the same account,
  // without needing to separately compare email or phone here.
  const groups = new Map();
  for (const it of items) {
    if (!it.listing) continue;
    const sellerId = it.listing.seller?._id || "unknown";
    if (!groups.has(sellerId)) {
      groups.set(sellerId, { seller: it.listing.seller, items: [] });
    }
    groups.get(sellerId).items.push(it);
  }

  const handleGroupCheckout = (group) => {
    const availableItems = group.items.filter((it) => it.isAvailable);
    if (availableItems.length === 0) return;

    if (availableItems.length === 1) {
      // Only one item from this seller — the existing single-item
      // checkout flow already handles this, no need for the batch path.
      navigate(`/checkout/${availableItems[0].listing._id}`);
      return;
    }

    navigate("/checkout/batch", {
      state: {
        seller: group.seller,
        items: availableItems.map((it) => ({
          listingId: it.listing._id,
          title: it.listing.title,
          imageUrl: it.listing.imageUrls?.[0] || null,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          lineTotal: it.lineTotal,
        })),
      },
    });
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontWeight: 800 }}>Your cart ({itemCount})</h1>
        <button
          onClick={clearCart}
          style={{ background: "none", border: "none", color: "#C0392B", fontWeight: 600, fontSize: "0.84rem", cursor: "pointer" }}
        >
          Clear cart
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
        {[...groups.values()].map((group) => {
          const availableCount = group.items.filter((it) => it.isAvailable).length;
          const groupSubtotal = group.items.reduce((s, it) => s + (it.isAvailable ? it.lineTotal : 0), 0);
          const isBatch = availableCount > 1;

          return (
            <div key={group.seller?._id || Math.random()} style={{ background: "#fff", border: "1px solid #E2E0D8", borderRadius: 14, overflow: "hidden" }}>
              {/* Seller header — everything in this card comes from one seller account */}
              <div style={{ padding: "12px 16px", background: "#F7F6F2", borderBottom: "1px solid #E2E0D8", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Seller: {group.seller?.fullName || "—"}</span>
                {isBatch && (
                  <span style={{ fontSize: "0.72rem", color: "#1A6B4A", fontWeight: 600, background: "#E8F5EE", padding: "2px 8px", borderRadius: 10 }}>
                    {availableCount} items — pay together
                  </span>
                )}
              </div>

              <div>
                {group.items.map(({ _id, listing, quantity, isAvailable, unitPrice, lineTotal }) => {
                  const stockQty = listing?.stockQty || 1;
                  const canIncrease = quantity < stockQty;

                  return (
                    <div key={_id} style={{
                      display: "flex", gap: 14, alignItems: "center",
                      padding: "14px 16px", borderBottom: "1px solid #F0EFE9",
                      opacity: isAvailable ? 1 : 0.6,
                    }}>
                      <div
                        onClick={() => listing && navigate(`/listings/${listing._id}`)}
                        style={{
                          width: 60, height: 60, borderRadius: 10, background: "#F2F0EB",
                          flexShrink: 0, overflow: "hidden", display: "flex",
                          alignItems: "center", justifyContent: "center", cursor: listing ? "pointer" : "default",
                        }}
                      >
                        {listing?.imageUrls?.[0]
                          ? <img src={listing.imageUrls[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <span style={{ fontSize: 24, opacity: 0.3 }}>📦</span>}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          onClick={() => listing && navigate(`/listings/${listing._id}`)}
                          style={{ fontWeight: 700, fontSize: "0.92rem", marginBottom: 2, cursor: listing ? "pointer" : "default", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                        >
                          {listing?.title || "This listing is no longer available"}
                        </p>
                        {listing && (
                          <>
                            {!isAvailable && (
                              <p style={{ fontSize: "0.76rem", color: "#C0392B", fontWeight: 600, marginBottom: 4 }}>
                                No longer available — {listing.status === "sold" ? "sold" : listing.status}
                              </p>
                            )}
                            <p style={{ fontWeight: 700, color: "#1A6B4A", fontSize: "0.88rem" }}>
                              Rs. {unitPrice.toLocaleString()} {quantity > 1 && `× ${quantity}`}
                            </p>
                          </>
                        )}
                      </div>

                      {/* Quantity — most listings here are one-off secondhand
                          items with exactly 1 unit, so there's nothing to
                          step through. The stepper only appears once the
                          seller has actually listed more than 1 in stock,
                          and "+" stays capped at that real stock number so
                          a buyer can never request more than the seller has. */}
                      {isAvailable && (
                        stockQty > 1 ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #E2E0D8", borderRadius: 10, padding: "4px 8px" }}>
                            <button
                              onClick={() => updateQuantity(listing._id, Math.max(1, quantity - 1))}
                              disabled={quantity <= (listing.minOrderQty || 1)}
                              style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1rem", fontWeight: 700, color: "#1A6B4A", padding: "0 4px" }}
                            >−</button>
                            <span style={{ minWidth: 18, textAlign: "center", fontWeight: 600, fontSize: "0.85rem" }}>{quantity}</span>
                            <button
                              onClick={() => canIncrease && updateQuantity(listing._id, quantity + 1)}
                              disabled={!canIncrease}
                              title={!canIncrease ? `Only ${stockQty} in stock` : undefined}
                              style={{ border: "none", background: "none", cursor: canIncrease ? "pointer" : "not-allowed", fontSize: "1rem", fontWeight: 700, color: canIncrease ? "#1A6B4A" : "#C7C4BA", padding: "0 4px" }}
                            >+</button>
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.8rem", color: "#6B6B67", minWidth: 40, textAlign: "center" }}>Qty: 1</span>
                        )
                      )}

                      <div style={{ textAlign: "right", minWidth: 80 }}>
                        {isAvailable && (
                          <p style={{ fontWeight: 800, fontSize: "0.9rem", marginBottom: 8 }}>Rs. {lineTotal.toLocaleString()}</p>
                        )}
                        <button
                          onClick={() => removeFromCart(listing ? listing._id : _id)}
                          style={{ background: "none", border: "1px solid #E2E0D8", borderRadius: 8, padding: "5px 12px", fontWeight: 600, fontSize: "0.76rem", color: "#6B6B67", cursor: "pointer" }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* One checkout action per seller — if there's more than one
                  available item from this seller it pays for all of them
                  together instead of making the buyer check out each one
                  separately. */}
              {availableCount > 0 && (
                <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FAFAF7" }}>
                  <span style={{ fontSize: "0.85rem", color: "#6B6B67" }}>
                    Subtotal: <strong style={{ color: "#1C1C1A" }}>Rs. {groupSubtotal.toLocaleString()}</strong>
                  </span>
                  <button
                    onClick={() => handleGroupCheckout(group)}
                    style={{ background: "#1A6B4A", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: "0.84rem", cursor: "pointer" }}
                  >
                    {isBatch ? `Checkout ${availableCount} items` : "Checkout"}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Deleted listings with no seller to group under */}
        {unavailableNoListing.map(({ _id }) => (
          <div key={_id} style={{ background: "#fff", border: "1px solid #E2E0D8", borderRadius: 14, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.6 }}>
            <p style={{ fontWeight: 700, fontSize: "0.9rem" }}>This listing is no longer available</p>
            <button
              onClick={() => removeFromCart(_id)}
              style={{ background: "none", border: "1px solid #E2E0D8", borderRadius: 8, padding: "5px 12px", fontWeight: 600, fontSize: "0.78rem", color: "#6B6B67", cursor: "pointer" }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Summary footer */}
      <div style={{
        marginTop: 24, background: "#fff", border: "1px solid #E2E0D8", borderRadius: 14,
        padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <p style={{ fontSize: "0.82rem", color: "#6B6B67" }}>Cart subtotal ({itemCount} item{itemCount !== 1 ? "s" : ""})</p>
          <p style={{ fontWeight: 800, fontSize: "1.2rem", color: "#1A6B4A" }}>Rs. {subtotal.toLocaleString()}</p>
        </div>
        <p style={{ fontSize: "0.78rem", color: "#6B6B67", maxWidth: 300, textAlign: "right" }}>
          Items from the same seller can be paid for together. Items from different sellers check out separately.
        </p>
      </div>
    </div>
  );
}