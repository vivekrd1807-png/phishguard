import { Navigate, Route, Routes } from "react-router-dom";
import Landing from "@/pages/landing";
import { AppLayout } from "@/components/layout/app-layout";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/auth/route-guards";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import ForgotPassword from "@/pages/auth/forgot-password";
import ResetPassword from "@/pages/auth/reset-password";
import Dashboard from "@/pages/dashboard";
import EnsembleFeature from "@/pages/ensemble";
import ThreatIntelligence from "@/pages/threat-intelligence";
import FeatureAnalysis from "@/pages/feature-analysis";
import Explainability from "@/pages/explainability";
import ScanHistory from "@/pages/scan-history";
import ScanDetail from "@/pages/scan-detail";
import SettingsPage from "@/pages/settings";
import Profile from "@/pages/profile";
import Help from "@/pages/help";
import Unauthorized from "@/pages/unauthorized";
import NotFound from "@/pages/not-found";

export default function App() {
  return (
    <Routes>
      <Route index element={<Landing />} />

      {/* Public pages */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
      </Route>
      <Route path="forgot-password" element={<ForgotPassword />} />
      <Route path="reset-password" element={<ResetPassword />} />

      {/* Signed-in pages: anonymous visitors are redirected to /login */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="ensemble" element={<EnsembleFeature />} />
          <Route path="scanner" element={<Navigate to="/ensemble" replace />} />
          <Route path="threat-intelligence" element={<ThreatIntelligence />} />
          <Route path="feature-analysis" element={<FeatureAnalysis />} />
          <Route path="domain-analysis" element={<Navigate to="/feature-analysis" replace />} />
          <Route path="explainability" element={<Explainability />} />
          <Route path="history" element={<ScanHistory />} />
          <Route path="history/:id" element={<ScanDetail />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<Profile />} />
          <Route path="help" element={<Help />} />
          <Route path="unauthorized" element={<Unauthorized />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
