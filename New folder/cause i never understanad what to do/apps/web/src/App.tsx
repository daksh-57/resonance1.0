import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AuthProvider, useAuth } from "./lib/auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./lib/theme";
import Shell from "./components/Shell";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Sources from "./pages/Sources";
import Datasets from "./pages/Datasets";
import DatasetDetail from "./pages/DatasetDetail";
import Upload from "./pages/Upload";
import Entities from "./pages/Entities";
import EntityDetail from "./pages/EntityDetail";
import Duplicates from "./pages/Duplicates";
import Conflicts from "./pages/Conflicts";
import ConflictDetail from "./pages/ConflictDetail";
import Review from "./pages/Review";
import CanonicalRecords from "./pages/CanonicalRecords";
import CanonicalDetail from "./pages/CanonicalDetail";
import Audit from "./pages/Audit";
import Analytics from "./pages/Analytics";
import Rules from "./pages/Rules";
import Settings from "./pages/Settings";
import Api from "./pages/Api";
import Schedules from "./pages/Schedules";
import Search from "./pages/Search";

const queryClient = new QueryClient();

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8" style={{ border: "2px solid var(--border-default)", borderTopColor: "var(--accent)" }} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Shell>{children}</Shell>;
}

function Public({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8" style={{ border: "2px solid var(--border-default)", borderTopColor: "var(--accent)" }} /></div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Public><Login /></Public>} />
              <Route path="/register" element={<Public><Register /></Public>} />
              <Route path="/forgot-password" element={<Public><ForgotPassword /></Public>} />
              <Route path="/reset-password" element={<Public><ResetPassword /></Public>} />
              <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
              <Route path="/sources" element={<Protected><Sources /></Protected>} />
              <Route path="/datasets" element={<Protected><Datasets /></Protected>} />
              <Route path="/datasets/:id" element={<Protected><DatasetDetail /></Protected>} />
              <Route path="/upload" element={<Protected><Upload /></Protected>} />
              <Route path="/entities" element={<Protected><Entities /></Protected>} />
              <Route path="/entities/:id" element={<Protected><EntityDetail /></Protected>} />
              <Route path="/duplicates" element={<Protected><Duplicates /></Protected>} />
              <Route path="/conflicts" element={<Protected><Conflicts /></Protected>} />
              <Route path="/conflicts/:id" element={<Protected><ConflictDetail /></Protected>} />
              <Route path="/review" element={<Protected><Review /></Protected>} />
              <Route path="/canonical-records" element={<Protected><CanonicalRecords /></Protected>} />
              <Route path="/canonical-records/:id" element={<Protected><CanonicalDetail /></Protected>} />
              <Route path="/audit" element={<Protected><Audit /></Protected>} />
              <Route path="/analytics" element={<Protected><Analytics /></Protected>} />
              <Route path="/rules" element={<Protected><Rules /></Protected>} />
              <Route path="/settings" element={<Protected><Settings /></Protected>} />
              <Route path="/api" element={<Protected><Api /></Protected>} />
               <Route path="/schedules" element={<Protected><Schedules /></Protected>} />
               <Route path="/search" element={<Protected><Search /></Protected>} />
               <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
