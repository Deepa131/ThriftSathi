import axios from "axios";

// Single axios instance — all requests go through this
const api = axios.create({
  baseURL: "/api",
  timeout: 12000,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ts_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to /login on 401 — but NOT when the 401 came from the login
// or register call itself. Those are just "wrong email/password" and
// must be handled by the calling page's catch block (which shows a
// toast). Without this check, a failed login triggers a hard redirect
// to /login before the error toast can ever render, making it look
// like nothing happened.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthEndpoint = err.config?.url?.includes("/auth/login") || err.config?.url?.includes("/auth/register");
    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem("ts_token");
      localStorage.removeItem("ts_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// AUTH
export const authAPI = {
  register: (data)           => api.post("/auth/register", data),
  login:    (email, password) => api.post("/auth/login", { email, password }),
  me:       ()               => api.get("/auth/me"),
};

// LISTINGS
export const listingsAPI = {
  getAll:        (params)    => api.get("/listings", { params }),
  getRecent:     (params)    => api.get("/listings/recent", { params }),
  getSoldPrices: (category)  => api.get("/listings/sold-prices", { params: { category } }),
  getBySeller:   (sellerId)  => api.get(`/listings/seller/${sellerId}`),
  getById:       (id)        => api.get(`/listings/${id}`),
  getPriceHistory:(id)       => api.get(`/listings/${id}/price-history`),
  create:        (data)      => api.post("/listings", data),
  update:        (id, data)  => api.patch(`/listings/${id}`, data),
  setStatus:     (id, status) => api.patch(`/listings/${id}/status`, { status }),
  delete:        (id)        => api.delete(`/listings/${id}`),
  duplicate:     (id)        => api.post(`/listings/${id}/duplicate`),
  uploadImages:  (formData)  => api.post("/listings/upload-images", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
};

// ORDERS
export const ordersAPI = {
  create:         (data)         => api.post("/orders", data),
  getMyOrders:    ()             => api.get("/orders"),
  getSellingOrders: ()           => api.get("/orders/selling"),
  getById:        (id)           => api.get(`/orders/${id}`),
  updateStatus:   (id, status, note) => api.patch(`/orders/${id}/status`, { status, note }),
  confirmPayment: (id)           => api.patch(`/orders/${id}/confirm-payment`),
  raiseDispute:   (id, reason)   => api.post(`/orders/${id}/dispute`, { reason }),
};

// USERS
export const usersAPI = {
  getProfile:       (id)        => api.get(`/users/${id}`),
  updateProfile:    (data)      => api.patch("/users/me/profile", data),
  uploadPaymentQR:  (formData)  => api.post("/users/me/payment-qr", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
  getDashboard:     ()          => api.get("/users/me/dashboard"),
  getSaved:         ()          => api.get("/users/me/saved"),
  toggleSave:       (listingId, collectionName) => api.post("/users/me/saved", { listingId, collectionName }),
  getNotifications: ()          => api.get("/users/me/notifications"),
  markAllRead:      ()          => api.patch("/users/me/notifications/read-all"),
  createPriceAlert: (data)      => api.post("/users/me/price-alerts", data),
  getPriceAlerts:   ()          => api.get("/users/me/price-alerts"),
  getAnalytics:     (listingId) => api.get(`/users/me/analytics/${listingId}`),
  follow:           (id)        => api.post(`/users/${id}/follow`),
  block:            (id)        => api.post(`/users/${id}/block`),
  unblock:          (id)        => api.delete(`/users/${id}/block`),
};

// MESSAGES
export const messagesAPI = {
  getConversations:  ()             => api.get("/messages/conversations"),
  startConversation: (listingId)    => api.post("/messages/conversations", { listingId }),
  getMessages:       (convoId)      => api.get(`/messages/${convoId}`),
  sendMessage:       (convoId, data) => api.post(`/messages/${convoId}`, data),
  getUnreadCount:    ()             => api.get("/messages/unread-count"),
};

// REVIEWS
export const reviewsAPI = {
  getSellerReviews: (sellerId) => api.get(`/reviews/seller/${sellerId}`),
  create:           (data)     => api.post("/reviews", data),
};

// REPORTS
export const reportsAPI = {
  create:    (data) => api.post("/reports", data),
  getMyReports: ()  => api.get("/reports/mine"),
};

// OFFERS
export const offersAPI = {
  create:    (listingId, amount)         => api.post("/offers", { listingId, amount }),
  respond:   (id, action, counterAmount) => api.patch(`/offers/${id}`, { action, counterAmount }),
  getListing:(listingId)                 => api.get(`/offers/listing/${listingId}`),
};

export default api;