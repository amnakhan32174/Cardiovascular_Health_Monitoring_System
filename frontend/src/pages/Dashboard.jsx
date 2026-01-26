import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import LiveSensor from "../components/LiveSensor";
import BloodSugarForm from "../components/forms/BloodSugarForm";
import QuestionnaireForm from "../components/forms/QuestionnaireForm";
import SnapshotButton from "../components/SnapshotButton";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ name: "", age: "", sex: "" });
  const [currentVitals, setCurrentVitals] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, forms, questionnaire

  useEffect(() => {
    const savedProfile = JSON.parse(localStorage.getItem("userProfile"));
    if (savedProfile) setProfile(savedProfile);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    navigate("/login");
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-md md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Patient Monitoring
            </p>
            <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-600 mt-1">
              Welcome, <span className="font-semibold">{profile.name || "User"}</span>{" "}
              {profile.age && profile.sex ? `· Age ${profile.age} · ${profile.sex}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate("/profile")}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Edit Profile
            </button>
            <button
              onClick={() => navigate("/contact-doctor")}
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              Contact Doctor
            </button>
            <button
              onClick={handleLogout}
              className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Tabs Navigation */}
        <div className="mb-6 flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2 font-semibold text-sm transition-colors ${
              activeTab === "dashboard"
                ? "text-emerald-600 border-b-2 border-emerald-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("forms")}
            className={`px-4 py-2 font-semibold text-sm transition-colors ${
              activeTab === "forms"
                ? "text-emerald-600 border-b-2 border-emerald-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Manual Input
          </button>
          <button
            onClick={() => setActiveTab("questionnaire")}
            className={`px-4 py-2 font-semibold text-sm transition-colors ${
              activeTab === "questionnaire"
                ? "text-emerald-600 border-b-2 border-emerald-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Health Questionnaire
          </button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <>
            {/* Live Sensor Area */}
            <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-md">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Realtime</p>
                  <h2 className="text-xl font-semibold text-slate-900">Live Sensor Data</h2>
                  <p className="text-sm text-slate-600">Streaming vitals from connected device</p>
                </div>
                <div className="flex gap-2">
                  <SnapshotButton 
                    currentVitals={currentVitals}
                    onSnapshotTaken={(snapshot) => {
                      console.log("Snapshot taken:", snapshot);
                    }}
                  />
                  <button
                    onClick={addTestData}
                    className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
                  >
                    + Add test data
                  </button>
                </div>
              </div>

              <div className="h-auto min-h-[400px]">
                <LiveSensor onVitalsUpdate={setCurrentVitals} />
              </div>
            </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-md">
            <p className="text-sm font-medium text-slate-600 mb-2">Heart Rate</p>
            <p className="text-3xl font-bold text-slate-900">
              {currentVitals?.hr || "—"}
            </p>
            <p className="text-xs text-slate-500 mt-1">BPM</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-md">
            <p className="text-sm font-medium text-slate-600 mb-2">Blood Pressure</p>
            <p className="text-3xl font-bold text-slate-900">
              {currentVitals?.sbp && currentVitals?.dbp 
                ? `${currentVitals.sbp}/${currentVitals.dbp}` 
                : "—"}
            </p>
            <p className="text-xs text-slate-500 mt-1">mmHg</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-md">
            <p className="text-sm font-medium text-slate-600 mb-2">SpO₂</p>
            <p className="text-3xl font-bold text-slate-900">
              {currentVitals?.spo2 ? `${currentVitals.spo2}%` : "—"}
            </p>
            <p className="text-xs text-slate-500 mt-1">Oxygen Saturation</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-md">
            <p className="text-sm font-medium text-slate-600 mb-2">Blood Sugar</p>
            <p className="text-3xl font-bold text-slate-900">
              {currentVitals?.blood_sugar || "—"}
            </p>
            <p className="text-xs text-slate-500 mt-1">mg/dL</p>
          </div>
        </div>
          </>
        )}

        {/* Manual Input Forms Tab */}
        {activeTab === "forms" && (
          <div className="space-y-6">
            <BloodSugarForm 
              onSuccess={() => {
                console.log("Blood sugar reading saved");
              }}
            />
          </div>
        )}

        {/* Questionnaire Tab */}
        {activeTab === "questionnaire" && (
          <QuestionnaireForm 
            onSuccess={() => {
              console.log("Questionnaire saved");
            }}
          />
        )}

      </div>
    </div>
  );
}
