// src/app/pages/Dashboard.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Heart, Activity, MessageCircle, Plus, AlertTriangle, Send } from "lucide-react";
import SidebarLayout from "../components/Sidebar";
import LiveSensor from "../components/LiveSensor";
import PCGTestResults from "../components/PCGTestResults";
import BloodSugarForm from "../components/forms/BloodSugarForm";
import QuestionnaireForm from "../components/forms/QuestionnaireForm";
import SnapshotButton from "../components/SnapshotButton";
import RecordingPanel from "../components/RecordingPanel";
import {
  addDoc, collection, serverTimestamp, query, orderBy,
  limit, onSnapshot, where, doc, getDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../../firebase";

// ── Tab definition ────────────────────────────────────────────────────────────
const TABS = [
  { id: "dashboard",     label: "Live Dashboard" },
  { id: "forms",         label: "Blood Sugar" },
  { id: "questionnaire", label: "Questionnaire" },
  { id: "pcg",           label: "PCG Results" },
];

// ── Sparkline mini-chart ──────────────────────────────────────────────────────
function Sparkline({ data, color = "rose" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) {
    return <div className="h-8 mt-2 border-t border-[var(--border)] opacity-30" />;
  }
  const W = 100; const H = 32;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => `${((i / (data.length - 1)) * W).toFixed(1)},${(H - ((v - min) / range) * H * 0.75 - H * 0.1).toFixed(1)}`)
    .join(" ");
  const strokeMap: Record<string, string> = {
    rose: "#f43f5e", emerald: "#10b981", indigo: "#6366f1", amber: "#f59e0b", violet: "#7c3aed",
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-8 mt-2" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={strokeMap[color] ?? "#f43f5e"} strokeWidth="1.5" strokeLinejoin="round" opacity="0.65" />
    </svg>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, unit, color = "rose", sublabel, sparkData }: any) {
  const colors: Record<string, string> = {
    rose:    "from-rose-500 to-rose-600",
    emerald: "from-emerald-500 to-emerald-600",
    indigo:  "from-indigo-500 to-indigo-600",
    amber:   "from-amber-500 to-amber-600",
    violet:  "from-violet-500 to-violet-600",
  };
  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} mb-3 shadow-sm`}>
        <Activity className="w-5 h-5 text-white" />
      </div>
      <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${value ? "text-[var(--foreground)]" : "text-slate-300"}`}>
        {value ?? "—"}
      </p>
      <p className="text-xs text-[var(--muted-foreground)] mt-1">{unit}{sublabel ? ` · ${sublabel}` : ""}</p>
      <Sparkline data={sparkData ?? []} color={color} />
    </div>
  );
}

