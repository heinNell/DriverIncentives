import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { useRealtimeData } from "./hooks/useRealtimeData";
import AnalyticsPage from "./pages/AnalyticsPage";
import CalculationsPage from "./pages/CalculationsPage";
import Dashboard from "./pages/Dashboard";
import DriverProfile from "./pages/DriverProfile";
import DriversPage from "./pages/DriversPage";
import { LoginPage } from "./pages/LoginPage";
import MasterSheet from "./pages/MasterSheet";
import PerformancePage from "./pages/PerformancePage";
import SettingsPage from "./pages/SettingsPage";
import YearComparisonPage from "./pages/YearComparisonPage";
import { useStore } from "./store/useStore";

function AppContent() {
  useRealtimeData();
  const { toastMessage } = useStore();

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="drivers" element={<DriversPage />} />
          <Route path="drivers/:id" element={<DriverProfile />} />
          <Route path="master-sheet" element={<MasterSheet />} />
          <Route path="performance" element={<PerformancePage />} />
          <Route path="calculations" element={<CalculationsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="comparison" element={<YearComparisonPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      {toastMessage && <div className="toast">{toastMessage}</div>}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
