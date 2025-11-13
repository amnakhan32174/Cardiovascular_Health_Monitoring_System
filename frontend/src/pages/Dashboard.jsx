import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Card from "../components/Card";
import LiveSensor from "../components/LiveSensor";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ name: "", age: "", sex: "" });

  // Load saved profile info
  useEffect(() => {
    const savedProfile = JSON.parse(localStorage.getItem("userProfile"));
    if (savedProfile) {
      setProfile(savedProfile);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    navigate("/login");
  };

  // --- 🔹 For testing (adds dummy sensor data to Firestore)
  async function addTestData() {
    try {
      await addDoc(collection(db, "sensorData"), {
        deviceId: "test-device",
        hr: Math.floor(60 + Math.random() * 40),
        spo2: Math.floor(92 + Math.random() * 8),
        sbp: 120,
        dbp: 80,
        timestamp: serverTimestamp(),
      });
      alert("✅ Test data added to Firestore!");
    } catch (err) {
      console.error("Error adding test data:", err);
    }
  }

  // Sample static data (for chart visuals only)
  const sampleData = [
    { time: 1, hr: 72, spo2: 98 },
    { time: 2, hr: 75, spo2: 97 },
    { time: 3, hr: 70, spo2: 99 },
    { time: 4, hr: 74, spo2: 98 },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <header className="mb-8 flex flex-col md:flex-row items-center justify-between bg-white p-4 rounded-xl shadow">
        <h1 className="text-3xl font-bold text-gray-800 mb-4 md:mb-0">Dashboard</h1>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-gray-700 font-medium">
            Welcome,{" "}
            <span className="text-blue-600">
              {profile.name || "User"}
            </span>{" "}
            {profile.age && profile.sex
              ? `(Age ${profile.age}, ${profile.sex})`
              : ""}
          </span>

          <button
            onClick={() => navigate("/profile")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Edit Profile
          </button>

          <button
            onClick={() => navigate("/contact-doctor")}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            Contact Doctor
          </button>

          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* 🔹 Live Sensor Data + Add Test Data Button */}
      <div className="mb-6 bg-white p-4 rounded-xl shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-700">
            Live Sensor Data
          </h2>
          <button
            onClick={addTestData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ➕ Add Test Data
          </button>
        </div>
        <LiveSensor /> {/* Shows the latest real-time reading */}
      </div>

      {/* 🔹 Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Heart Rate Chart */}
        <Card title="Heart Rate (BPM)">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={sampleData}>
              <XAxis dataKey="time" />
              <YAxis domain={[60, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="hr" stroke="#EF4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* SpO2 Chart */}
        <Card title="SpO₂ (%)">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={sampleData}>
              <XAxis dataKey="time" />
              <YAxis domain={[90, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="spo2" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Step Count */}
        <Card title="Step Count">
          <p className="text-gray-600 text-lg">Steps today: 7,542</p>
        </Card>

        {/* Blood Pressure */}
        <Card title="Blood Pressure">
          <p className="text-gray-600 text-lg">120 / 80 mmHg</p>
        </Card>
      </div>
    </div>
  );
}
