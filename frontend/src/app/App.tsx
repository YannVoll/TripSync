import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import RootLayout from "./layouts/RootLayout";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import DashboardPage from "./pages/DashboardPage";
import PropertiesPage from "./pages/PropertiesPage";
import NewPropertyPage from "./pages/NewPropertyPage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import NotFoundPage from "./pages/NotFoundPage";
import EditPropertyPage from "./pages/EditPropertyPage";
import CheckoutPage from "./pages/CheckoutPage";
import NotificationSettingsCompleto from './pages/NotificationSettingsCompleto';

import Trips from "./pages/Trips";
import TripDetail from "./pages/TripDetail";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/trips" element={<Trips />} />
          <Route path="/trips/:tripId" element={<TripDetail />} />

          <Route element={<RootLayout />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignUpPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="properties" element={<PropertiesPage />} />
            <Route path="properties/new" element={<NewPropertyPage />} />
            <Route path="properties/:id/edit" element={<EditPropertyPage />} />
            <Route path="properties/:id" element={<PropertyDetailPage />} />
            <Route path="checkout/:bookingId" element={<CheckoutPage />} />
            <Route path="*" element={<NotFoundPage />} />
            <Route path="/notifications" element={<NotificationSettingsCompleto />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}