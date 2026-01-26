// frontend/src/components/LiveSensor.jsx
import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import ECGWaveform from "./ECGWaveform";

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
const socket = io(SOCKET_URL);

export default function LiveSensor({ deviceId = null, onVitalsUpdate }) {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]); // stores last N samples for charts
  const maxPoints = 60; // last 60 samples (~60 seconds at 1Hz)
  const histRef = useRef([]);

  useEffect(() => {
    function onNewReading(pkt) {
      // if deviceId filter provided, skip others
      if (deviceId && pkt.deviceId !== deviceId) return;

      // pkt.timestamp expected as ISO string
      const timeLabel = pkt.timestamp ? new Date(pkt.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();

      // choose smoothed hr/spo2 if present, else raw
      const hr = pkt.smoothed_hr ?? pkt.hr ?? null;
      const spo2 = pkt.smoothed_spo2 ?? pkt.spo2 ?? null;

      const entry = {
        time: timeLabel,
        hr,
        spo2,
        sbp: pkt.prediction?.sbp ?? pkt.sbp ?? null,
        dbp: pkt.prediction?.dbp ?? pkt.dbp ?? null,
        blood_sugar: pkt.blood_sugar ?? pkt.bloodSugar ?? null,
        ecg_data: pkt.ecg_data ?? pkt.ecg ?? null,
        raw: pkt,
      };

      // update history buffer
      histRef.current = [entry, ...histRef.current].slice(0, maxPoints);
      setHistory([...histRef.current].reverse()); // reverse so earliest -> left on chart
      setLatest(entry);
      
      // Notify parent component of vitals update
      if (onVitalsUpdate) {
        onVitalsUpdate(entry);
      }
    }

    socket.on("newReading", onNewReading);
    socket.on("new_reading", onNewReading); // Support both event names
    return () => {
      socket.off("newReading", onNewReading);
      socket.off("new_reading", onNewReading);
    };
  }, [deviceId]);

  if (!latest) {
    return (
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="text-sm text-slate-500">Waiting for live data…</div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Device</div>
          <div className="text-lg font-semibold text-slate-900">
            {latest.raw.deviceId || "device"}
          </div>
        </div>
        <div className="text-xs text-slate-500">
          {new Date(latest.raw.timestamp).toLocaleString()}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="p-3 bg-slate-50 rounded border border-slate-100">
          <div className="text-xs text-slate-500">Heart Rate</div>
          <div className="text-2xl font-bold text-slate-900">{latest.hr ?? "—"}</div>
          <div className="text-xs text-slate-400 mt-1">BPM</div>
        </div>

        <div className="p-3 bg-slate-50 rounded border border-slate-100">
          <div className="text-xs text-slate-500">SpO₂</div>
          <div className="text-2xl font-bold text-slate-900">{latest.spo2 ?? "—"}</div>
          <div className="text-xs text-slate-400 mt-1">%</div>
        </div>

        <div className="p-3 bg-slate-50 rounded border border-slate-100">
          <div className="text-xs text-slate-500">Blood Pressure</div>
          <div className="text-xl font-bold text-slate-900">
            {latest.sbp && latest.dbp ? `${latest.sbp}/${latest.dbp}` : "—"}
          </div>
          <div className="text-xs text-slate-400 mt-1">mmHg</div>
        </div>

        <div className="p-3 bg-slate-50 rounded border border-slate-100">
          <div className="text-xs text-slate-500">Blood Sugar</div>
          <div className="text-2xl font-bold text-slate-900">{latest.blood_sugar ?? "—"}</div>
          <div className="text-xs text-slate-400 mt-1">mg/dL</div>
        </div>

        <div className="p-3 bg-slate-50 rounded border border-slate-100">
          <div className="text-xs text-slate-500">Systolic BP</div>
          <div className="text-2xl font-bold text-slate-900">{latest.sbp ?? "—"}</div>
          <div className="text-xs text-slate-400 mt-1">mmHg</div>
        </div>

        <div className="p-3 bg-slate-50 rounded border border-slate-100">
          <div className="text-xs text-slate-500">Diastolic BP</div>
          <div className="text-2xl font-bold text-slate-900">{latest.dbp ?? "—"}</div>
          <div className="text-xs text-slate-400 mt-1">mmHg</div>
        </div>
      </div>

      {/* Charts: HR, SpO2, and ECG */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-3 rounded border border-slate-200">
          <div className="text-sm text-slate-700 mb-2 font-semibold">
            Heart Rate Trend (last {Math.min(history.length, maxPoints)} samples)
          </div>
          <div style={{ width: "100%", height: 160 }}>
            <ResponsiveContainer>
              <LineChart data={history}>
                <XAxis dataKey="time" hide />
                <YAxis domain={["dataMin - 5", "dataMax + 5"]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="hr"
                  stroke="#0EA5E9"
                  strokeWidth={2.2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-3 rounded border border-slate-200">
          <div className="text-sm text-slate-700 mb-2 font-semibold">
            SpO₂ Trend (last {Math.min(history.length, maxPoints)} samples)
          </div>
          <div style={{ width: "100%", height: 160 }}>
            <ResponsiveContainer>
              <LineChart data={history}>
                <XAxis dataKey="time" hide />
                <YAxis domain={[85, 100]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="spo2"
                  stroke="#10B981"
                  strokeWidth={2.2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ECG Waveform */}
      {latest.ecg_data && (
        <div className="mt-4">
          <ECGWaveform ecgData={latest.ecg_data} height={200} />
        </div>
      )}
    </div>
  );
}
