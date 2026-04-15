// src/app/components/RecordingPanel.tsx
// Two buttons: Record Heart Sound (PCG) and Record Blood Pressure (PPG)
// Results are pushed from the backend via Socket.IO after recording completes.

import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Stethoscope, TrendingUp, Mic, Activity } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface RecStatus {
  type: "pcg" | "ppg" | null;
  status: "idle" | "started" | "processing" | "done" | "error";
  message: string;
  duration: number;
}

interface RecProgress {
  type: "pcg" | "ppg";
  progress: number;
  elapsed: number;
  remaining: number;
  samples?: number;
}

interface PCGResult {
  type: "pcg";
  heart_sound_type: string;
  confidence: number;
  all_probabilities: Record<string, number>;
  timestamp: string;
  duration_sec: number;
}

interface PPGResult {
  type: "ppg";
  sbp: number;
  dbp: number;
  sbp_std: number;
  dbp_std: number;
  n_segments: number;
  duration_sec: number;
  model_name: string;
  timestamp: string;
}

// ── Lookup tables ─────────────────────────────────────────────────────────────
const HS_INFO: Record<string, { full: string; color: string; bg: string; border: string; severity: string }> = {
  N:   { full: "Normal",                color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200", severity: "Normal"   },
  AS:  { full: "Aortic Stenosis",       color: "text-red-700",     bg: "bg-red-50",      border: "border-red-200",     severity: "High"     },
  MR:  { full: "Mitral Regurgitation",  color: "text-orange-700",  bg: "bg-orange-50",   border: "border-orange-200",  severity: "Moderate" },
  MS:  { full: "Mitral Stenosis",       color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200",   severity: "Moderate" },
  MVP: { full: "Mitral Valve Prolapse", color: "text-purple-700",  bg: "bg-purple-50",   border: "border-purple-200",  severity: "Low"      },
};

function bpCategory(sbp: number, dbp: number) {
  if (sbp < 120 && dbp < 80)  return { label: "Normal",       color: "text-emerald-700", bg: "bg-emerald-100" };
  if (sbp < 130 && dbp < 80)  return { label: "Elevated",     color: "text-amber-700",   bg: "bg-amber-100"   };
  if (sbp < 140 || dbp < 90)  return { label: "High Stage 1", color: "text-orange-700",  bg: "bg-orange-100"  };
  return                              { label: "High Stage 2", color: "text-red-700",     bg: "bg-red-100"     };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function RecordingPanel() {
  const [status,      setStatus]      = useState<RecStatus>({ type: null, status: "idle", message: "", duration: 0 });
  const [progress,    setProgress]    = useState<RecProgress | null>(null);
  const [pcgResult,   setPcgResult]   = useState<PCGResult | null>(null);
  const [ppgResult,   setPpgResult]   = useState<PPGResult | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL || "http://localhost:5000";

  // ── Socket.IO listener for recording events ───────────────────────────────
  useEffect(() => {
    const socket = io(backendUrl, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("recording_status", (d: any) => {
      setStatus({ type: d.type, status: d.status, message: d.message || "", duration: d.duration || 0 });
      if (d.status === "done" || d.status === "error") setProgress(null);
    });

    socket.on("recording_progress", (d: any) => {
      setProgress(d);
    });

    socket.on("recording_result", (d: any) => {
      if (d.type === "pcg") setPcgResult(d as PCGResult);
      if (d.type === "ppg") setPpgResult(d as PPGResult);
    });

    return () => { socket.disconnect(); };
  }, [backendUrl]);

  // ── Trigger recording via HTTP POST ──────────────────────────────────────
  const startRecording = async (type: "pcg" | "ppg") => {
    try {
      const res  = await fetch(`${backendUrl}/api/record/${type}`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) {
        setStatus({ type, status: "error", message: data.error, duration: 0 });
      }
    } catch {
      setStatus({ type, status: "error", message: "Cannot reach backend server.", duration: 0 });
    }
  };

  const isRecording = status.status === "started" || status.status === "processing";
  const activeType  = status.type;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 shadow-sm space-y-5">

      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-violet-500" />
        <h2 className="text-base font-semibold text-[var(--foreground)]">Manual Recording</h2>
        <span className="text-xs text-[var(--muted-foreground)] ml-auto">
          ESP32 connected via USB
        </span>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* PCG button */}
        <button
          onClick={() => startRecording("pcg")}
          disabled={isRecording}
          className={`flex items-center gap-3 px-5 py-4 rounded-2xl border-2 font-semibold text-sm transition-all
            ${isRecording && activeType === "pcg"
              ? "border-violet-400 bg-violet-50 text-violet-700 cursor-not-allowed"
              : isRecording
              ? "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed opacity-50"
              : "border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:border-violet-400 cursor-pointer"
            }`}
        >
          <div className="p-2 bg-violet-100 rounded-xl flex-shrink-0">
            <Stethoscope className="w-5 h-5 text-violet-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold">Record Heart Sound</p>
            <p className="text-xs font-normal text-violet-500 mt-0.5">PCG · 60 seconds · INMP441</p>
          </div>
          {isRecording && activeType === "pcg" && (
            <div className="ml-auto w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
        </button>

        {/* PPG button */}
        <button
          onClick={() => startRecording("ppg")}
          disabled={isRecording}
          className={`flex items-center gap-3 px-5 py-4 rounded-2xl border-2 font-semibold text-sm transition-all
            ${isRecording && activeType === "ppg"
              ? "border-teal-400 bg-teal-50 text-teal-700 cursor-not-allowed"
              : isRecording
              ? "border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed opacity-50"
              : "border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100 hover:border-teal-400 cursor-pointer"
            }`}
        >
          <div className="p-2 bg-teal-100 rounded-xl flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-teal-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold">Record Blood Pressure</p>
            <p className="text-xs font-normal text-teal-500 mt-0.5">PPG · 120 seconds · MAX30102</p>
          </div>
          {isRecording && activeType === "ppg" && (
            <div className="ml-auto w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
        </button>
      </div>

      {/* Recording progress */}
      {isRecording && (
        <div className={`rounded-2xl border p-4 ${activeType === "pcg" ? "bg-violet-50 border-violet-200" : "bg-teal-50 border-teal-200"}`}>
          <div className="flex items-center gap-2 mb-3">
            <Mic className={`w-4 h-4 animate-pulse ${activeType === "pcg" ? "text-violet-600" : "text-teal-600"}`} />
            <p className={`text-sm font-semibold ${activeType === "pcg" ? "text-violet-700" : "text-teal-700"}`}>
              {status.status === "processing" ? "Analyzing with AI model…" : status.message}
            </p>
          </div>

          {progress && status.status !== "processing" && (
            <>
              <div className="w-full bg-white/60 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${activeType === "pcg" ? "bg-violet-500" : "bg-teal-500"}`}
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className={activeType === "pcg" ? "text-violet-600" : "text-teal-600"}>
                  {progress.elapsed}s elapsed
                  {progress.samples !== undefined ? ` · ${progress.samples} samples` : ""}
                </span>
                <span className={activeType === "pcg" ? "text-violet-600" : "text-teal-600"}>
                  {progress.remaining}s remaining
                </span>
              </div>
            </>
          )}

          {status.status === "processing" && (
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 border-2 border-t-transparent rounded-full animate-spin ${activeType === "pcg" ? "border-violet-500" : "border-teal-500"}`} />
              <span className={`text-xs ${activeType === "pcg" ? "text-violet-600" : "text-teal-600"}`}>
                Please wait…
              </span>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {status.status === "error" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700 mb-1">Recording failed</p>
          <p className="text-xs text-red-600">{status.message}</p>
          <p className="text-xs text-red-500 mt-2">
            Make sure: ① Arduino Serial Monitor is closed ② ESP32 is plugged in ③ COM port is correct in backend/.env
          </p>
        </div>
      )}

      {/* ── PCG Result ────────────────────────────────────────────────────── */}
      {pcgResult && (
        <div className={`rounded-2xl border p-5 ${HS_INFO[pcgResult.heart_sound_type]?.bg ?? "bg-slate-50"} ${HS_INFO[pcgResult.heart_sound_type]?.border ?? "border-slate-200"}`}>
          <div className="flex items-center gap-2 mb-4">
            <Stethoscope className={`w-5 h-5 ${HS_INFO[pcgResult.heart_sound_type]?.color ?? "text-slate-600"}`} />
            <p className="text-sm font-semibold text-[var(--foreground)]">Heart Sound Result</p>
            <span className="ml-auto text-xs text-[var(--muted-foreground)]">
              {new Date(pcgResult.timestamp).toLocaleTimeString()} · {pcgResult.duration_sec}s recorded
            </span>
          </div>

          {/* Main result */}
          <div className="flex items-start gap-4 mb-4">
            <div>
              <p className={`text-2xl font-bold ${HS_INFO[pcgResult.heart_sound_type]?.color ?? "text-slate-700"}`}>
                {HS_INFO[pcgResult.heart_sound_type]?.full ?? pcgResult.heart_sound_type}
              </p>
              <p className={`text-xs mt-1 ${HS_INFO[pcgResult.heart_sound_type]?.color ?? "text-slate-500"}`}>
                {HS_INFO[pcgResult.heart_sound_type]?.severity === "Normal"
                  ? "No abnormality detected."
                  : `${HS_INFO[pcgResult.heart_sound_type]?.full} detected — consult your doctor.`}
              </p>
            </div>
            <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${
              HS_INFO[pcgResult.heart_sound_type]?.severity === "Normal" ? "bg-emerald-100 text-emerald-700"
              : HS_INFO[pcgResult.heart_sound_type]?.severity === "High" ? "bg-red-100 text-red-700"
              : "bg-amber-100 text-amber-700"
            }`}>
              {HS_INFO[pcgResult.heart_sound_type]?.severity === "Normal" ? "✓ Normal" : `⚠ ${HS_INFO[pcgResult.heart_sound_type]?.severity} severity`}
            </span>
          </div>

          {/* Confidence bar */}
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-xs text-[var(--muted-foreground)]">AI confidence</span>
              <span className={`text-xs font-bold ${HS_INFO[pcgResult.heart_sound_type]?.color ?? "text-slate-600"}`}>
                {(pcgResult.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-white/60 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-700 ${HS_INFO[pcgResult.heart_sound_type]?.color.replace("text-", "bg-") ?? "bg-slate-400"}`}
                style={{ width: `${(pcgResult.confidence * 100).toFixed(1)}%` }}
              />
            </div>
          </div>

          {/* All probabilities */}
          {Object.keys(pcgResult.all_probabilities).length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-2">All Probabilities</p>
              {Object.entries(pcgResult.all_probabilities)
                .sort((a, b) => b[1] - a[1])
                .map(([cls, prob]) => {
                  const info  = HS_INFO[cls];
                  const pct   = (prob * 100).toFixed(1);
                  const isTop = cls === pcgResult.heart_sound_type;
                  return (
                    <div key={cls} className="flex items-center gap-3">
                      <span className={`w-8 text-xs font-bold ${isTop ? info?.color : "text-[var(--muted-foreground)]"}`}>{cls}</span>
                      <div className="flex-1 bg-white/50 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${isTop ? (info?.color.replace("text-", "bg-") ?? "bg-slate-400") : "bg-slate-300"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={`w-12 text-right text-xs font-medium ${isTop ? info?.color : "text-[var(--muted-foreground)]"}`}>{pct}%</span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ── PPG / BP Result ───────────────────────────────────────────────── */}
      {ppgResult && (() => {
        const cat = bpCategory(ppgResult.sbp, ppgResult.dbp);
        return (
          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-teal-600" />
              <p className="text-sm font-semibold text-[var(--foreground)]">Blood Pressure Result</p>
              <span className="ml-auto text-xs text-[var(--muted-foreground)]">
                {new Date(ppgResult.timestamp).toLocaleTimeString()} · {ppgResult.n_segments} segments
              </span>
            </div>

            {/* SBP / DBP */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/70 rounded-xl p-4 border border-teal-100">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">Systolic (SBP)</p>
                <p className="text-3xl font-bold text-teal-700">{ppgResult.sbp?.toFixed(0)}</p>
                <p className="text-xs text-teal-500 mt-1">mmHg ± {ppgResult.sbp_std?.toFixed(1)}</p>
              </div>
              <div className="bg-white/70 rounded-xl p-4 border border-teal-100">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">Diastolic (DBP)</p>
                <p className="text-3xl font-bold text-teal-700">{ppgResult.dbp?.toFixed(0)}</p>
                <p className="text-xs text-teal-500 mt-1">mmHg ± {ppgResult.dbp_std?.toFixed(1)}</p>
              </div>
            </div>

            {/* BP category */}
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${cat.bg}`}>
              <span className={`text-sm font-bold ${cat.color}`}>{cat.label}</span>
              <span className="ml-auto text-xs text-[var(--muted-foreground)]">
                {ppgResult.model_name ?? "GPR Model"} · {ppgResult.duration_sec?.toFixed(0)}s
              </span>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
