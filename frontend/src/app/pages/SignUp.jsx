import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase"; // Make sure db is exported in firebase.js
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [role, setRole] = useState("patient"); // patient or doctor
  const [licenseNumber, setLicenseNumber] = useState(""); // For doctors
  const [specialization, setSpecialization] = useState(""); // For doctors
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSignUp(e) {
    e.preventDefault();
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user profile in Firestore
      const userData = {
        name,
        email,
        role,
        createdAt: new Date().toISOString()
      };

      if (role === "patient") {
        userData.age = age;
        userData.sex = sex;
      } else if (role === "doctor") {
        userData.licenseNumber = licenseNumber;
        userData.specialization = specialization;
      }

      // Store role in localStorage FIRST (before Firestore) - this is critical!
      localStorage.setItem("userRole", role);
      localStorage.setItem("userId", user.uid);
      localStorage.setItem("userData", JSON.stringify(userData));
      console.log("Saved to localStorage - Role:", role, "UserID:", user.uid);
      
      // Try to save to Firestore, but don't fail if it's offline
      try {
        await setDoc(doc(db, "users", user.uid), userData);
        console.log("Saved to Firestore successfully");
      } catch (firestoreError) {
        console.warn("Firestore save error (may be offline):", firestoreError);
        // Continue anyway - we've already stored in localStorage
      }

      alert(`Account created successfully! You are registered as a ${role}.`);
      navigate("/login");
    } catch (err) {
      console.error("SignUp error:", err);
      
      // Provide more helpful error messages
      let errorMessage = "Failed to create account. Please try again.";
      
      if (err.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered. Please login instead.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email address. Please enter a valid email.";
      } else if (err.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use at least 6 characters.";
      } else if (err.code === "auth/network-request-failed") {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
      <form
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200"
        onSubmit={handleSignUp}
      >
        <h1 className="text-3xl font-bold mb-2 text-center text-slate-900">Create Account</h1>
        <p className="text-sm text-slate-600 text-center mb-6">Join our healthcare platform</p>

        {error && <p className="text-red-600 text-center mb-4 p-2 bg-red-50 rounded">{error}</p>}

        {/* Role Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">I am a:</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setRole("patient")}
              className={`flex-1 py-2 px-4 rounded-lg border-2 font-semibold transition-all ${
                role === "patient"
                  ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                  : "bg-slate-50 border-slate-300 text-slate-600 hover:border-slate-400"
              }`}
            >
              Patient
            </button>
            <button
              type="button"
              onClick={() => setRole("doctor")}
              className={`flex-1 py-2 px-4 rounded-lg border-2 font-semibold transition-all ${
                role === "doctor"
                  ? "bg-blue-50 border-blue-500 text-blue-700"
                  : "bg-slate-50 border-slate-300 text-slate-600 hover:border-slate-400"
              }`}
            >
              Doctor
            </button>
          </div>
        </div>

        <input
          className="w-full p-3 border border-slate-300 rounded-lg mb-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        {role === "patient" ? (
          <>
            <input
              className="w-full p-3 border border-slate-300 rounded-lg mb-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              type="number"
              placeholder="Age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              required
            />

            <select
              className="w-full p-3 border border-slate-300 rounded-lg mb-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              required
            >
              <option value="">Select Sex</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
          </>
        ) : (
          <>
            <input
              className="w-full p-3 border border-slate-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="License Number"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              required
            />

            <select
              className="w-full p-3 border border-slate-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              required
            >
              <option value="">Select Specialization</option>
              <option value="Cardiology">Cardiology</option>
              <option value="General Practice">General Practice</option>
              <option value="Internal Medicine">Internal Medicine</option>
              <option value="Family Medicine">Family Medicine</option>
              <option value="Other">Other</option>
            </select>
          </>
        )}

        <input
          className="w-full p-3 border border-slate-300 rounded-lg mb-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="w-full p-3 border border-slate-300 rounded-lg mb-4 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          type="password"
          placeholder="Create Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />

        <button
          className={`w-full py-3 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg ${
            role === "doctor"
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
          type="submit"
        >
          Sign Up as {role === "doctor" ? "Doctor" : "Patient"}
        </button>

        <p className="text-center mt-6 text-slate-600">
          Already have an account?{" "}
          <span
            className="text-emerald-600 cursor-pointer font-semibold hover:text-emerald-700"
            onClick={() => navigate("/login")}
          >
            Login
          </span>
        </p>
      </form>
    </div>
  );
}
