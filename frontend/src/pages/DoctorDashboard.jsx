import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, getDocs, where, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import LiveSensor from "../components/LiveSensor";
import io from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientVitals, setPatientVitals] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeView, setActiveView] = useState("vitals"); // patients, vitals, records
  const [error, setError] = useState(null);

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
      // In a real app, you'd filter by doctor's assigned patients
      // For now, we'll get all users with role 'patient'
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("role", "==", "patient"));
      const querySnapshot = await getDocs(q);
      
      const patientsList = [];
      querySnapshot.forEach((doc) => {
        patientsList.push({ id: doc.id, ...doc.data() });
      });

      console.log(`Loaded ${patientsList.length} patients`);

      // Also get latest vitals for each patient
      const vitalsMap = {};
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
    } catch (error) {
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
      // Update vitals for the patient if this reading belongs to them
      if (data.deviceId && data.deviceId.startsWith("patient-")) {
        const patientId = data.deviceId.replace("patient-", "");
        setPatientVitals(prev => ({
          ...prev,
          [patientId]: data
        }));
      }
    });
    
    socket.on("new_reading", (data) => {
      // Also listen for the alternative event name
      if (data.deviceId && data.deviceId.startsWith("patient-")) {
        const patientId = data.deviceId.replace("patient-", "");
        setPatientVitals(prev => ({
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

  const getVitalStatus = (vitals, type) => {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Doctor Dashboard</h1>
              <p className="text-sm text-slate-600 mt-1">Patient Monitoring & Management</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/profile")}
                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-lg transition"
              >
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-600 mb-1">Total Patients</p>
            <p className="text-3xl font-bold text-slate-900">{patients.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-600 mb-1">Active Monitoring</p>
            <p className="text-3xl font-bold text-emerald-600">
              {Object.keys(patientVitals).length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-600 mb-1">Alerts</p>
            <p className="text-3xl font-bold text-red-600">0</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-600 mb-1">Today's Consultations</p>
            <p className="text-3xl font-bold text-blue-600">0</p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Patients</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadPatients}
                    className="p-1 text-slate-500 hover:text-slate-700 transition"
                    title="Refresh patient list"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <span className="text-sm text-slate-500">{filteredPatients.length}</span>
                </div>
              </div>
              
              {/* Search */}
              <input
                type="text"
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg mb-4 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              />

              {/* Patient List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-2"></div>
                    <p className="text-sm text-slate-500">Loading patients...</p>
                  </div>
                ) : error ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600 font-semibold mb-2">Error Loading Patients</p>
                    <p className="text-xs text-red-500">{error}</p>
                    <button
                      onClick={loadPatients}
                      className="mt-3 text-xs text-red-600 hover:text-red-700 underline"
                    >
                      Retry
                    </button>
                  </div>
                ) : filteredPatients.length === 0 ? (
                  <div className="text-center py-8">
                    <svg
                      className="mx-auto h-12 w-12 text-slate-300 mb-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    <p className="text-sm text-slate-600 font-medium mb-1">No patients found</p>
                    <p className="text-xs text-slate-500 mb-4">
                      {searchTerm ? "Try a different search term" : "Patients need to sign up first"}
                    </p>
                    {!searchTerm && (
                      <button
                        onClick={() => navigate("/signup")}
                        className="text-xs text-emerald-600 hover:text-emerald-700 underline"
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
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedPatient?.id === patient.id
                            ? "bg-emerald-50 border-emerald-300 shadow-md"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100"
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
                              <p className={`text-xs font-semibold ${hrStatus.color}`}>
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
                {/* Patient Info Header */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">
                        {selectedPatient.name || "Unknown Patient"}
                      </h2>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                        {selectedPatient.age && (
                          <span>Age: {selectedPatient.age}</span>
                        )}
                        {selectedPatient.sex && (
                          <span>Sex: {selectedPatient.sex}</span>
                        )}
                        <span>Email: {selectedPatient.email}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/doctor-chat/${selectedPatient.id}`)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition shadow-sm"
                    >
                      Contact Patient
                    </button>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-2 border-b border-slate-200">
                    <button
                      onClick={() => setActiveView("vitals")}
                      className={`px-4 py-2 font-semibold text-sm transition-colors ${
                        activeView === "vitals"
                          ? "text-emerald-600 border-b-2 border-emerald-600"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Live Vitals
                    </button>
                    <button
                      onClick={() => setActiveView("records")}
                      className={`px-4 py-2 font-semibold text-sm transition-colors ${
                        activeView === "records"
                          ? "text-emerald-600 border-b-2 border-emerald-600"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Records
                    </button>
                  </div>
                </div>

                {/* Live Vitals View */}
                {activeView === "vitals" && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Real-Time Vitals</h3>
                    <LiveSensor deviceId={`patient-${selectedPatient.id}`} />
                  </div>
                )}

                {/* Records View */}
                {activeView === "records" && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Patient Records</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-sm text-slate-600">Health Questionnaire</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {selectedPatient.has_hypertension ? "Hypertension" : ""}
                          {selectedPatient.has_diabetes ? " · Diabetes" : ""}
                          {selectedPatient.has_heart_disease ? " · Heart Disease" : ""}
                        </p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-sm text-slate-600">Latest Vitals Snapshot</p>
                        {patientVitals[selectedPatient.id] ? (
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-slate-500">HR: </span>
                              <span className="font-semibold">
                                {patientVitals[selectedPatient.id].hr || patientVitals[selectedPatient.id].smoothed_hr || "—"} BPM
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">SpO₂: </span>
                              <span className="font-semibold">
                                {patientVitals[selectedPatient.id].spo2 || "—"}%
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">BP: </span>
                              <span className="font-semibold">
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
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-slate-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <p className="text-slate-600 font-medium mb-2">Select a patient to view details</p>
                <p className="text-sm text-slate-500 mb-4">
                  {patients.length === 0 
                    ? "No patients registered yet. Ask patients to sign up first."
                    : "Choose a patient from the list to see their vitals and records"}
                </p>
                {patients.length === 0 && (
                  <button
                    onClick={() => window.open("/signup", "_blank")}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition"
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

