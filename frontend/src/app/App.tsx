import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Trips from "./pages/Trips";
import TripDetail from "./pages/TripDetail";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
    setLoading(false);
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen">Carregando...</div>;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/trips" /> : <Login onLogin={() => setIsAuthenticated(true)} />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/trips" /> : <Register />} />
        <Route path="/trips" element={isAuthenticated ? <Trips /> : <Navigate to="/login" />} />
        <Route path="/trips/:tripId" element={isAuthenticated ? <TripDetail /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/trips" : "/login"} />} />
      </Routes>
    </Router>
  );
}
