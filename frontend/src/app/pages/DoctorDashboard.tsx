import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Users, Activity, AlertTriangle, Calendar, User, LogOut, RefreshCw, MessageCircle, Stethoscope } from "lucide-react";
import { collection, query, getDocs, where, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase";
import LiveSensor from "../components/LiveSensor";
import io from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientVitals, setPatientVitals] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeView, setActiveView] = useState("vitals");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPatients();
    const socketCleanup = setupSocketConnection();
    return () => {
      if (socketCleanup) socketCleanup();
    };
  }, []);

  const loadPatients = async () => {
    try {
      setError(null);
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("role", "==", "patient"));
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

  const getVitalStatus = (vitals: any, type: string) => {
    if (!vitals) return { status: "unknown", color: "text-slate-400" };
    
    const value = vitals[type];
    if (value === null || value === undefined) return { status: "No data", color: "text-slate-400" };

    switch (type) {
      case "hr":
        if (value < 60) return { status: "Low", color: "text-blue-600" };
        if (value > 100) return { status: "High", color: "text-red-600" };
        return { status: "Normal", color: "text-emerald-600" };
      case "spo2":
        if (value < 94) return { status: "Low", color: "text-red-600" };
        return { status: "Normal", color: "text-emerald-600" };
      case "sbp":
        if (value >= 140) return { status: "High", color: "text-red-600" };
        if (value < 90) return { status: "Low", color: "text-blue-600" };
        return { status: "Normal", color: "text-emerald-600" };
      default:
        return { status: "Normal", color: "text-emerald-600" };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-rose-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.05),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(244,63,94,0.05),transparent_50%)]"></div>
      
      {/* Header */}
      <header className="relative bg-white/80 backdrop-blur-sm border-b-2 border-blue-200 shadow-lg">
        <div className="mx-auto max-w-7xl px-4 py-5 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl">
                <Stethoscope className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Doctor Dashboard
                </h1>
                <p className="text-sm text-slate-600 mt-1">Patient Monitoring & Management System</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/profile")}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 rounded-lg transition border-2 border-blue-200"
              >
                <User className="w-4 h-4" />
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition border-2 border-red-200"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative mx-auto max-w-7xl px-4 py-6 lg:px-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-xl text-white">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 opacity-80" />
              <p className="text-sm font-medium opacity-90">Total Patients</p>
            </div>
            <p className="text-4xl font-bold">{patients.length}</p>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl shadow-xl text-white">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 opacity-80" />
              <p className="text-sm font-medium opacity-90">Active Monitoring</p>
            </div>
            <p className="text-4xl font-bold">{Object.keys(patientVitals).length}</p>
          </div>
          
          <div className="bg-gradient-to-br from-rose-500 to-rose-600 p-6 rounded-2xl shadow-xl text-white">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 opacity-80" />
              <p className="text-sm font-medium opacity-90">Alerts</p>
            </div>
            <p className="text-4xl font-bold">0</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl shadow-xl text-white">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 opacity-80" />
              <p className="text-sm font-medium opacity-90">Today's Consultations</p>
            </div>
            <p className="text-4xl font-bold">0</p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient List */}
          <div className="lg:col-span-1">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-blue-200 shadow-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">Patients</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadPatients}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Refresh patient list"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-medium text-slate-500">{filteredPatients.length}</span>
                </div>
              </div>
              
              <input
                type="text"
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 border-2 border-slate-200 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mx-auto mb-2"></div>
                    <p className="text-sm text-slate-500">Loading patients...</p>
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
                    <div className="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Users className="w-8 h-8 text-blue-600" />
                    </div>
                    <p className="text-sm text-slate-600 font-medium mb-1">No patients found</p>
                    <p className="text-xs text-slate-500 mb-4">
                      {searchTerm ? "Try a different search term" : "Patients need to sign up first"}
                    </p>
                    {!searchTerm && (
                      <button
                        onClick={() => navigate("/signup")}
                        className="text-xs text-blue-600 hover:text-blue-700 underline font-medium"
                      >
                        Create Test Patient Account
                      </button>
                    )}
                  </div>
                ) : (
                  filteredPatients.map((patient) => {
                    const vitals = patientVitals[patient.id];
                    const hrStatus = getVitalStatus(vitals, "hr");
                    
                    return (
                      <div
                        key={patient.id}
                        onClick={() => setSelectedPatient(patient)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedPatient?.id === patient.id
                            ? "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-400 shadow-lg"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900 text-sm">
                              {patient.name || "Unknown Patient"}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">
                              {patient.email}
                            </p>
                            {patient.age && (
                              <p className="text-xs text-slate-500 mt-1">
                                Age {patient.age} · {patient.sex}
                              </p>
                            )}
                          </div>
                          {vitals && (
                            <div className="text-right">
                              <p className={`text-xs font-bold ${hrStatus.color}`}>
                                HR: {vitals.hr || vitals.smoothed_hr || "—"}
                              </p>
                              <p className="text-xs text-slate-500">
                                {vitals.spo2 || "—"}% SpO₂
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
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-blue-200 shadow-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">
                        {selectedPatient.name || "Unknown Patient"}
                      </h2>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                        {selectedPatient.age && <span>Age: {selectedPatient.age}</span>}
                        {selectedPatient.sex && <span>Sex: {selectedPatient.sex}</span>}
                        <span>Email: {selectedPatient.email}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/doctor-chat/${selectedPatient.id}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition shadow-lg"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Contact Patient
                    </button>
                  </div>

                  <div className="flex gap-2 border-b-2 border-blue-100">
                    {["vitals", "records"].map(view => (
                      <button
                        key={view}
                        onClick={() => setActiveView(view)}
                        className={`px-6 py-3 font-semibold text-sm transition-all relative ${
                          activeView === view
                            ? "text-blue-600"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {view === "vitals" ? "Live Vitals" : "Records"}
                        {activeView === view && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-rose-600"></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {activeView === "vitals" && (
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-blue-200 shadow-xl p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Real-Time Vitals</h3>
                    <LiveSensor deviceId={`patient-${selectedPatient.id}`} />
                  </div>
                )}

                {activeView === "records" && (
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-blue-200 shadow-xl p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Patient Records</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                        <p className="text-sm font-semibold text-slate-700 mb-2">Health Questionnaire</p>
                        <p className="text-xs text-slate-600">
                          {selectedPatient.has_hypertension ? "Hypertension" : ""}
                          {selectedPatient.has_diabetes ? " · Diabetes" : ""}
                          {selectedPatient.has_heart_disease ? " · Heart Disease" : ""}
                        </p>
                      </div>
                      <div className="p-4 bg-rose-50 rounded-xl border-2 border-rose-200">
                        <p className="text-sm font-semibold text-slate-700 mb-2">Latest Vitals Snapshot</p>
                        {patientVitals[selectedPatient.id] ? (
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-slate-600">HR: </span>
                              <span className="font-bold text-rose-700">
                                {patientVitals[selectedPatient.id].hr || patientVitals[selectedPatient.id].smoothed_hr || "—"} BPM
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-600">SpO₂: </span>
                              <span className="font-bold text-blue-700">
                                {patientVitals[selectedPatient.id].spo2 || "—"}%
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-600">BP: </span>
                              <span className="font-bold text-blue-700">
                                {patientVitals[selectedPatient.id].sbp || "—"}/{patientVitals[selectedPatient.id].dbp || "—"} mmHg
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 mt-1">No vitals data available</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-blue-200 shadow-xl p-12 text-center">
                <div className="p-6 bg-blue-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <Users className="w-12 h-12 text-blue-600" />
                </div>
                <p className="text-slate-700 font-semibold text-lg mb-2">Select a patient to view details</p>
                <p className="text-sm text-slate-500 mb-4">
                  {patients.length === 0 
                    ? "No patients registered yet. Ask patients to sign up first."
                    : "Choose a patient from the list to see their vitals and records"}
                </p>
                {patients.length === 0 && (
                  <button
                    onClick={() => window.open("/signup", "_blank")}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-blue-800 transition shadow-lg"
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
