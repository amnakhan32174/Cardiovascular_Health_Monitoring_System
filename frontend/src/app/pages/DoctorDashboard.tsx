import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Users, Activity, AlertTriangle, Calendar, User, LogOut, RefreshCw, MessageCircle, Stethoscope } from "lucide-react";
import { collection, query, getDocs, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import LiveSensor from "../components/LiveSensor";
import io from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const doctorId = localStorage.getItem("userId");
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientVitals, setPatientVitals] = useState<any>({});
  const [emergencyAlerts, setEmergencyAlerts] = useState<any[]>([]);
  const [questionnaire, setQuestionnaire] = useState<any>(null);
  const [questionnaireLoading, setQuestionnaireLoading] = useState(false);
  const [unreadByPatient, setUnreadByPatient] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeView, setActiveView] = useState("vitals");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "doctor") {
      navigate(role === "patient" ? "/dashboard" : "/login");
      return;
    }
    if (!doctorId) {
      navigate("/login");
      return;
    }

    loadPatients();
    const unsubscribeUnread = setupUnreadListener();
    const unsubscribeEmergency = setupEmergencyListener();
    const socketCleanup = setupSocketConnection();
    return () => {
      if (unsubscribeUnread) unsubscribeUnread();
      if (unsubscribeEmergency) unsubscribeEmergency();
      if (socketCleanup) socketCleanup();
    };
  }, []);

  useEffect(() => {
    if (!selectedPatient?.id) {
      setQuestionnaire(null);
      return;
    }

    const loadQuestionnaire = async () => {
      try {
        setQuestionnaireLoading(true);
        const questionnairesRef = collection(db, "healthQuestionnaires");
        const q = query(
          questionnairesRef,
          where("patientId", "==", selectedPatient.id),
          orderBy("timestamp", "desc"),
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          setQuestionnaire({ id: doc.id, ...doc.data() });
        } else {
          setQuestionnaire(null);
        }
      } catch (err) {
        console.error("Error loading questionnaire:", err);
        setQuestionnaire(null);
      } finally {
        setQuestionnaireLoading(false);
      }
    };

    loadQuestionnaire();
  }, [selectedPatient]);

  const loadPatients = async () => {
    try {
      setError(null);
      const usersRef = collection(db, "users");
      const q = query(
        usersRef,
        where("role", "==", "patient"),
        where("assignedDoctorId", "==", doctorId)
      );
      const querySnapshot = await getDocs(q);

      const patientsList: any[] = [];
      querySnapshot.forEach((doc) => {
        patientsList.push({ id: doc.id, ...doc.data() });
      });

      console.log(`Loaded ${patientsList.length} patients`);

      const vitalsMap: any = {};
      for (const patient of patientsList) {
        try {
          const vitalsRef = collection(db, "sensorData");
          const vitalsQuery = query(
            vitalsRef,
            where("deviceId", "==", `patient-${patient.id}`),
            orderBy("timestamp", "desc"),
            limit(1)
          );
          const vitalsSnapshot = await getDocs(vitalsQuery);
          if (!vitalsSnapshot.empty) {
            vitalsMap[patient.id] = vitalsSnapshot.docs[0].data();
          }
        } catch (e) {
          console.error(`Error loading vitals for patient ${patient.id}:`, e);
        }
      }

      setPatients(patientsList);
      setPatientVitals(vitalsMap);
    } catch (error: any) {
      console.error("Error loading patients:", error);
      setError(error.message || "Failed to load patients. Make sure Firestore is enabled.");
    } finally {
      setLoading(false);
    }
  };

  const setupSocketConnection = () => {
    const socket = io(SOCKET_URL);

    socket.on("connect", () => {
      console.log("Socket connected for doctor dashboard");
    });

    socket.on("newReading", (data) => {
      if (data.deviceId && data.deviceId.startsWith("patient-")) {
        const patientId = data.deviceId.replace("patient-", "");
        setPatientVitals((prev: any) => ({
          ...prev,
          [patientId]: data
        }));
      }
    });

    socket.on("new_reading", (data) => {
      if (data.deviceId && data.deviceId.startsWith("patient-")) {
        const patientId = data.deviceId.replace("patient-", "");
        setPatientVitals((prev: any) => ({
          ...prev,
          [patientId]: data
        }));
      }
    });

    return () => {
      socket.disconnect();
    };
  };

  const setupUnreadListener = () => {
    if (!doctorId) return;
    const chatRef = collection(db, "chatMessages");
    const q = query(
      chatRef,
      where("doctorId", "==", doctorId),
      where("readByDoctor", "==", false)
    );

    return onSnapshot(q, (snapshot) => {
      const counts: Record<string, number> = {};
      snapshot.forEach((docSnap) => {
        const data: any = docSnap.data();
        if (data.sender !== "Patient") return;
        if (!data.patientId) return;
        counts[data.patientId] = (counts[data.patientId] || 0) + 1;
      });
      setUnreadByPatient(counts);
    });
  };

  const setupEmergencyListener = () => {
    if (!doctorId) return;
    const alertsRef = collection(db, "emergencyAlerts");
    const q = query(
      alertsRef,
      where("doctorId", "==", doctorId),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    return onSnapshot(q, (snapshot) => {
      const alerts: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        alerts.push({
          id: docSnap.id,
          ...data,
          displayTime: data.createdAt?.toDate
            ? data.createdAt.toDate().toLocaleString()
            : "N/A"
        });
      });
      setEmergencyAlerts(alerts);
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    navigate("/login");
  };

  const filteredPatients = patients.filter(patient =>
    patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="bg-card border-b border-[var(--border)] shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-5 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[var(--primary)] rounded-xl flex items-center justify-center">
                <Stethoscope className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-[var(--foreground)]">
                  Doctor Dashboard
                </h1>
                <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Patient Monitoring & Management System</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/profile")}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] rounded-lg transition border border-[var(--border)]"
              >
                <User className="w-4 h-4" />
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--destructive)] hover:bg-red-50 rounded-lg transition border border-red-200"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        {/* Emergency Alerts */}
        {emergencyAlerts.length > 0 && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-red-700 mb-3">Emergency Alerts</h2>
            <div className="space-y-3">
              {emergencyAlerts.map((alert) => (
                <div key={alert.id} className="flex flex-col gap-1 rounded-lg border border-red-200 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      Patient ID: {alert.patientId || "Unknown"}
                    </p>
                    <span className="text-xs text-red-600 font-medium">
                      {alert.displayTime}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)]">Reason: {alert.reason || "No reason provided"}</p>
                  <p className="text-xs text-slate-500">Status: {alert.status || "open"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border border-[var(--border)] p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-[var(--primary)]" />
              <p className="text-sm font-medium text-[var(--muted-foreground)]">Total Patients</p>
            </div>
            <p className="text-3xl font-semibold text-[var(--foreground)]">{patients.length}</p>
          </div>

          <div className="bg-card border border-[var(--border)] p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-emerald-500" />
              <p className="text-sm font-medium text-[var(--muted-foreground)]">Active Monitoring</p>
            </div>
            <p className="text-3xl font-semibold text-[var(--foreground)]">{Object.keys(patientVitals).length}</p>
          </div>

          <div className="bg-card border border-[var(--border)] p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
              <p className="text-sm font-medium text-[var(--muted-foreground)]">Alerts</p>
            </div>
            <p className="text-3xl font-semibold text-[var(--foreground)]">{emergencyAlerts.length}</p>
          </div>

          <div className="bg-card border border-[var(--border)] p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 text-purple-500" />
              <p className="text-sm font-medium text-[var(--muted-foreground)]">Today's Consultations</p>
            </div>
            <p className="text-3xl font-semibold text-[var(--foreground)]">0</p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient List */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-[var(--border)] rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[var(--foreground)]">Patients</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadPatients}
                    className="p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] rounded-lg transition"
                    title="Refresh patient list"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-medium text-[var(--muted-foreground)]">{filteredPatients.length}</span>
                </div>
              </div>

              <input
                type="text"
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 border border-[var(--border)] rounded-lg mb-4 focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] text-sm bg-[var(--input-background)]"
              />

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-[var(--primary)] border-t-transparent mx-auto mb-2"></div>
                    <p className="text-sm text-[var(--muted-foreground)]">Loading patients...</p>
                  </div>
                ) : error ? (
                  <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                    <p className="text-sm text-red-600 font-semibold mb-2">Error Loading Patients</p>
                    <p className="text-xs text-red-500">{error}</p>
                    <button
                      onClick={loadPatients}
                      className="mt-3 text-xs text-red-600 hover:text-red-700 underline font-medium"
                    >
                      Retry
                    </button>
                  </div>
                ) : filteredPatients.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="p-4 bg-[var(--accent)] rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Users className="w-8 h-8 text-[var(--primary)]" />
                    </div>
                    <p className="text-sm text-[var(--foreground)] font-medium mb-1">No patients found</p>
                    <p className="text-xs text-[var(--muted-foreground)] mb-4">
                      {searchTerm ? "Try a different search term" : "Patients need to sign up first"}
                    </p>
                    {!searchTerm && (
                      <button
                        onClick={() => navigate("/signup")}
                        className="text-xs text-[var(--primary)] hover:text-orange-600 underline font-medium"
                      >
                        Create Test Patient Account
                      </button>
                    )}
                  </div>
                ) : (
                  filteredPatients.map((patient) => {
                    const vitals = patientVitals[patient.id];
                    const unreadCount = unreadByPatient[patient.id] || 0;
                    const hrStatus = vitals ? (vitals.hr < 60 ? "Low" : vitals.hr > 100 ? "High" : "Normal") : null;
                    return (
                      <div
                        key={patient.id}
                        onClick={() => setSelectedPatient(patient)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedPatient?.id === patient.id
                            ? "bg-[var(--accent)] border-[var(--primary)] shadow-sm"
                            : "bg-[var(--muted)] border-[var(--border)] hover:bg-[var(--accent)] hover:border-[var(--secondary)]"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-[var(--foreground)] text-sm">
                              {patient.name || "Unknown Patient"}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)] mt-1">
                              {patient.email}
                            </p>
                            {patient.age && (
                              <p className="text-xs text-slate-400 mt-1">
                                Age {patient.age} · {patient.sex}
                              </p>
                            )}
                          </div>
                          {unreadCount > 0 && (
                            <div className="ml-2 flex items-center justify-center min-w-[22px] h-[22px] px-2 rounded-full bg-[var(--destructive)] text-white text-xs font-bold">
                              {unreadCount}
                            </div>
                          )}
                          {vitals && (
                            <div className="text-right">
                              <p className={`text-xs font-semibold ${hrStatus === "Low" ? "text-[var(--primary)]" : hrStatus === "High" ? "text-red-600" : "text-emerald-600"}`}>
                                HR: {vitals.hr ?? vitals.smoothed_hr ?? "—"}
                              </p>
                              <p className="text-xs text-[var(--muted-foreground)]">
                                {vitals.spo2 ?? "—"}% SpO₂
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Patient Details & Vitals */}
          <div className="lg:col-span-2">
            {selectedPatient ? (
              <div className="space-y-6">
                <div className="bg-card border border-[var(--border)] rounded-xl shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-[var(--foreground)]">
                        {selectedPatient.name || "Unknown Patient"}
                      </h2>
                      <div className="flex items-center gap-4 mt-2 text-sm text-[var(--muted-foreground)]">
                        {selectedPatient.age && <span>Age: {selectedPatient.age}</span>}
                        {selectedPatient.sex && <span>Sex: {selectedPatient.sex}</span>}
                        <span>Email: {selectedPatient.email}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/doctor-chat/${selectedPatient.id}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-orange-600 transition shadow-sm"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Contact Patient
                    </button>
                  </div>

                  <div className="flex gap-2 border-b border-[var(--border)]">
                    {["vitals", "records"].map(view => (
                      <button
                        key={view}
                        onClick={() => setActiveView(view)}
                        className={`px-6 py-3 font-medium text-sm transition-all relative ${
                          activeView === view
                            ? "text-[var(--primary)]"
                            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        }`}
                      >
                        {view === "vitals" ? "Live Vitals" : "Records"}
                        {activeView === view && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]"></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {activeView === "vitals" && (
                  <div className="bg-card border border-[var(--border)] rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Real-Time Vitals</h3>
                    <LiveSensor deviceId={`patient-${selectedPatient.id}`} />
                  </div>
                )}

                {activeView === "records" && (
                  <div className="bg-card border border-[var(--border)] rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Patient Records</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-[var(--accent)] rounded-lg border border-[var(--border)]">
                        <p className="text-sm font-medium text-[var(--foreground)] mb-3">Health Questionnaire</p>
                        {questionnaireLoading ? (
                          <p className="text-xs text-[var(--muted-foreground)]">Loading questionnaire...</p>
                        ) : !questionnaire ? (
                          <p className="text-xs text-[var(--muted-foreground)]">No questionnaire submitted yet.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[var(--foreground)]">
                            <div className="space-y-2">
                              <p className="font-medium text-[var(--muted-foreground)]">Existing Conditions</p>
                              <ul className="space-y-1">
                                <li>Hypertension: {questionnaire.has_hypertension ? "Yes" : "No"}</li>
                                <li>Diabetes: {questionnaire.has_diabetes ? "Yes" : "No"}</li>
                                <li>Heart Disease: {questionnaire.has_heart_disease ? "Yes" : "No"}</li>
                                <li>High Cholesterol: {questionnaire.has_high_cholesterol ? "Yes" : "No"}</li>
                              </ul>
                            </div>
                            <div className="space-y-2">
                              <p className="font-medium text-[var(--muted-foreground)]">Lifestyle</p>
                              <ul className="space-y-1">
                                <li>Smoking: {questionnaire.smoking_status || "Not specified"}</li>
                                <li>Exercise: {questionnaire.exercise_frequency || "Not specified"}</li>
                              </ul>
                            </div>
                            <div className="space-y-2">
                              <p className="font-medium text-[var(--muted-foreground)]">Family History</p>
                              <p>Cardiovascular disease: {questionnaire.family_history ? "Yes" : "No"}</p>
                            </div>
                            <div className="space-y-2">
                              <p className="font-medium text-[var(--muted-foreground)]">Medications</p>
                              <p>{questionnaire.current_medications || "None reported"}</p>
                            </div>
                            <div className="space-y-2">
                              <p className="font-medium text-[var(--muted-foreground)]">Symptoms</p>
                              <p>Not collected in current questionnaire.</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                        <p className="text-sm font-medium text-[var(--foreground)] mb-2">Latest Vitals Snapshot</p>
                        {patientVitals[selectedPatient.id] ? (
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-[var(--muted-foreground)]">HR: </span>
                              <span className="font-semibold text-[var(--destructive)]">
                                {patientVitals[selectedPatient.id].hr ?? patientVitals[selectedPatient.id].smoothed_hr ?? "—"} BPM
                              </span>
                            </div>
                            <div>
                              <span className="text-[var(--muted-foreground)]">SpO₂: </span>
                              <span className="font-semibold text-[var(--primary)]">
                                {patientVitals[selectedPatient.id].spo2 ?? "—"}%
                              </span>
                            </div>
                            <div>
                              <span className="text-[var(--muted-foreground)]">BP: </span>
                              <span className="font-semibold text-[var(--primary)]">
                              {patientVitals[selectedPatient.id].sbp ?? "—"}/{patientVitals[selectedPatient.id].dbp ?? "—"} mmHg
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-[var(--muted-foreground)] mt-1">No vitals data available</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-card border border-[var(--border)] rounded-xl shadow-sm p-12 text-center">
                <div className="w-24 h-24 bg-[var(--muted)] rounded-full mx-auto mb-6 flex items-center justify-center">
                  <Users className="w-12 h-12 text-[var(--primary)]" />
                </div>
                <p className="text-[var(--foreground)] font-semibold text-lg mb-2">Select a patient to view details</p>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  {patients.length === 0
                    ? "No patients registered yet. Ask patients to sign up first."
                    : "Choose a patient from the list to see their vitals and records"}
                </p>
                {patients.length === 0 && (
                  <button
                    onClick={() => window.open("/signup", "_blank")}
                    className="px-6 py-3 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition shadow-sm"
                  >
                    Open Sign Up Page
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

