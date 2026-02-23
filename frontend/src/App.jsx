import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Explorer from "./pages/Explorer";
import Verify from "./pages/Verify";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <>
      <Navbar />
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
      </Routes>
    </>
  );
}

export default App;
