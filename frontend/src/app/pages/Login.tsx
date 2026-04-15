import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Heart } from "lucide-react";
import { auth, db } from "../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDocFromServer, collection, query, where, getDocs } from "firebase/firestore";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Clear any stale role data from a previous user's session before lookup
      localStorage.removeItem("userRole");
      localStorage.removeItem("userData");

      let role = null;

      // Force fetch from server so manually-set roles (e.g. admin) are always picked up.
      // First try the canonical path: users/{uid}
      let userData: any = null;
      const uidDoc = await getDocFromServer(doc(db, "users", user.uid));
      if (uidDoc.exists()) {
        userData = uidDoc.data();
      } else {
        // Fallback: document was created manually with an auto-generated ID —
        // search by email instead
        const snap = await getDocs(
          query(collection(db, "users"), where("email", "==", user.email))
        );
        if (!snap.empty) userData = snap.docs[0].data();
      }

      if (userData?.role) {
        // Normalize to lowercase so "Admin" / "ADMIN" / "admin" all work
        role = (userData.role as string).toLowerCase().trim();
        localStorage.setItem("userData", JSON.stringify({ ...userData, role }));
      } else if (userData) {
        setError("Your account has no role assigned. Contact an admin.");
        return;
      } else {
        // No document at all — treat as patient
        role = "patient";
      }

      console.log("Role fetched from Firestore:", role);
      if (!role) role = "patient";
      
      console.log("Final role determined:", role);
      
      // Role and userId always go to localStorage so all page guards (AdminDashboard, etc.) can read them.
      // Only "isLoggedIn" uses sessionStorage when "Remember me" is unchecked —
      // that flag clears automatically when the browser closes.
      localStorage.setItem("userRole", role);
      localStorage.setItem("userId", user.uid);
      if (rememberMe) {
        localStorage.setItem("isLoggedIn", "true");
      } else {
        sessionStorage.setItem("isLoggedIn", "true");
        localStorage.removeItem("isLoggedIn"); // ensure old "remember me" flag is gone
      }
      
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
        
        <div className="flex items-center gap-2 mb-4">
          <input
            id="rememberMe"
            type="checkbox"
            checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)}
            className="w-4 h-4 accent-[var(--primary)] cursor-pointer"
          />
          <label htmlFor="rememberMe" className="text-sm text-[var(--muted-foreground)] cursor-pointer select-none">
            Remember me
          </label>
        </div>

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
