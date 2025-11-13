import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase"; // ✅ make sure path is correct
import { signInWithEmailAndPassword } from "firebase/auth";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    try {
      // ✅ Firebase Login
      await signInWithEmailAndPassword(auth, email, password);
      
      // ✅ Store login status
      localStorage.setItem("isLoggedIn", "true");
      onLogin(); // calls handleLogin in App.jsx
      
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form className="bg-white p-8 rounded-2xl shadow-md w-80" onSubmit={handleLogin}>
        <h1 className="text-2xl font-bold mb-4 text-center">Login</h1>
        
        {error && <p className="text-red-500 text-center mb-3">{error}</p>}

        <input
          className="w-full p-2 border rounded mb-3"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
        />
        <input
          className="w-full p-2 border rounded mb-3"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        
        <button className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
          Login
        </button>

        <p className="text-center mt-4">
          Don't have an account?{" "}
          <span
            className="text-blue-600 cursor-pointer"
            onClick={() => navigate("/signup")}
          >
            Sign Up
          </span>
        </p>
      </form>
    </div>
  );
}
