import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Heart, Stethoscope, User } from "lucide-react";
import { auth, db } from "../../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [role, setRole] = useState("patient");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userData: any = {
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

      localStorage.setItem("userRole", role);
      localStorage.setItem("userId", user.uid);
      localStorage.setItem("userData", JSON.stringify(userData));
      console.log("Saved to localStorage - Role:", role, "UserID:", user.uid);
      
      try {
        await setDoc(doc(db, "users", user.uid), userData);
        console.log("Saved to Firestore successfully");
      } catch (firestoreError) {
        console.warn("Firestore save error (may be offline):", firestoreError);
      }

      alert(`Account created successfully! You are registered as a ${role}.`);
      navigate("/login");
    } catch (err: any) {
      console.error("SignUp error:", err);
      
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-rose-50 p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(244,63,94,0.1),transparent_50%)]"></div>
      
      <form
        className="relative bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border-2 border-blue-100"
        onSubmit={handleSignUp}
      >
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-gradient-to-br from-blue-500 to-rose-500 rounded-full">
            <Heart className="w-10 h-10 text-white" fill="white" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-blue-600 to-rose-600 bg-clip-text text-transparent">
          Create Account
        </h1>
        <p className="text-sm text-slate-600 text-center mb-6">
          Join our cardiovascular monitoring platform
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Role Selection */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-700 mb-2">I am a:</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole("patient")}
              className={`flex flex-col items-center gap-2 py-3 px-4 rounded-xl border-2 font-semibold transition-all ${
                role === "patient"
                  ? "bg-gradient-to-br from-rose-50 to-rose-100 border-rose-500 text-rose-700 shadow-lg"
                  : "bg-slate-50 border-slate-300 text-slate-600 hover:border-slate-400 hover:shadow-md"
              }`}
            >
              <User className="w-5 h-5" />
              <span className="text-sm">Patient</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("doctor")}
              className={`flex flex-col items-center gap-2 py-3 px-4 rounded-xl border-2 font-semibold transition-all ${
                role === "doctor"
                  ? "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-500 text-blue-700 shadow-lg"
                  : "bg-slate-50 border-slate-300 text-slate-600 hover:border-slate-400 hover:shadow-md"
              }`}
            >
              <Stethoscope className="w-5 h-5" />
              <span className="text-sm">Doctor</span>
            </button>
          </div>
        </div>

        <input
          className="w-full p-3 border-2 border-slate-200 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        {role === "patient" ? (
          <>
            <input
              className="w-full p-3 border-2 border-slate-200 rounded-lg mb-3 focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              type="number"
              placeholder="Age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              required
            />

            <select
              className="w-full p-3 border-2 border-slate-200 rounded-lg mb-3 focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
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
              className="w-full p-3 border-2 border-slate-200 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="License Number"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              required
            />

            <select
              className="w-full p-3 border-2 border-slate-200 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          className="w-full p-3 border-2 border-slate-200 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="w-full p-3 border-2 border-slate-200 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          type="password"
          placeholder="Create Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />

        <button
          className={`w-full py-3 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
            role === "doctor"
              ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              : "bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700"
          }`}
          type="submit"
        >
          Sign Up as {role === "doctor" ? "Doctor" : "Patient"}
        </button>

        <p className="text-center mt-6 text-slate-600">
          Already have an account?{" "}
          <span
            className="text-blue-600 cursor-pointer font-semibold hover:text-blue-700 hover:underline"
            onClick={() => navigate("/login")}
          >
            Login
          </span>
        </p>
      </form>
    </div>
  );
}
