// src/app/pages/DoctorDashboard.tsx
// Doctor dashboard with Firestore-backed patient vitals history.
// Uses GET /api/patient-readings/:patientId to fetch readings per patient.

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Users, Activity, AlertTriangle, RefreshCw, MessageCircle, Bell, Stethoscope } from "lucide-react";
import { collection, query, getDocs, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import SidebarLayout from "../components/Sidebar";
import LiveSensor from "../components/LiveSensor";
import io from "socket.io-client";

const SOCKET_URL   = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
const BACKEND_URL  = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const HS_LABELS: Record<string, string> = {
  N: "Normal", AS: "Aortic Stenosis", MR: "Mitral Regurgitation",
  MS: "Mitral Stenosis", MVP: "Mitral Valve Prolapse",
};

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const doctorId = localStorage.getItem("userId");

  const [patients,          setPatients]          = useState<any[]>([]);
  const [selectedPatient,   setSelectedPatient]   = useState<any>(null);
  const [patientVitals,     setPatientVitals]     = useState<any>({});       // live socket vitals
  const [patientHistory,    setPatientHistory]    = useState<any[]>([]);     // Firestore history
  const [historyLoading,    setHistoryLoading]    = useState(false);
  const [emergencyAlerts,   setEmergencyAlerts]   = useState<any[]>([]);
  const [questionnaire,     setQuestionnaire]     = useState<any>(null);
  const [qLoading,          setQLoading]          = useState(false);
  const [unreadByPatient,   setUnreadByPatient]   = useState<Record<string, number>>({});
  const [loading,           setLoading]           = useState(true);
  const [searchTerm,        setSearchTerm]        = useState("");
  const [activeView,        setActiveView]        = useState("vitals");
  const [error,             setError]             = useState<string | null>(null);
  const [showAlerts,        setShowAlerts]        = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "doctor") { navigate(role === "patient" ? "/dashboard" : "/login"); return; }
    if (!doctorId) { navigate("/login"); return; }
    loadPatients();
    const u1 = setupUnreadListener();
    const u2 = setupEmergencyListener();
    const u3 = setupSocketConnection();
    return () => { u1?.(); u2?.(); u3?.(); };
  }, []);

  // Load questionnaire when patient changes
  useEffect(() => {
    if (!selectedPatient?.id) { setQuestionnaire(null); setPatientHistory([]); return; }
    loadQuestionnaire(selectedPatient.id);
    loadPatientHistory(selectedPatient.id);
  }, [selectedPatient]);

  const loadPatients = async () => {
    try {
      setError(null);
      const snap = await getDocs(query(
        collection(db, "users"),
        where("role", "==", "patient"),
        where("assignedDoctorId", "==", doctorId)
      ));
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setPatients(list);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadQuestionnaire = async (patientId: string) => {
    setQLoading(true);
    try {
      const snap = await getDocs(query(
        collection(db, "healthQuestionnaires"),
        where("patientId", "==", patientId),
        orderBy("timestamp", "desc"), limit(1)
      ));
      setQuestionnaire(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() });
    } catch { setQuestionnaire(null); }
    finally { setQLoading(false); }
  };

  // Fetch patient's sensor reading history from Firestore via backend
  const loadPatientHistory = async (patientId: string) => {
    setHistoryLoading(true);
    try {
      const res  = await fetch(`${BACKEND_URL}/api/patient-readings/${patientId}?limit=10`);
      const json = await res.json();
      if (json.ok) setPatientHistory(json.readings || []);
      else setPatientHistory([]);
    } catch {
      setPatientHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const setupSocketConnection = () => {
    const socket = io(SOCKET_URL);
    const handle = (data: any) => {
      if (data.deviceId?.startsWith("patient-")) {
        const pid = data.deviceId.replace("patient-", "");
        setPatientVitals((prev: any) => ({ ...prev, [pid]: data }));
      }
      // Also update by patientId field
      if (data.patientId) {
        setPatientVitals((prev: any) => ({ ...prev, [data.patientId]: data }));
      }
    };
    socket.on("new_reading", handle);
    socket.on("newReading",  handle);
    return () => { socket.disconnect(); };
  };

  const setupUnreadListener = () => {
    if (!doctorId) return;
    return onSnapshot(
      query(collection(db, "chatMessages"), where("doctorId", "==", doctorId), where("readByDoctor", "==", false)),
      snap => {
        const counts: Record<string, number> = {};
        snap.forEach(d => {
          const data: any = d.data();
          if (data.sender !== "Patient" || !data.patientId) return;
          counts[data.patientId] = (counts[data.patientId] || 0) + 1;
        });
        setUnreadByPatient(counts);
      }
    );
  };

  const setupEmergencyListener = () => {
    if (!doctorId) return;
    return onSnapshot(
      query(collection(db, "emergencyAlerts"), where("doctorId", "==", doctorId), orderBy("createdAt", "desc"), limit(10)),
      snap => {
        const alerts: any[] = [];
        snap.forEach(d => {
          const data = d.data();
          alerts.push({ id: d.id, ...data, displayTime: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : "N/A" });
        });
        setEmergencyAlerts(alerts);
      }
    );
  };

  const filtered     = patients.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalUnread  = Object.values(unreadByPatient).reduce((a, b) => a + b, 0);

  return (
    <SidebarLayout role="doctor">
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rose-500 uppercase tracking-widest mb-1">Doctor Portal</p>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Patient Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAlerts(!showAlerts)} className="relative p-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl hover:bg-[var(--muted)] transition">
              <Bell className="w-5 h-5 text-[var(--muted-foreground)]" />
              {emergencyAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{emergencyAlerts.length}</span>
              )}
            </button>
            <button onClick={loadPatients} className="p-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl hover:bg-[var(--muted)] transition">
              <RefreshCw className="w-5 h-5 text-[var(--muted-foreground)]" />
            </button>
          </div>
        </div>

        {/* Emergency panel */}
        {showAlerts && emergencyAlerts.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <h3 className="text-base font-semibold text-red-700 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Emergency Alerts
            </h3>
            <div className="space-y-2">
              {emergencyAlerts.map(alert => {
                const patient = patients.find(p => p.id === alert.patientId);
                return (
                  <div key={alert.id} className="flex items-start justify-between p-3 bg-white border border-red-100 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">{patient?.name || "Unknown Patient"}</p>
                      <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{alert.reason}</p>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <p className="text-xs text-red-600 font-medium">{alert.displayTime}</p>
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{alert.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Patients",    value: patients.length,                   color: "text-rose-500",    bg: "bg-rose-50",    icon: <Users className="w-5 h-5" />        },
            { label: "Active Monitoring", value: Object.keys(patientVitals).length, color: "text-emerald-600", bg: "bg-emerald-50", icon: <Activity className="w-5 h-5" />     },
            { label: "Emergencies",       value: emergencyAlerts.length,            color: "text-amber-600",   bg: "bg-amber-50",   icon: <AlertTriangle className="w-5 h-5" /> },
            { label: "Unread Messages",   value: totalUnread,                       color: "text-indigo-600",  bg: "bg-indigo-50",  icon: <MessageCircle className="w-5 h-5" /> },
          ].map(s => (
            <div key={s.label} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
              <div className={`inline-flex p-2 ${s.bg} rounded-xl mb-3`}><span className={s.color}>{s.icon}</span></div>
              <p className="text-2xl font-bold text-[var(--foreground)]">{s.value}</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Patient list */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[var(--foreground)]">My Patients</h2>
              <span className="text-xs text-[var(--muted-foreground)]">{filtered.length}</span>
            </div>
            <input
              type="text" placeholder="Search..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full p-2.5 border border-[var(--border)] rounded-xl mb-3 text-sm bg-[var(--input-background)] focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-[var(--muted-foreground)]">Loading…</p>
                </div>
              ) : error ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs text-red-600">{error}</p>
                  <button onClick={loadPatients} className="mt-2 text-xs text-red-600 underline">Retry</button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-[var(--muted-foreground)]">No patients found</p>
                </div>
              ) : filtered.map(patient => {
                const vitals = patientVitals[patient.id];
                const unread = unreadByPatient[patient.id] || 0;
                const hs     = vitals?.heart_rate_type;
                return (
                  <button key={patient.id} onClick={() => setSelectedPatient(patient)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedPatient?.id === patient.id
                        ? "bg-rose-50 border-rose-300 shadow-sm"
                        : "bg-[var(--muted)] border-[var(--border)] hover:border-rose-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {patient.name?.[0]?.toUpperCase() || "P"}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--foreground)]">{patient.name || "Unknown"}</p>
                          <p className="text-xs text-[var(--muted-foreground)] truncate max-w-[130px]">{patient.email}</p>
                        </div>
                      </div>
                      {unread > 0 && (
                        <span className="w-5 h-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{unread}</span>
                      )}
                    </div>
                    {vitals && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          vitals.hr > 100 ? "bg-red-100 text-red-700" : vitals.hr < 60 ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                        }`}>HR {vitals.hr} bpm</span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">SpO₂ {vitals.spo2}%</span>
                        {hs && <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${hs === "N" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{hs}</span>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Patient detail */}
          <div className="lg:col-span-2 space-y-4">
            {selectedPatient ? (
              <>
                {/* Patient header card */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                        {selectedPatient.name?.[0]?.toUpperCase() || "P"}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-[var(--foreground)]">{selectedPatient.name || "Unknown"}</h2>
                        <p className="text-sm text-[var(--muted-foreground)]">{selectedPatient.email}</p>
                        <div className="flex gap-3 mt-1 text-xs text-[var(--muted-foreground)]">
                          {selectedPatient.age && <span>Age {selectedPatient.age}</span>}
                          {selectedPatient.sex && <span>{selectedPatient.sex}</span>}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/doctor-chat/${selectedPatient.id}`)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-rose-500 text-white rounded-xl font-semibold text-sm hover:bg-rose-600 transition shadow-sm"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Chat
                      {(unreadByPatient[selectedPatient.id] || 0) > 0 && (
                        <span className="w-5 h-5 bg-white text-rose-600 text-xs rounded-full flex items-center justify-center font-bold">
                          {unreadByPatient[selectedPatient.id]}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Latest live vitals snapshot */}
                  {patientVitals[selectedPatient.id] && (() => {
                    const v = patientVitals[selectedPatient.id];
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-[var(--muted)] rounded-xl border border-[var(--border)] mb-4">
                        {[
                          { label: "HR",          value: v.hr ? `${v.hr} bpm` : "—",           color: v.hr > 100 ? "text-red-600" : v.hr < 60 ? "text-blue-600" : "text-emerald-600" },
                          { label: "SpO₂",        value: v.spo2 ? `${v.spo2}%` : "—",          color: "text-indigo-600" },
                          { label: "BP",          value: v.sbp && v.dbp ? `${v.sbp}/${v.dbp}` : "—", color: "text-rose-600" },
                          { label: "Heart Sound", value: v.heart_rate_type ? `${v.heart_rate_type} — ${HS_LABELS[v.heart_rate_type] || v.heart_rate_type}` : "—", color: v.heart_rate_type === "N" ? "text-emerald-600" : "text-amber-600" },
                        ].map(item => (
                          <div key={item.label}>
                            <p className="text-xs text-[var(--muted-foreground)] mb-0.5">{item.label}</p>
                            <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* View tabs */}
                  <div className="flex gap-1 p-1 bg-[var(--muted)] rounded-xl border border-[var(--border)] w-fit">
                    {["vitals", "history", "records"].map(v => (
                      <button key={v} onClick={() => setActiveView(v)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          activeView === v
                            ? "bg-[var(--card)] text-rose-600 shadow-sm border border-[var(--border)]"
                            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        {v === "vitals" ? "Live Vitals" : v === "history" ? "History" : "Records"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live vitals */}
                {activeView === "vitals" && (
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm p-6">
                    <h3 className="text-base font-semibold text-[var(--foreground)] mb-4">Real-Time Vitals</h3>
                    <LiveSensor deviceId={`patient-${selectedPatient.id}`} />
                  </div>
                )}

                {/* Firestore history */}
                {activeView === "history" && (
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-[var(--foreground)]">Vitals History</h3>
                      <button onClick={() => loadPatientHistory(selectedPatient.id)} className="text-xs text-rose-500 hover:underline flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Refresh
                      </button>
                    </div>
                    {historyLoading ? (
                      <div className="text-center py-8">
                        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-xs text-[var(--muted-foreground)]">Loading history…</p>
                      </div>
                    ) : patientHistory.length === 0 ? (
                      <div className="text-center py-8">
                        <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-[var(--muted-foreground)]">No readings yet</p>
                        <p className="text-xs text-slate-400 mt-1">Readings appear here after the patient opens their dashboard and the ESP32 sends data.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {patientHistory.map((r: any, i: number) => (
                          <div key={r.id || i} className="p-3 bg-[var(--muted)] rounded-xl border border-[var(--border)]">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-[var(--muted-foreground)]">
                                {r.timestamp ? new Date(r.timestamp).toLocaleString() : "—"}
                              </p>
                              {r.heart_rate_type && (
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  r.heart_rate_type === "N" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                }`}>{r.heart_rate_type} — {HS_LABELS[r.heart_rate_type] || r.heart_rate_type}</span>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div><span className="text-[var(--muted-foreground)]">HR </span><span className="font-semibold">{r.hr ?? "—"} bpm</span></div>
                              <div><span className="text-[var(--muted-foreground)]">SpO₂ </span><span className="font-semibold">{r.spo2 ?? "—"}%</span></div>
                              <div><span className="text-[var(--muted-foreground)]">BP </span><span className="font-semibold">{r.sbp && r.dbp ? `${r.sbp}/${r.dbp}` : "—"}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Records */}
                {activeView === "records" && (
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm p-6">
                    <h3 className="text-base font-semibold text-[var(--foreground)] mb-4">Health Records</h3>
                    <div className="p-4 bg-[var(--muted)] rounded-xl border border-[var(--border)]">
                      <p className="text-sm font-semibold text-[var(--foreground)] mb-3">Health Questionnaire</p>
                      {qLoading ? <p className="text-xs text-[var(--muted-foreground)]">Loading…</p>
                      : !questionnaire ? <p className="text-xs text-[var(--muted-foreground)]">No questionnaire submitted.</p>
                      : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="space-y-1.5">
                            <p className="font-semibold text-[var(--muted-foreground)] mb-2">Conditions</p>
                            {[["Hypertension", questionnaire.has_hypertension], ["Diabetes", questionnaire.has_diabetes], ["Heart Disease", questionnaire.has_heart_disease], ["High Cholesterol", questionnaire.has_high_cholesterol]].map(([l, v]) => (
                              <div key={l as string} className="flex justify-between">
                                <span>{l}</span>
                                <span className={`font-semibold ${v ? "text-red-600" : "text-emerald-600"}`}>{v ? "Yes" : "No"}</span>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-1.5">
                            <p className="font-semibold text-[var(--muted-foreground)] mb-2">Lifestyle</p>
                            <div className="flex justify-between"><span>Smoking</span><span className="font-medium capitalize">{questionnaire.smoking_status || "—"}</span></div>
                            <div className="flex justify-between"><span>Exercise</span><span className="font-medium">{questionnaire.exercise_frequency || "—"}</span></div>
                            <div className="flex justify-between"><span>Family History</span><span className={`font-semibold ${questionnaire.family_history ? "text-amber-600" : "text-emerald-600"}`}>{questionnaire.family_history ? "Yes" : "No"}</span></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm p-12 text-center">
                <div className="w-20 h-20 bg-rose-50 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <Users className="w-10 h-10 text-rose-300" />
                </div>
                <p className="text-lg font-semibold text-[var(--foreground)] mb-2">Select a patient</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {patients.length === 0 ? "No patients assigned yet." : "Choose a patient to view their vitals and records."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}