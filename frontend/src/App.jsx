import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import DoctorChat from "./pages/DoctorChat";
import Profile from "./pages/Profile";
import ContactDoctor from "./pages/ContactDoctor";
import SignUp from "./pages/SignUp";
import "./utils/roleHelper"; // Load role helper utilities

export default function App() {
  const [loggedIn, setLoggedIn] = React.useState(
    localStorage.getItem("isLoggedIn") === "true"
  );
  const [userRole, setUserRole] = React.useState(() => {
    const role = localStorage.getItem("userRole");
    console.log("App initial role from localStorage:", role);
    return role || "patient";
  });

  const handleLogin = () => {
    const role = localStorage.getItem("userRole");
    console.log("handleLogin - role from localStorage:", role);
    localStorage.setItem("isLoggedIn", "true");
    setLoggedIn(true);
    setUserRole(role || "patient");
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/signup" element={<SignUp />} />
        
        {/* Patient Routes */}
        <Route
          path="/dashboard"
          element={
            loggedIn && userRole === "patient" ? (
              <Dashboard />
            ) : loggedIn && userRole === "doctor" ? (
              <Navigate to="/doctor-dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/contact-doctor"
          element={
            loggedIn && userRole === "patient" ? (
              <ContactDoctor />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Doctor Routes */}
        <Route
          path="/doctor-dashboard"
          element={
            loggedIn && userRole === "doctor" ? (
              <DoctorDashboard />
            ) : loggedIn && userRole === "patient" ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/doctor-chat/:patientId"
          element={
            loggedIn && userRole === "doctor" ? (
              <DoctorChat />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Common Routes */}
        <Route
          path="/profile"
          element={loggedIn ? <Profile /> : <Navigate to="/login" replace />}
        />
        
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

