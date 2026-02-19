import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Users, User, LogOut, RefreshCw } from "lucide-react";
import { collection, getDocs, query, updateDoc, where, doc } from "firebase/firestore";
import { db } from "../../firebase";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "admin") {
      navigate(role === "doctor" ? "/doctor-dashboard" : "/login");
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      setLoading(true);
      const usersRef = collection(db, "users");

      const doctorsQuery = query(usersRef, where("role", "==", "doctor"));
      const patientsQuery = query(usersRef, where("role", "==", "patient"));

      const [doctorsSnap, patientsSnap] = await Promise.all([
        getDocs(doctorsQuery),
        getDocs(patientsQuery)
      ]);

      const doctorList: any[] = [];
      doctorsSnap.forEach((docSnap) => {
        doctorList.push({ id: docSnap.id, ...docSnap.data() });
      });

      const patientList: any[] = [];
      patientsSnap.forEach((docSnap) => {
        patientList.push({ id: docSnap.id, ...docSnap.data() });
      });

      setDoctors(doctorList);
      setPatients(patientList);
    } catch (err: any) {
      console.error("Error loading admin data:", err);
      setError(err.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (patientId: string, doctorId: string) => {
    try {
      setSavingId(patientId);
      await updateDoc(doc(db, "users", patientId), {
        assignedDoctorId: doctorId
      });
      setPatients((prev) =>
        prev.map((p) => (p.id === patientId ? { ...p, assignedDoctorId: doctorId } : p))
      );
    } catch (err) {
      console.error("Error assigning doctor:", err);
      alert("Failed to assign doctor. Please try again.");
    } finally {
      setSavingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    navigate("/login");
  };

  const filteredPatients = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return patients.filter((p) =>
      p.name?.toLowerCase().includes(term) || p.email?.toLowerCase().includes(term)
    );
  }, [patients, searchTerm]);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="bg-[var(--card)] border-b border-[var(--border)] shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-5 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[var(--primary)] rounded-xl flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-[var(--foreground)]">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">Assign doctors to patients</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadData}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--primary)] hover:bg-[var(--accent)] rounded-lg transition border border-[var(--border)]"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
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
        <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">Patients</h2>
            <span className="text-sm font-medium text-[var(--muted-foreground)]">
              {filteredPatients.length}
            </span>
          </div>

          <input
            type="text"
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 border border-[var(--border)] rounded-lg mb-4 focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] text-sm bg-[var(--input-background)]"
          />

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-[var(--primary)] border-t-transparent mx-auto mb-2"></div>
              <p className="text-sm text-[var(--muted-foreground)]">Loading users...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-[var(--destructive)] font-medium mb-2">Error</p>
              <p className="text-xs text-red-500">{error}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPatients.map((patient) => {
                const assignedDoctor = doctors.find((d) => d.id === patient.assignedDoctorId);
                return (
                  <div
                    key={patient.id}
                    className="p-4 rounded-xl border border-[var(--border)] bg-[var(--muted)]"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium text-[var(--foreground)] text-sm">
                          {patient.name || "Unknown Patient"}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">{patient.email}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Assigned Doctor: {assignedDoctor?.name || assignedDoctor?.email || "Unassigned"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          className="p-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--input-background)]"
                          defaultValue={patient.assignedDoctorId || ""}
                          onChange={(e) => handleAssign(patient.id, e.target.value)}
                          disabled={savingId === patient.id}
                        >
                          <option value="">Select doctor</option>
                          {doctors.map((doctor) => (
                            <option key={doctor.id} value={doctor.id}>
                              {doctor.name || doctor.email || doctor.id}
                            </option>
                          ))}
                        </select>
                        {savingId === patient.id && (
                          <span className="text-xs text-[var(--muted-foreground)]">Saving...</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredPatients.length === 0 && (
                <div className="text-center py-6">
                  <Users className="w-8 h-8 text-[var(--primary)] mx-auto mb-2" />
                  <p className="text-sm text-[var(--muted-foreground)]">No patients found.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
