import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listingsAPI } from "../api/index";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const CATEGORIES = ["Electronics", "Fashion", "Bikes and parts", "Home and living", "Other"];
const CONDITIONS = ["Like New", "Good", "Fair"];
const CITIES     = ["Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara", "Chitwan", "Butwal"];

const emptyForm = (user) => ({
  title: "", category: "", condition: "Like New", description: "",
  price: "", originalPrice: "", brand: "", city: user?.city || "Kathmandu",
  openToOffers: false, meetupAvailable: true,
});

export default function SellPage() {
  const { user } = useAuth();
  const { id }    = useParams();      // present only on /sell/edit/:id
  const isEdit    = !!id;
  const navigate  = useNavigate();
  const qc        = useQueryClient();

  const [form, setForm] = useState(emptyForm(user));
  // Photos already saved on the listing (edit mode) — kept separately from
  // newly-picked files so we don't force a reselect of all 5 photos just
  // to fix a typo in the title.
  const [existingImageUrls, setExistingImageUrls] = useState([]);
  const [imageFiles, setImageFiles]       = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploading, setUploading]         = useState(false);
  const [submitting, setSubmitting]       = useState(false);

  // In edit mode, load the existing listing. The backend's updateListing
  // (and this fetch) both scope to the logged-in seller, so someone can't
  // edit a listing that isn't theirs — a 404 here means either the listing
  // doesn't exist or it isn't yours.
  const { data: existingListing, isLoading: loadingListing, isError: loadError } = useQuery({
    queryKey: ["listing-edit", id],
    queryFn:  () => listingsAPI.getById(id).then((r) => r.data.listing),
    enabled:  isEdit,
  });

  useEffect(() => {
    if (!existingListing) return;
    if (String(existingListing.seller?._id || existingListing.seller) !== String(user?._id)) return;
    setForm({
      title: existingListing.title || "",
      category: existingListing.category || "",
      condition: existingListing.condition || "Like New",
      description: existingListing.description || "",
      price: existingListing.price ?? "",
      originalPrice: existingListing.originalPrice ?? "",
      brand: existingListing.brand || "",
      city: existingListing.city || user?.city || "Kathmandu",
      openToOffers: !!existingListing.openToOffers,
      meetupAvailable: existingListing.meetupAvailable !== false,
    });
    setExistingImageUrls(existingListing.imageUrls || []);
  }, [existingListing, user]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Each time the file picker is used this must ADD to what's already
  // selected, not replace it — otherwise picking photos one at a time
  // (rather than multi-selecting all 5 in one go) wipes out every
  // previous pick and the seller ends up with only the last photo.
  const handleImages = (e) => {
    const selected = Array.from(e.target.files);
    const remainingSlots = 5 - existingImageUrls.length - imageFiles.length;
    const filesToAdd = selected.slice(0, Math.max(0, remainingSlots));
    setImageFiles((prev) => [...prev, ...filesToAdd]);
    setImagePreviews((prev) => [...prev, ...filesToAdd.map((f) => URL.createObjectURL(f))]);
    // Reset so selecting the exact same file again (e.g. after removing it)
    // still fires onChange — browsers skip the event if the value looks unchanged.
    e.target.value = "";
  };

  const removeExistingImage = (i) => {
    setExistingImageUrls((prev) => prev.filter((_, idx) => idx !== i));
  };

  const removeNewImage = (i) => {
    setImageFiles((prev) => prev.filter((_, idx) => idx !== i));
    setImagePreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.category || !form.price) {
      toast.error("Title, category, and price are required."); return;
    }
    setSubmitting(true);
    try {
      let newImageUrls = [];
      if (imageFiles.length) {
        setUploading(true);
        const fd = new FormData();
        imageFiles.forEach((f) => fd.append("images", f));
        const { data: upData } = await listingsAPI.uploadImages(fd);
        newImageUrls = upData.urls;
        setUploading(false);
      }
      const imageUrls = [...existingImageUrls, ...newImageUrls];
      const payload = {
        ...form,
        price:         parseFloat(form.price),
        originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : undefined,
        imageUrls,
      };

      if (isEdit) {
        await listingsAPI.update(id, payload);
        // Invalidate the detail page's cache key (not our own edit-page
        // key) so /listings/:id refetches fresh data instead of showing
        // whatever was last cached there.
        qc.invalidateQueries(["listing", id]);
        qc.invalidateQueries(["listing-edit", id]);
        qc.invalidateQueries(["dashboard"]);
        qc.invalidateQueries(["recent-listings"]);
        toast.success("Listing updated!");
        navigate(`/listings/${id}`);
      } else {
        const { data } = await listingsAPI.create(payload);
        qc.invalidateQueries(["recent-listings"]);
        toast.success("Listing published! 🎉");
        navigate(`/listings/${data.listing._id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || (isEdit ? "Failed to save changes." : "Failed to publish."));
    } finally { setSubmitting(false); setUploading(false); }
  };

  if (isEdit && loadingListing) {
    return <div style={{ padding: 60, textAlign: "center", color: "#6B6B67" }}>Loading listing…</div>;
  }
  if (isEdit && (loadError || (existingListing && String(existingListing.seller?._id || existingListing.seller) !== String(user?._id)))) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "#6B6B67" }}>
        <p style={{ fontWeight: 700, color: "#1C1C1A", marginBottom: 8 }}>You can't edit this listing.</p>
        <p style={{ fontSize: "0.9rem" }}>It either doesn't exist, or it belongs to a different seller.</p>
      </div>
    );
  }

  const totalPhotoCount = existingImageUrls.length + imagePreviews.length;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 1.5rem" }}>
      <h1 style={{ marginBottom: 4 }}>{isEdit ? "Edit listing" : "List an item"}</h1>
      <p className="text-muted" style={{ marginBottom: 28 }}>
        {isEdit ? "Update your listing details below." : "Choose a category to get started"}
      </p>

      <form onSubmit={handleSubmit}>
        {/* Category */}
        <div className="form-group">
          <label>Category *</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CATEGORIES.map((c) => (
              <button type="button" key={c} onClick={() => set("category", c)}
                style={{ padding: "7px 16px", borderRadius: 20, border: `1.5px solid ${form.category === c ? "var(--green)" : "var(--border)"}`, background: form.category === c ? "var(--green)" : "#fff", color: form.category === c ? "#fff" : "var(--text)", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Photos */}
        <div className="form-group">
          <label>Photos (up to 5)</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {existingImageUrls.map((src, i) => (
              <div key={"existing-" + i} style={{ width: 80, height: 80, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", position: "relative" }}>
                <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                {i === 0 && <span style={{ position: "absolute", bottom: 2, left: 2, background: "var(--green)", color: "#fff", fontSize: "0.6rem", fontWeight: 700, padding: "1px 5px", borderRadius: 4 }}>Cover</span>}
                <button type="button" onClick={() => removeExistingImage(i)}
                  style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", fontSize: 11, cursor: "pointer", lineHeight: "18px" }}>
                  ✕
                </button>
              </div>
            ))}
            {imagePreviews.map((src, i) => (
              <div key={"new-" + i} style={{ width: 80, height: 80, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", position: "relative" }}>
                <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                {existingImageUrls.length === 0 && i === 0 && <span style={{ position: "absolute", bottom: 2, left: 2, background: "var(--green)", color: "#fff", fontSize: "0.6rem", fontWeight: 700, padding: "1px 5px", borderRadius: 4 }}>Cover</span>}
                <button type="button" onClick={() => removeNewImage(i)}
                  style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", fontSize: 11, cursor: "pointer", lineHeight: "18px" }}>
                  ✕
                </button>
              </div>
            ))}
            {totalPhotoCount < 5 && (
              <label style={{ width: 80, height: 80, border: "2px dashed var(--border)", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "0.72rem", color: "var(--text-muted)", gap: 4 }}>
                <span style={{ fontSize: 22 }}>+</span>Add photo
                <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleImages} />
              </label>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="form-group">
          <label>Title *</label>
          <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. RTX 3060 Ti – Asus" required />
        </div>

        {/* Brand */}
        <div className="form-group">
          <label>Brand / Model (optional)</label>
          <input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. Asus, Samsung, Yamaha" />
        </div>

        {/* Condition + Offers */}
        <div className="form-row form-row-2">
          <div className="form-group">
            <label>Condition *</label>
            <select value={form.condition} onChange={(e) => set("condition", e.target.value)}>
              {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Open to offers</label>
            <select value={form.openToOffers ? "yes" : "no"} onChange={(e) => set("openToOffers", e.target.value === "yes")}>
              <option value="yes">Yes – buyers can offer</option>
              <option value="no">No – fixed price</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div className="form-group">
          <label>Description</label>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Describe the item — age, condition details, what's included, reason for selling…" rows={4} />
        </div>

        {/* Prices + City */}
        <div className="form-row form-row-3">
          <div className="form-group">
            <label>Asking price (Rs.) *</label>
            <input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="e.g. 28000" min="1" required />
          </div>
          <div className="form-group">
            <label>Original retail price (Rs.)</label>
            <input type="number" value={form.originalPrice} onChange={(e) => set("originalPrice", e.target.value)} placeholder="e.g. 48000" />
          </div>
          <div className="form-group">
            <label>City *</label>
            <select value={form.city} onChange={(e) => set("city", e.target.value)}>
              {CITIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Meetup */}
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, cursor: "pointer", fontSize: "0.9rem" }}>
          <input type="checkbox" checked={form.meetupAvailable} onChange={(e) => set("meetupAvailable", e.target.checked)} />
          Available for meetup
        </label>

        <button type="submit" disabled={submitting || uploading} className="btn btn-primary btn-full btn-lg">
          {uploading ? "Uploading photos…" : submitting ? (isEdit ? "Saving…" : "Publishing…") : (isEdit ? "Save changes" : "Publish listing")}
        </button>
      </form>
    </div>
  );
}