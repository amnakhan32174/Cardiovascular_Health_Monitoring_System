import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import ContactDoctor from "./pages/ContactDoctor";
import SignUp from "./pages/SignUp";

export default function App() {
  const [loggedIn, setLoggedIn] = React.useState(
    localStorage.getItem("isLoggedIn") === "true"
  );

  const handleLogin = () => {
    localStorage.setItem("isLoggedIn", "true");
    setLoggedIn(true);
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route
          path="/dashboard"
          element={loggedIn ? <Dashboard /> : <Navigate to="/login" replace />}
        />
        <Route path="/signup" element={<SignUp />} />

        <Route
          path="/profile"
          element={loggedIn ? <Profile /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/contact-doctor"
          element={loggedIn ? <ContactDoctor /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

const styles = {
  navbar: {
    display: "flex",
    gap: "20px",
    justifyContent: "center",
    padding: "15px",
    backgroundColor: "#f8f9fa",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
    marginBottom: "20px",
  },
  navLink: {
    textDecoration: "none",
    fontSize: "18px",
    fontWeight: "bold",
    color: "#007bff",
  },
};
