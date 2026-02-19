import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Heart } from "lucide-react";
import { auth, db } from "../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      let role = null;
      const savedRole = localStorage.getItem("userRole");
      const savedUserData = localStorage.getItem("userData");
      
      if (savedRole) {
        role = savedRole;
        console.log("Using role from localStorage:", role);
      }
      
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData?.role) {
            role = userData.role;
            console.log("Using role from Firestore:", role);
            localStorage.setItem("userRole", role);
            localStorage.setItem("userData", JSON.stringify(userData));
          }
        } else {
          console.log("User document doesn't exist in Firestore, using localStorage role");
        }
      } catch (firestoreError) {
        console.warn("Firestore error, using localStorage fallback:", firestoreError);
      }
      
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
      
      if (!role) {
        console.warn("No role found, defaulting to patient");
        role = "patient";
      }
      
      console.log("Final role determined:", role);
      
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userRole", role);
      localStorage.setItem("userId", user.uid);
      
      onLogin();
      
      if (role === "admin") {
        console.log("Redirecting to admin dashboard");
        navigate("/admin-dashboard");
      } else if (role === "doctor") {
        console.log("Redirecting to doctor dashboard");
        navigate("/doctor-dashboard");
      } else {
        console.log("Redirecting to patient dashboard");
        navigate("/dashboard");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      
      let errorMessage = "Failed to login. Please check your credentials.";
      
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        errorMessage = "Invalid email or password. Please check your credentials and try again.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email address. Please enter a valid email.";
      } else if (err.code === "auth/user-disabled") {
        errorMessage = "This account has been disabled. Please contact support.";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Too many failed login attempts. Please try again later.";
      } else if (err.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <form className="relative bg-[var(--card)] p-8 rounded-xl shadow-sm w-full max-w-md border border-[var(--border)]" onSubmit={handleLogin}>
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-[var(--primary)] rounded-full">
            <Heart className="w-10 h-10 text-white" fill="white" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mb-2 text-center text-[var(--foreground)]">
          CardioMonitor
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] text-center mb-6">
          Cardiovascular Health Monitoring System
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <input
          className="w-full p-3 border border-[var(--border)] rounded-lg mb-3 focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] transition bg-[var(--input-background)]"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />
        <input
          className="w-full p-3 border border-[var(--border)] rounded-lg mb-4 focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] transition bg-[var(--input-background)]"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        
        <button className="w-full py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-orange-600 transition shadow-sm">
          Sign In
        </button>

        <p className="text-center mt-6 text-[var(--muted-foreground)]">
          Don't have an account?{" "}
          <span
            className="text-[var(--primary)] cursor-pointer font-semibold hover:text-orange-600 hover:underline"
            onClick={() => navigate("/signup")}
          >
            Sign Up
          </span>
        </p>
      </form>
    </div>
  );
}