export default function Dashboard() {
  const navigate          = useNavigate();
  const [searchParams]    = useSearchParams();
  const [profile, setProfile]               = useState({ name: "", age: "", sex: "" });
  const [currentVitals, setCurrentVitals]   = useState<any>(null);
  const [latestBloodSugar, setLatestBloodSugar] = useState<number | null>(null);
  const [bloodSugarHistory, setBloodSugarHistory] = useState<any[]>([]);
  const [vitalsHistory, setVitalsHistory]           = useState<any[]>([]);
  const [sensorHistory, setSensorHistory]           = useState<any[]>([]);
  const [assignedDoctorId, setAssignedDoctorId]   = useState<string | null>(null);
  const [emergencyReason, setEmergencyReason]     = useState("");
  const [sendingEmergency, setSendingEmergency]   = useState(false);
  const [emergencySent, setEmergencySent]         = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "dashboard");

  // Sync active tab when URL changes (e.g. sidebar navigation)
  useEffect(() => {
    setActiveTab(searchParams.get("tab") || "dashboard");
  }, [searchParams]);

  useEffect(() => {
    const savedProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
    if (savedProfile) setProfile(savedProfile);

    let unsub1: (() => void) | null = null;
    let unsub2: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // Auth token expired or invalid — clear stale session and redirect to login
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("userId");
        localStorage.removeItem("userRole");
        localStorage.removeItem("userData");
        localStorage.removeItem("userProfile");
        navigate("/login");
        return;
      }

      const patientId = user.uid;
      localStorage.setItem("userId", patientId);

      // Load assigned doctor
      const loadAssignedDoctor = async () => {
        try {
          const saved = localStorage.getItem("userData");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.assignedDoctorId) { setAssignedDoctorId(parsed.assignedDoctorId); return; }
          }
          const userDoc = await getDoc(doc(db, "users", patientId));
          if (userDoc.exists()) {
            const data: any = userDoc.data();
            setAssignedDoctorId(data.assignedDoctorId || null);
          }
        } catch (err) { console.error(err); }
      };
      loadAssignedDoctor();

      // Sensor readings history from backend
      const fetchSensorHistory = async () => {
        try {
          const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL || "http://localhost:5000";
          const res = await fetch(`${backendUrl}/api/patient-readings/${patientId}?limit=10`);
          if (res.ok) {
            const data = await res.json();
            if (data.ok && Array.isArray(data.readings)) setSensorHistory(data.readings);
          }
        } catch { /* backend may not be running */ }
      };
      fetchSensorHistory();

      // Blood sugar live listener
      const bsQuery = query(
        collection(db, "bloodSugarReadings"),
        where("patientId", "==", patientId),
        orderBy("timestamp", "desc"), limit(1)
      );
      unsub1 = onSnapshot(bsQuery, snap => {
        if (!snap.empty) setLatestBloodSugar(snap.docs[0].data().blood_sugar);
      });

      const histQuery = query(
        collection(db, "bloodSugarReadings"),
        where("patientId", "==", patientId),
        orderBy("timestamp", "desc"), limit(20)
      );
      unsub2 = onSnapshot(histQuery, snap => {
        const readings: any[] = [];
        snap.forEach(d => {
          const data = d.data();
          readings.push({
            id: d.id, ...data,
            displayTime: data.timestamp?.toDate ? data.timestamp.toDate().toLocaleString() : "—"
          });
        });
        setBloodSugarHistory(readings);
      });
    });

    return () => {
      unsubAuth();
      unsub1?.();
      unsub2?.();
    };
  }, [navigate]);

  const sendEmergencyAlert = async () => {
    const patientId = localStorage.getItem("userId");
    if (!patientId || !assignedDoctorId) {
      alert("No assigned doctor found."); return;
    }
    if (!emergencyReason.trim()) { alert("Please provide a reason."); return; }
    setSendingEmergency(true);
    try {
      await addDoc(collection(db, "emergencyAlerts"), {
        patientId, doctorId: assignedDoctorId,
        reason: emergencyReason.trim(),
        status: "open", createdAt: serverTimestamp()
      });
      setEmergencySent(true);
      setEmergencyReason("");
      setTimeout(() => setEmergencySent(false), 4000);
    } catch (err) {
      alert("Failed to send alert.");
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
        sbp: 120, dbp: 80,
        timestamp: serverTimestamp(),
      });
      alert("✅ Test data added!");
    } catch (err) { console.error(err); }
  }

  const handleVitalsUpdate = (v: any) => {
    setCurrentVitals(v);
    setVitalsHistory(prev => [...prev, v].slice(-20));
    // Add live reading to sensor history display (prepend)
    setSensorHistory(prev => [
      { ...v, displayTime: new Date().toLocaleString() },
      ...prev
    ].slice(0, 10));
  };

  const displayVitals = currentVitals
    ? { ...currentVitals, blood_sugar: latestBloodSugar || currentVitals.blood_sugar }
    : null;

  return (
    <SidebarLayout role="patient">
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* ── Page header ────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-rose-500 uppercase tracking-widest mb-1">
              Patient Dashboard
            </p>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              Welcome back, {profile.name || "Patient"}
            </h1>
            {profile.age && profile.sex && (
              <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                Age {profile.age} · {profile.sex}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SnapshotButton currentVitals={displayVitals} />
            <button
              onClick={addTestData}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition border border-[var(--border)]"
            >
              <Plus className="w-4 h-4" />
              Test Data
            </button>
          </div>
        </div>

        {/* ── Quick stats row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Heart Rate"  value={displayVitals?.hr}   unit="BPM"   color="rose"   sublabel={displayVitals?.hr ? (displayVitals.hr < 60 ? "Low" : displayVitals.hr > 100 ? "High" : "Normal") : ""} sparkData={vitalsHistory.map((v: any) => v.hr).filter(Boolean)} />
          <StatCard label="SpO₂"        value={displayVitals?.spo2} unit="%"     color="indigo"                                                                                                                     sparkData={vitalsHistory.map((v: any) => v.spo2).filter(Boolean)} />
          <StatCard label="Mean BP"     value={displayVitals?.mean_bp ? Math.round(displayVitals.mean_bp) : null} unit="mmHg" color="violet"                                                                       sparkData={vitalsHistory.map((v: any) => v.mean_bp).filter(Boolean)} />
          <StatCard label="Blood Sugar" value={latestBloodSugar}    unit="mg/dL" color="amber"                                                                                                                     sparkData={bloodSugarHistory.map((r: any) => r.blood_sugar).filter(Boolean).slice(0, 20).reverse()} />
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 p-1 bg-[var(--muted)] rounded-2xl border border-[var(--border)] w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-[var(--card)] text-rose-600 shadow-sm border border-[var(--border)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Dashboard tab ──────────────────────────────────────────────────── */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Manual recording buttons */}
            <RecordingPanel />

            {/* Live sensor */}
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <h2 className="text-base font-semibold text-[var(--foreground)]">Live Sensor Data</h2>
                <span className="text-xs text-[var(--muted-foreground)] ml-auto">Real-time streaming</span>
              </div>
              <LiveSensor onVitalsUpdate={handleVitalsUpdate} />
            </div>

            {/* Blood sugar history */}
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 shadow-sm">
              <h3 className="text-base font-semibold text-[var(--foreground)] mb-4">Blood Sugar History</h3>
              {bloodSugarHistory.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">No readings yet. Add one in the Blood Sugar tab.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {bloodSugarHistory.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
                      <div>
                        <p className="text-sm font-semibold text-[var(--foreground)]">{r.blood_sugar} mg/dL</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{r.displayTime}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        r.blood_sugar > 180 ? "bg-red-100 text-red-700"
                        : r.blood_sugar < 70 ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {r.meal_timing?.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sensor readings history */}
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 shadow-sm">
              <h3 className="text-base font-semibold text-[var(--foreground)] mb-4">Sensor Readings History</h3>
              {sensorHistory.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">No stored readings yet. Connect your ESP32 device to start recording.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide border-b border-[var(--border)]">
                        <th className="pb-2 pr-4">Time</th>
                        <th className="pb-2 pr-4">HR (BPM)</th>
                        <th className="pb-2 pr-4">SpO₂ (%)</th>
                        <th className="pb-2 pr-4">BP (mmHg)</th>
                        <th className="pb-2">Heart Sound</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {sensorHistory.map((r: any, i: number) => (
                        <tr key={r.id || i} className="hover:bg-[var(--muted)] transition-colors">
                          <td className="py-2 pr-4 text-[var(--muted-foreground)] whitespace-nowrap">
                            {r.displayTime || (r.timestamp ? new Date(r.timestamp).toLocaleString() : "—")}
                          </td>
                          <td className="py-2 pr-4 font-medium text-rose-600">{r.hr ?? "—"}</td>
                          <td className="py-2 pr-4 font-medium text-indigo-600">{r.spo2 ?? "—"}</td>
                          <td className="py-2 pr-4 font-medium text-violet-600">
                            {r.sbp && r.dbp ? `${r.sbp}/${r.dbp}` : "—"}
                          </td>
                          <td className="py-2">
                            {r.heart_rate_type ? (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                r.heart_rate_type === "N" ? "bg-emerald-100 text-emerald-700"
                                : r.heart_rate_type === "AS" ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                              }`}>{r.heart_rate_type}</span>
                            ) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Emergency */}
            <div className="bg-[var(--card)] rounded-2xl border border-red-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-red-700">Emergency Alert</h3>
                  <p className="text-xs text-[var(--muted-foreground)]">Send urgent notification to your doctor</p>
                </div>
              </div>

              {emergencySent && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-sm text-emerald-700 font-medium">✓ Emergency alert sent successfully</p>
                </div>
              )}

              <textarea
                value={emergencyReason}
                onChange={e => setEmergencyReason(e.target.value)}
                className="w-full p-3 border border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none mb-3 bg-[var(--input-background)] text-sm"
                placeholder="Describe your emergency..."
                rows={3}
              />

              <div className="flex items-center gap-3">
                <button
                  onClick={sendEmergencyAlert}
                  disabled={sendingEmergency || !emergencyReason.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 disabled:opacity-50 transition shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  {sendingEmergency ? "Sending..." : "Send Emergency Alert"}
                </button>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {assignedDoctorId ? "Doctor will be notified immediately" : "No doctor assigned yet"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Blood Sugar tab ────────────────────────────────────────────────── */}
        {activeTab === "forms" && (
          <BloodSugarForm
            onSuccess={r => setLatestBloodSugar(r.blood_sugar)}
          />
        )}

        {/* ── Questionnaire tab ──────────────────────────────────────────────── */}
        {activeTab === "questionnaire" && (
          <QuestionnaireForm onSuccess={() => {}} />
        )}

        {/* ── PCG tab ────────────────────────────────────────────────────────── */}
        {activeTab === "pcg" && (
          <PCGTestResults />
        )}

      </div>
    </SidebarLayout>
  );
}