import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Heart, Activity, Droplets, Droplet, MessageCircle, User, LogOut, Plus } from "lucide-react";
import Card from "../components/Card";
import LiveSensor from "../components/LiveSensor";
import BloodSugarForm from "../components/forms/BloodSugarForm";
import QuestionnaireForm from "../components/forms/QuestionnaireForm";
import SnapshotButton from "../components/SnapshotButton";
import { addDoc, collection, serverTimestamp, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ name: "", age: "", sex: "" });
  const [currentVitals, setCurrentVitals] = useState<any>(null);
  const [latestBloodSugar, setLatestBloodSugar] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    const savedProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
    if (savedProfile) setProfile(savedProfile);

    // Listen for blood sugar updates from Firebase
    const bloodSugarQuery = query(
      collection(db, "bloodSugarReadings"),
      orderBy("timestamp", "desc"),
      limit(1)
    );

    const unsubscribe = onSnapshot(bloodSugarQuery, (snapshot) => {
      if (!snapshot.empty) {
        const latestReading = snapshot.docs[0].data();
        setLatestBloodSugar(latestReading.blood_sugar);
        console.log("📊 Latest blood sugar from Firebase:", latestReading.blood_sugar);
      }
    });

    return () => unsubscribe();
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

  const displayVitals = currentVitals ? {
    ...currentVitals,
    blood_sugar: latestBloodSugar || currentVitals.blood_sugar
  } : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-rose-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.05),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(244,63,94,0.05),transparent_50%)]"></div>
      
      <div className="relative mx-auto max-w-7xl px-4 py-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 rounded-2xl border-2 border-blue-200 bg-white/80 backdrop-blur-sm px-6 py-5 shadow-xl md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-rose-500 rounded-xl">
              <Heart className="w-8 h-8 text-white" fill="white" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                CardioMonitor System
              </p>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-rose-600 bg-clip-text text-transparent">
                Patient Dashboard
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Welcome, <span className="font-semibold text-blue-600">{profile.name || "User"}</span>
                {profile.age && profile.sex ? ` · Age ${profile.age} · ${profile.sex}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2 rounded-full border-2 border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-all"
            >
              <User className="w-4 h-4" />
              Edit Profile
            </button>
            <button
              onClick={() => navigate("/contact-doctor")}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              Contact Doctor
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-full border-2 border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </header>

        {/* Tabs Navigation */}
        <div className="mb-6 flex gap-2 border-b-2 border-blue-100 bg-white/60 backdrop-blur-sm rounded-t-xl px-4">
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "forms", label: "Manual Input" },
            { id: "questionnaire", label: "Health Questionnaire" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-semibold text-sm transition-all relative ${
                activeTab === tab.id
                  ? "text-blue-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-rose-600"></div>
              )}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <>
            {/* Live Sensor Area */}
            <div className="mb-8 rounded-2xl border-2 border-blue-200 bg-white/80 backdrop-blur-sm p-6 shadow-xl">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-5 h-5 text-rose-600" />
                    <p className="text-xs uppercase tracking-wide text-rose-600 font-semibold">Realtime Monitoring</p>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Live Sensor Data</h2>
                  <p className="text-sm text-slate-600">Streaming vitals from connected device</p>
                </div>
                <div className="flex gap-2">
                  <SnapshotButton
                    currentVitals={displayVitals}
                    onSnapshotTaken={(snapshot) => {
                      console.log("Snapshot taken:", snapshot);
                    }}
                  />
                  <button
                    onClick={addTestData}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Add test data
                  </button>
                </div>
              </div>

              <div className="h-auto min-h-[400px]">
                <LiveSensor onVitalsUpdate={setCurrentVitals} />
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-2xl border-2 border-rose-200 p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-rose-200 rounded-lg">
                    <Heart className="w-6 h-6 text-rose-700" />
                  </div>
                  <p className="text-sm font-semibold text-rose-700">Heart Rate</p>
                </div>
                <p className={`text-4xl font-bold ${(displayVitals?.hr === 0 || !displayVitals?.hr) ? 'text-rose-300' : 'text-rose-700'}`}>
                  {displayVitals?.hr || "—"}
                </p>
                <p className="text-xs text-rose-600 mt-1">BPM</p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200 p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-200 rounded-lg">
                    <Activity className="w-6 h-6 text-blue-700" />
                  </div>
                  <p className="text-sm font-semibold text-blue-700">Blood Pressure</p>
                </div>
                <p className={`text-4xl font-bold ${(displayVitals?.sbp === 0 || !displayVitals?.sbp) ? 'text-blue-300' : 'text-blue-700'}`}>
                  {displayVitals?.sbp && displayVitals?.dbp
                    ? `${displayVitals.sbp}/${displayVitals.dbp}`
                    : "—"}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {displayVitals?.mean_bp ? `Mean: ${Math.round(displayVitals.mean_bp)} mmHg` : "mmHg"}
                </p>
              </div>

              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-2xl border-2 border-cyan-200 p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-cyan-200 rounded-lg">
                    <Droplets className="w-6 h-6 text-cyan-700" />
                  </div>
                  <p className="text-sm font-semibold text-cyan-700">SpO₂</p>
                </div>
                <p className={`text-4xl font-bold ${(displayVitals?.spo2 === 0 || !displayVitals?.spo2) ? 'text-cyan-300' : 'text-cyan-700'}`}>
                  {displayVitals?.spo2 ? `${displayVitals.spo2}%` : "—"}
                </p>
                <p className="text-xs text-cyan-600 mt-1">Oxygen Saturation</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border-2 border-purple-200 p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-200 rounded-lg">
                    <Droplet className="w-6 h-6 text-purple-700" />
                  </div>
                  <p className="text-sm font-semibold text-purple-700">Blood Sugar</p>
                </div>
                <p className={`text-4xl font-bold ${latestBloodSugar ? 'text-purple-700' : 'text-purple-300'}`}>
                  {latestBloodSugar || "—"}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  {latestBloodSugar ? "mg/dL (Manual)" : "Use Manual Input tab"}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Manual Input Forms Tab */}
        {activeTab === "forms" && (
          <div className="space-y-6">
            <BloodSugarForm
              onSuccess={(reading) => {
                console.log("Blood sugar reading saved:", reading);
                setLatestBloodSugar(reading.blood_sugar);
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
