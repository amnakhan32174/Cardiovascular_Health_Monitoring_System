// src/app/components/LiveSensor.tsx
import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Activity, Heart, Droplets, Wind, Stethoscope, Link } from "lucide-react";

interface LiveSensorProps {
  deviceId?: string;
  onVitalsUpdate?: (vitals: any) => void;
}

interface Vitals {
  hr: number | null; spo2: number | null; sbp: number | null;
  dbp: number | null; mean_bp: number | null; blood_sugar: number | null;
  heart_rate_type: string | null; heart_rate_type_confidence: number | null;
  heart_sound_all_probs: Record<string, number> | null;
  ecg: number[]; ppg: number[]; timestamp: string | null;
}

const EMPTY: Vitals = {
  hr: null, spo2: null, sbp: null, dbp: null, mean_bp: null,
  blood_sugar: null, heart_rate_type: null, heart_rate_type_confidence: null,
  heart_sound_all_probs: null, ecg: [], ppg: [], timestamp: null,
};

const HS: Record<string, { full: string; color: string; bg: string; severity: string }> = {
  N:   { full: "Normal",                color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200",  severity: "Normal"   },
  AS:  { full: "Aortic Stenosis",       color: "text-red-700",     bg: "bg-red-50 border-red-200",          severity: "High"     },
  MR:  { full: "Mitral Regurgitation",  color: "text-orange-700",  bg: "bg-orange-50 border-orange-200",    severity: "Moderate" },
  MS:  { full: "Mitral Stenosis",       color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",      severity: "Moderate" },
  MVP: { full: "Mitral Valve Prolapse", color: "text-purple-700",  bg: "bg-purple-50 border-purple-200",    severity: "Low"      },
};

function hrStatus(hr: number | null) {
  if (!hr) return { label: "", color: "text-slate-400" };
  if (hr < 60)  return { label: "Bradycardia", color: "text-blue-600" };
  if (hr > 100) return { label: "Tachycardia", color: "text-red-600"  };
  return           { label: "Normal",      color: "text-emerald-600" };
}

function spo2Color(s: number | null) {
  if (!s) return "text-slate-400";
  if (s < 90) return "text-red-600";
  if (s < 95) return "text-amber-600";
  return "text-emerald-600";
}

function ECGWaveform({ samples }: { samples: number[] }) {
  const W = 400; const H = 80;
  const data = samples.slice(-120);
  if (data.length < 2) return (
    <div className="h-20 bg-slate-800 rounded-xl flex items-center justify-center">
      <p className="text-emerald-400 text-sm animate-pulse">Waiting for ECG data…</p>
    </div>
  );
  const min = Math.min(...data); const max = Math.max(...data); const range = max - min || 1;
  const pts = data.map((v, i) => `${((i/(data.length-1))*W).toFixed(1)},${(H-((v-min)/range)*H*0.8-H*0.1).toFixed(1)}`);
  return (
    <div className="bg-slate-900 rounded-xl p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none">
        <polyline points={pts.join(" ")} fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function VCard({ icon, label, value, unit, valueColor = "text-[var(--foreground)]", sublabel }: any) {
  return (
    <div className="bg-[var(--muted)] border border-[var(--border)] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-[var(--card)] rounded-lg">{icon}</div>
        <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-3xl font-bold ${value ? valueColor : "text-slate-300"}`}>{value ?? "—"}</p>
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs text-[var(--muted-foreground)]">{unit}</p>
        {sublabel && <p className={`text-xs font-semibold ${valueColor}`}>{sublabel}</p>}
      </div>
    </div>
  );
}

export default function LiveSensor({ deviceId, onVitalsUpdate }: LiveSensorProps) {
  const [vitals,       setVitals]       = useState<Vitals>(EMPTY);
  const [isConnected,  setIsConnected]  = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [lastUpdated,  setLastUpdated]  = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const url       = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
    const patientId = localStorage.getItem("userId");
    const socket    = io(url, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      if (patientId) socket.emit("register_patient", { patientId });
    });

    socket.on("patient_registered", (d: any) => { if (d.ok) setIsRegistered(true); });
    socket.on("disconnect", () => { setIsConnected(false); setIsRegistered(false); });

    const handle = (data: any) => {
      if (deviceId && data.deviceId && data.deviceId !== deviceId) return;
      const v: Vitals = {
        hr: data.hr ?? null, spo2: data.spo2 ?? null,
        sbp: data.sbp ?? null, dbp: data.dbp ?? null, mean_bp: data.mean_bp ?? null,
        blood_sugar: data.blood_sugar ?? null,
        heart_rate_type: data.heart_rate_type ?? null,
        heart_rate_type_confidence: data.heart_rate_type_confidence ?? null,
        heart_sound_all_probs: data.heart_sound_all_probs ?? null,
        ecg: Array.isArray(data.ecg) ? data.ecg : Array.isArray(data.ecg_data) ? data.ecg_data : [],
        ppg: Array.isArray(data.ppg) ? data.ppg : [],
        timestamp: data.timestamp ?? new Date().toISOString(),
      };
      setVitals(v);
      setLastUpdated(new Date().toLocaleTimeString());
      if (onVitalsUpdate) onVitalsUpdate(v);
    };

    socket.on("new_reading", handle);
    socket.on("newReading",  handle);
    return () => { socket.off("new_reading", handle); socket.off("newReading", handle); socket.disconnect(); };
  }, [deviceId]);

  const hr     = hrStatus(vitals.hr);
  const hsInfo = vitals.heart_rate_type ? HS[vitals.heart_rate_type] : null;

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
            <span className="text-xs font-medium text-[var(--muted-foreground)]">{isConnected ? "Connected" : "Disconnected"}</span>
          </div>
          {isConnected && (
            <div className="flex items-center gap-1.5">
              <Link className={`w-3.5 h-3.5 ${isRegistered ? "text-emerald-500" : "text-amber-500"}`} />
              <span className={`text-xs font-medium ${isRegistered ? "text-emerald-600" : "text-amber-600"}`}>
                {isRegistered ? "Readings linked to your account" : "Linking…"}
              </span>
            </div>
          )}
        </div>
        {lastUpdated && <span className="text-xs text-[var(--muted-foreground)]">Updated {lastUpdated}</span>}
      </div>

      {/* Vitals grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <VCard icon={<Heart className="w-4 h-4 text-rose-500" />}   label="Heart Rate"       unit="BPM"           value={vitals.hr}   valueColor={hr.color} sublabel={vitals.hr ? hr.label : ""} />
        <VCard icon={<Wind className="w-4 h-4 text-indigo-500" />}  label="SpO₂"             unit="%"             value={vitals.spo2} valueColor={spo2Color(vitals.spo2)} />
        <VCard icon={<Activity className="w-4 h-4 text-rose-500" />} label="Blood Pressure"  unit="mmHg SBP/DBP"  value={vitals.sbp && vitals.dbp ? `${vitals.sbp}/${vitals.dbp}` : null} valueColor="text-rose-700" />
        <VCard icon={<Activity className="w-4 h-4 text-violet-500" />} label="Mean BP (MAP)" unit="mmHg"          value={vitals.mean_bp ? Math.round(vitals.mean_bp) : null} valueColor="text-violet-700" />
        <VCard icon={<Droplets className="w-4 h-4 text-amber-500" />} label="Blood Sugar"    unit="mg/dL"         value={vitals.blood_sugar} valueColor="text-amber-700" />

        {/* PCG card — patient-friendly */}
        <div className={`border rounded-2xl p-4 col-span-2 md:col-span-1 ${hsInfo ? hsInfo.bg : "bg-[var(--muted)] border-[var(--border)]"}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-white/60 rounded-lg">
              <Stethoscope className={`w-4 h-4 ${hsInfo ? hsInfo.color : "text-slate-400"}`} />
            </div>
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Heart Sound</p>
          </div>
          {vitals.heart_rate_type ? (
            <>
              {/* Condition name — prominent */}
              <p className={`text-base font-bold leading-tight ${hsInfo?.color}`}>
                {hsInfo?.full ?? vitals.heart_rate_type}
              </p>
              {/* Patient action message */}
              <p className={`text-xs mt-1 font-medium ${hsInfo?.color}`}>
                {hsInfo?.severity === "Normal"
                  ? "No abnormality detected."
                  : `${hsInfo?.full} detected — please consult your doctor.`}
              </p>
              {/* Severity badge */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  hsInfo?.severity === "Normal"   ? "bg-emerald-100 text-emerald-700" :
                  hsInfo?.severity === "High"     ? "bg-red-100 text-red-700"         :
                                                    "bg-amber-100 text-amber-700"
                }`}>
                  {hsInfo?.severity === "Normal" ? "✓ Normal" : `⚠ ${hsInfo?.severity} severity`}
                </span>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/60 text-slate-600">
                  {vitals.heart_rate_type}
                </span>
              </div>
              {/* Confidence bar */}
              {vitals.heart_rate_type_confidence != null && (
                <div className="mt-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-[var(--muted-foreground)]">AI confidence</span>
                    <span className={`text-xs font-bold ${hsInfo?.color}`}>{(vitals.heart_rate_type_confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-white/50 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${hsInfo?.color.replace("text-", "bg-")}`}
                      style={{ width: `${(vitals.heart_rate_type_confidence * 100).toFixed(1)}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          ) : <p className="text-slate-400 text-sm mt-1">Waiting for heart sound data…</p>}
        </div>
      </div>

      {/* Probability bars */}
      {vitals.heart_sound_all_probs && Object.keys(vitals.heart_sound_all_probs).length > 0 && (
        <div className="bg-[var(--muted)] border border-[var(--border)] rounded-2xl p-4">
          <p className="text-sm font-semibold text-[var(--foreground)] mb-3">Heart Sound — All Probabilities</p>
          <div className="space-y-2">
            {Object.entries(vitals.heart_sound_all_probs).sort((a,b) => b[1]-a[1]).map(([cls, prob]) => {
              const info  = HS[cls];
              const pct   = (prob * 100).toFixed(1);
              const isTop = cls === vitals.heart_rate_type;
              return (
                <div key={cls} className="flex items-center gap-3">
                  <span className={`w-8 text-xs font-bold ${isTop ? info?.color : "text-[var(--muted-foreground)]"}`}>{cls}</span>
                  <div className="flex-1 bg-[var(--border)] rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all duration-500 ${isTop ? (info?.color.replace("text-","bg-") ?? "bg-rose-500") : "bg-slate-300"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`w-12 text-xs text-right font-medium ${isTop ? info?.color : "text-[var(--muted-foreground)]"}`}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ECG waveform */}
      <div className="bg-slate-900 rounded-2xl p-5 border-2 border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-emerald-400">ECG Waveform</p>
          <span className="text-xs text-slate-400">{vitals.ecg.length > 0 ? `${vitals.ecg.length} samples` : "Awaiting device"}</span>
        </div>
        <ECGWaveform samples={vitals.ecg} />
      </div>
    </div>
  );
}