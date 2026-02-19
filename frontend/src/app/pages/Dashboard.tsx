import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Heart, Activity, MessageCircle, User, LogOut, Plus } from "lucide-react";
import Card from "../components/Card";
import LiveSensor from "../components/LiveSensor";
import BloodSugarForm from "../components/forms/BloodSugarForm";
import QuestionnaireForm from "../components/forms/QuestionnaireForm";
import SnapshotButton from "../components/SnapshotButton";
import { addDoc, collection, serverTimestamp, query, orderBy, limit, onSnapshot, where, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ name: "", age: "", sex: "" });
  const [currentVitals, setCurrentVitals] = useState<any>(null);
  const [latestBloodSugar, setLatestBloodSugar] = useState<number | null>(null);
  const [bloodSugarHistory, setBloodSugarHistory] = useState<any[]>([]);
  const [assignedDoctorId, setAssignedDoctorId] = useState<string | null>(null);
  const [emergencyReason, setEmergencyReason] = useState("");
  const [sendingEmergency, setSendingEmergency] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    const savedProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
    if (savedProfile) setProfile(savedProfile);

    const patientId = localStorage.getItem("userId");
    if (!patientId) return;

    const loadAssignedDoctor = async () => {
      try {
        const savedUserData = localStorage.getItem("userData");
        if (savedUserData) {
          const parsed = JSON.parse(savedUserData);
          if (parsed?.assignedDoctorId) {
            setAssignedDoctorId(parsed.assignedDoctorId);
            return;
          }
        }
        const userDoc = await getDoc(doc(db, "users", patientId));
        if (userDoc.exists()) {
          const data: any = userDoc.data();
          setAssignedDoctorId(data.assignedDoctorId || null);
        }
      } catch (err) {
        console.error("Error loading assigned doctor:", err);
      }
    };

    loadAssignedDoctor();

    // Listen for blood sugar updates from Firebase
    const bloodSugarQuery = query(
      collection(db, "bloodSugarReadings"),
      where("patientId", "==", patientId),
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

    const historyQuery = query(
      collection(db, "bloodSugarReadings"),
      where("patientId", "==", patientId),
      orderBy("timestamp", "desc"),
      limit(20)
    );

    const unsubscribeHistory = onSnapshot(historyQuery, (snapshot) => {
      const readings: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        readings.push({
          id: doc.id,
          ...data,
          displayTime: data.timestamp?.toDate
            ? data.timestamp.toDate().toLocaleString()
            : "—"
        });
      });
      setBloodSugarHistory(readings);
    });

    return () => {
      unsubscribe();
      unsubscribeHistory();
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    navigate("/login");
  };

  const sendEmergencyAlert = async () => {
    const patientId = localStorage.getItem("userId");
    if (!patientId) {
      alert("Please log in to send an emergency alert.");
      return;
    }
    if (!assignedDoctorId) {
      alert("No assigned doctor found. Please contact support.");
      return;
    }
    if (!emergencyReason.trim()) {
      alert("Please provide a reason for the emergency alert.");
      return;
    }

    setSendingEmergency(true);
    try {
      await addDoc(collection(db, "emergencyAlerts"), {
        patientId,
        doctorId: assignedDoctorId,
        reason: emergencyReason.trim(),
        status: "open",
        createdAt: serverTimestamp()
      });
      alert("Emergency alert sent to your doctor.");
      setEmergencyReason("");
    } catch (err) {
      console.error("Error sending emergency alert:", err);
      alert("Failed to send emergency alert. Please try again.");
    } finally {
      setSendingEmergency(false);
    }
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
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] px-6 py-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[var(--primary)] rounded-xl flex items-center justify-center">
              <Heart className="w-7 h-7 text-white" fill="white" />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-[var(--primary)]">
                CardioMonitor System
              </p>
              <h1 className="text-2xl font-semibold text-[var(--foreground)]">
                Patient Dashboard
              </h1>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Welcome, <span className="font-medium text-[var(--primary)]">{profile.name || "User"}</span>
                {profile.age && profile.sex ? ` · Age ${profile.age} · ${profile.sex}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition"
            >
              <User className="w-4 h-4" />
              Edit Profile
            </button>
            <button
              onClick={() => navigate("/contact-doctor")}
              className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 transition"
            >
              <MessageCircle className="w-4 h-4" />
              Contact Doctor
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--destructive)] hover:bg-red-50 transition"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </header>

        {/* Tabs Navigation */}
        <div className="mb-6 flex gap-2 border-b border-[var(--border)] bg-[var(--card)] rounded-t-xl px-4">
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "forms", label: "Manual Input" },
            { id: "questionnaire", label: "Health Questionnaire" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium text-sm transition-all relative ${
                activeTab === tab.id
                  ? "text-[var(--primary)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]"></div>
              )}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <>
            {/* Live Sensor Area */}
            <div className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-5 h-5 text-[var(--primary)]" />
                    <p className="text-xs uppercase tracking-wide text-[var(--primary)] font-medium">Realtime Monitoring</p>
                  </div>
                  <h2 className="text-xl font-semibold text-[var(--foreground)]">Live Sensor Data</h2>
                  <p className="text-sm text-[var(--muted-foreground)]">Streaming vitals from connected device</p>
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
                    className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 transition"
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
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-[var(--muted)] rounded-lg">
                    <Activity className="w-6 h-6 text-[var(--primary)]" />
                  </div>
                  <p className="text-sm font-medium text-[var(--foreground)]">Mean Arterial Pressure</p>
                </div>
                <p className={`text-3xl font-semibold ${(displayVitals?.mean_bp === 0 || !displayVitals?.mean_bp) ? 'text-slate-400' : 'text-[var(--foreground)]'}`}>
                  {displayVitals?.mean_bp ? Math.round(displayVitals.mean_bp) : "—"}
                </p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">mmHg</p>
              </div>

              <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Activity className="w-6 h-6 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-emerald-700">Heart Rate</p>
                </div>
                <p className={`text-3xl font-semibold ${displayVitals?.hr ? "text-emerald-700" : "text-slate-400"}`}>
                  {displayVitals?.hr ?? "Waiting for device"}
                </p>
                <p className="text-xs text-emerald-600 mt-1">BPM</p>
              </div>

              <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Activity className="w-6 h-6 text-indigo-600" />
                  </div>
                  <p className="text-sm font-medium text-indigo-700">SpO2</p>
                </div>
                <p className={`text-3xl font-semibold ${displayVitals?.spo2 ? "text-indigo-700" : "text-slate-400"}`}>
                  {displayVitals?.spo2 ?? "Waiting for device"}
                </p>
                <p className="text-xs text-indigo-600 mt-1">%</p>
              </div>

              <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-rose-100 rounded-lg">
                    <Activity className="w-6 h-6 text-rose-600" />
                  </div>
                  <p className="text-sm font-medium text-rose-700">Latest Blood Sugar</p>
                </div>
                <p className={`text-3xl font-semibold ${latestBloodSugar ? "text-rose-700" : "text-slate-400"}`}>
                  {latestBloodSugar ?? "N/A"}
                </p>
                <p className="text-xs text-rose-600 mt-1">mg/dL</p>
              </div>

              <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Blood Sugar History</h3>
                {bloodSugarHistory.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">No readings yet.</p>
                ) : (
                  <div className="space-y-2">
                    {bloodSugarHistory.map((reading) => (
                      <div key={reading.id} className="flex items-center justify-between border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--muted)]">
                        <div>
                          <p className="text-sm font-medium text-[var(--foreground)]">{reading.blood_sugar} mg/dL</p>
                          <p className="text-xs text-[var(--muted-foreground)]">{reading.displayTime}</p>
                        </div>
                        <span className="text-xs font-medium text-[var(--muted-foreground)] capitalize">{reading.meal_timing?.replace("_", " ")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[var(--card)] rounded-xl border border-red-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-red-700 mb-2">Emergency</h3>
                <p className="text-xs text-[var(--muted-foreground)] mb-4">
                  Send an urgent alert to your assigned doctor with a reason.
                </p>
                <textarea
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  className="w-full p-3 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition resize-none mb-3 bg-[var(--input-background)]"
                  placeholder="Describe the emergency reason..."
                  rows={3}
                />
                <button
                  onClick={sendEmergencyAlert}
                  disabled={sendingEmergency}
                  className="w-full py-3 bg-[var(--destructive)] text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 transition shadow-sm"
                >
                  {sendingEmergency ? "Sending..." : "Emergency: Contact Doctor"}
                </button>
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

