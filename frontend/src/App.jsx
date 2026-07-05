import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/layout/Navbar";
import ProtectedRoute from "./components/common/ProtectedRoute";

// Pages
import HomePage         from "./pages/HomePage";
import BrowsePage       from "./pages/BrowsePage";
import ListingDetailPage from "./pages/ListingDetailPage";
import CheckoutPage     from "./pages/CheckoutPage";
import PaymentPage      from "./pages/PaymentPage";
import SellerProfilePage from "./pages/SellerProfilePage";
import MessagesPage     from "./pages/MessagesPage";
import OrderDetailPage  from "./pages/OrderDetailPage";
import SellPage         from "./pages/SellPage";
import DashboardPage    from "./pages/DashboardPage";
import { LoginPage, RegisterPage } from "./pages/AuthPages";

export default function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3500, style: { fontFamily: "DM Sans, sans-serif", fontSize: "0.88rem" } }} />
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/"               element={<HomePage />} />
        <Route path="/browse"         element={<BrowsePage />} />
        <Route path="/listings/:id"   element={<ListingDetailPage />} />
        <Route path="/sellers/:id"    element={<SellerProfilePage />} />
        <Route path="/login"          element={<LoginPage />} />
        <Route path="/register"       element={<RegisterPage />} />

        {/* Protected – must be logged in */}
        <Route path="/sell"           element={<ProtectedRoute><SellPage /></ProtectedRoute>} />
        <Route path="/checkout/:id"   element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
        <Route path="/payment/:id"    element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
        <Route path="/messages"       element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
        <Route path="/messages/:conversationId" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
        <Route path="/orders/:id"     element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
        <Route path="/dashboard"      element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/orders"         element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/saved"          element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/notifications"  element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/profile"        element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/reviews"        element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
