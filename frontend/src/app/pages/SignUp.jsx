import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase"; // Make sure db is exported in firebase.js
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, doc, getDocs, query, setDoc, where } from "firebase/firestore";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [role, setRole] = useState("patient"); // patient or doctor
  const [licenseNumber, setLicenseNumber] = useState(""); // For doctors
  const [specialization, setSpecialization] = useState(""); // For doctors
  const [assignedDoctorId, setAssignedDoctorId] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("role", "==", "doctor"));
        const snapshot = await getDocs(q);
        const doctorList = [];
        snapshot.forEach((docSnap) => {
          doctorList.push({ id: docSnap.id, ...docSnap.data() });
        });
        setDoctors(doctorList);
      } catch (err) {
        console.error("Error loading doctors:", err);
      }
    };

    loadDoctors();
  }, []);

  // Validate email format
  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate form inputs
  function validateForm() {
    const errors = {};

    // Email validation
    if (!email) {
      errors.email = "Email is required";
    } else if (!validateEmail(email)) {
      errors.email = "Invalid email address";
    }

    // Password validation
    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    // Confirm password validation
    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    // Name validation
    if (!name || name.trim().length === 0) {
      errors.name = "Full name is required";
    }

    // Terms validation
    if (!agreedToTerms) {
      errors.terms = "You must agree to the Terms & Conditions";
    }

    // Role-specific validation
    if (role === "patient") {
      if (!age || age < 1 || age > 150) {
        errors.age = "Please enter a valid age";
      }
      if (!sex) {
        errors.sex = "Please select your sex";
      }
      if (!assignedDoctorId) {
        errors.doctor = "Please select a doctor";
      }
    } else if (role === "doctor") {
      if (!licenseNumber || licenseNumber.trim().length === 0) {
        errors.license = "License number is required";
      }
      if (!specialization) {
        errors.specialization = "Please select a specialization";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSignUp(e) {
    e.preventDefault();
    
    // Clear previous errors
    setError("");
    setValidationErrors({});

    // Validate form
    if (!validateForm()) {
      setError("Please fix the errors below");
      return;
    }

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
        userData.assignedDoctorId = assignedDoctorId;
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

            <select
              className="w-full p-3 border border-slate-300 rounded-lg mb-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={assignedDoctorId}
              onChange={(e) => setAssignedDoctorId(e.target.value)}
              required
              disabled={doctors.length === 0}
            >
              <option value="">
                {doctors.length === 0 ? "No doctors available" : "Select Assigned Doctor"}
              </option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name || doctor.email || doctor.id}
                </option>
              ))}
            </select>
            {doctors.length === 0 && (
              <p className="text-xs text-amber-600 mb-2">
                No doctors found. Ask an admin to assign a doctor or create a doctor account first.
              </p>
            )}
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

        <div className="mb-3">
          <input
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition ${
              validationErrors.email ? 'border-red-500 bg-red-50' : 'border-slate-300'
            }`}
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (validationErrors.email) {
                setValidationErrors(prev => ({...prev, email: undefined}));
              }
            }}
            required
          />
          {validationErrors.email && (
            <p className="text-red-600 text-xs mt-1">{validationErrors.email}</p>
          )}
        </div>

        <div className="mb-3">
          <input
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition ${
              validationErrors.password ? 'border-red-500 bg-red-50' : 'border-slate-300'
            }`}
            type="password"
            placeholder="Create Password (min 6 characters)"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (validationErrors.password) {
                setValidationErrors(prev => ({...prev, password: undefined}));
              }
            }}
            required
            minLength={6}
          />
          {validationErrors.password && (
            <p className="text-red-600 text-xs mt-1">{validationErrors.password}</p>
          )}
        </div>

        <div className="mb-4">
          <input
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition ${
              validationErrors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-slate-300'
            }`}
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (validationErrors.confirmPassword) {
                setValidationErrors(prev => ({...prev, confirmPassword: undefined}));
              }
            }}
            required
          />
          {validationErrors.confirmPassword && (
            <p className="text-red-600 text-xs mt-1">{validationErrors.confirmPassword}</p>
          )}
        </div>

        {/* Terms and Conditions Checkbox */}
        <div className="mb-4">
          <label className={`flex items-start gap-2 cursor-pointer p-3 rounded-lg border transition ${
            validationErrors.terms ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-emerald-500'
          }`}>
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => {
                setAgreedToTerms(e.target.checked);
                if (validationErrors.terms) {
                  setValidationErrors(prev => ({...prev, terms: undefined}));
                }
              }}
              className="mt-1 w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
              required
            />
            <span className="text-sm text-slate-700">
              I agree to the{" "}
              <span className="text-emerald-600 font-semibold hover:underline">
                Terms & Conditions
              </span>{" "}
              and{" "}
              <span className="text-emerald-600 font-semibold hover:underline">
                Privacy Policy
              </span>
            </span>
          </label>
          {validationErrors.terms && (
            <p className="text-red-600 text-xs mt-1">{validationErrors.terms}</p>
          )}
        </div>

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
