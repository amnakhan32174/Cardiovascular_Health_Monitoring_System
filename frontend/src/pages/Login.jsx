import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    try {
      // Firebase Login
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      let role = null;
      
      // First, check localStorage (most reliable for offline scenarios)
      const savedRole = localStorage.getItem("userRole");
      const savedUserData = localStorage.getItem("userData");
      
      if (savedRole) {
        role = savedRole;
        console.log("Using role from localStorage:", role);
      }
      
      // Try to get user role from Firestore (will override localStorage if available)
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData?.role) {
            role = userData.role;
            console.log("Using role from Firestore:", role);
            // Update localStorage with Firestore data
            localStorage.setItem("userRole", role);
            localStorage.setItem("userData", JSON.stringify(userData));
          }
        } else {
          console.log("User document doesn't exist in Firestore, using localStorage role");
        }
      } catch (firestoreError) {
        console.warn("Firestore error, using localStorage fallback:", firestoreError);
        // Continue with localStorage role if available
      }
      
      // If still no role found, try to parse from saved userData
      if (!role && savedUserData) {
        try {
          const parsedData = JSON.parse(savedUserData);
          if (parsedData?.role) {
            role = parsedData.role;
            console.log("Using role from saved userData:", role);
          }
        } catch (e) {
          console.warn("Error parsing saved userData:", e);
        }
      }
      
      // Final fallback - default to patient only if absolutely no role found
      if (!role) {
        console.warn("No role found, defaulting to patient");
        role = "patient";
      }
      
      console.log("Final role determined:", role);
      
      // Store login status and role
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userRole", role);
      localStorage.setItem("userId", user.uid);
      
      onLogin(); // calls handleLogin in App.jsx
      
      // Redirect based on role
      if (role === "doctor") {
        console.log("Redirecting to doctor dashboard");
        navigate("/doctor-dashboard");
      } else {
        console.log("Redirecting to patient dashboard");
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Failed to login. Please check your credentials.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
      <form className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200" onSubmit={handleLogin}>
        <h1 className="text-3xl font-bold mb-2 text-center text-slate-900">Welcome Back</h1>
        <p className="text-sm text-slate-600 text-center mb-6">Sign in to your account</p>
        
        {error && <p className="text-red-600 text-center mb-4 p-2 bg-red-50 rounded">{error}</p>}

        <input
          className="w-full p-3 border border-slate-300 rounded-lg mb-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />
        <input
          className="w-full p-3 border border-slate-300 rounded-lg mb-4 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        
        <button className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg">
          Login
        </button>

        <p className="text-center mt-6 text-slate-600">
          Don't have an account?{" "}
          <span
            className="text-emerald-600 cursor-pointer font-semibold hover:text-emerald-700"
            onClick={() => navigate("/signup")}
          >
            Sign Up
          </span>
        </p>
      </form>
    </div>
  );
}
