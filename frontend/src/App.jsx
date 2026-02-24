import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppHeader from "./components/layout/AppHeader";
import ProtectedRoute from "./components/ProtectedRoute";
import { PageSkeleton } from "./components/ui/Skeleton";

const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Explorer = lazy(() => import("./pages/Explorer"));
const Verify = lazy(() => import("./pages/Verify"));
const NotFound = lazy(() => import("./pages/NotFound"));

export default function App() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <AppHeader />
      <main>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/dashboard"
              element={(
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              )}
            />
            <Route path="/explorer" element={<Explorer />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/verify/:hash" element={<Verify />} />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}