// frontend/src/components/LiveSensor.jsx
import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import ECGWaveform from "./ECGWaveform";

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
const socket = io(SOCKET_URL);

const ECG_BUFFER_SIZE = 250;  // Rolling buffer for live ECG (supports 1 or 125 samples per reading)

export default function LiveSensor({ deviceId = null, onVitalsUpdate }) {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [ecgBuffer, setEcgBuffer] = useState([]);  // Rolling ECG for live waveform
  const maxPoints = 60;
  const histRef = useRef([]);
  const ecgBufferRef = useRef([]);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("✅ LiveSensor: Connected to Socket.io server");
    });

    socket.on("disconnect", () => {
      console.log("❌ LiveSensor: Disconnected from Socket.io server");
    });

    socket.on("connect_error", (error) => {
      console.error("❌ LiveSensor: Socket.io connection error:", error);
    });

    function onNewReading(pkt) {
      console.log("📥 LiveSensor: Received new reading:", pkt);

      if (deviceId && pkt.deviceId !== deviceId) {
        return;
      }

      const timeLabel = pkt.timestamp ? new Date(pkt.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();

      const entry = {
        time: timeLabel,
        hr: pkt.hr ?? null,
        spo2: pkt.spo2 ?? null,
        sbp: pkt.sbp ?? null,
        dbp: pkt.dbp ?? null,
        mean_bp: pkt.mean_bp ?? null,
        blood_sugar: pkt.blood_sugar ?? null,
        ecg_data: pkt.ecg_data || pkt.ecg || null,
        ppg_data: pkt.ppg || null,
        raw: pkt,
      };

      console.log("✅ LiveSensor: Processed entry:", entry);

      histRef.current = [entry, ...histRef.current].slice(0, maxPoints);
      setHistory([...histRef.current].reverse());
      setLatest(entry);

      // Build rolling ECG buffer: new values at end, keep last ECG_BUFFER_SIZE
      const ecgRaw = pkt.ecg_data || pkt.ecg;
      if (ecgRaw && Array.isArray(ecgRaw)) {
        const values = ecgRaw.map((v) => (typeof v === "number" ? v : Number(v) || 0));
        ecgBufferRef.current = [...ecgBufferRef.current, ...values].slice(-ECG_BUFFER_SIZE);
        setEcgBuffer([...ecgBufferRef.current]);
      }

      if (onVitalsUpdate) {
        onVitalsUpdate(entry);
      }
    }

    socket.on("newReading", onNewReading);
    socket.on("new_reading", onNewReading);

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("newReading", onNewReading);
      socket.off("new_reading", onNewReading);
    };
  }, [deviceId]);

  if (!latest) {
    return (
      <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm">
        <div className="text-sm text-[var(--muted-foreground)]">⏳ Waiting for live data from ESP32...</div>
        <div className="text-xs text-slate-400 mt-2">
          Make sure your ESP32 is powered on and connected to WiFi
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Device</div>
          <div className="text-lg font-semibold text-[var(--foreground)]">
            {latest.raw.deviceId || "device"}
          </div>
        </div>
        <div className="text-xs text-[var(--muted-foreground)]">
          {new Date(latest.raw.timestamp).toLocaleString()}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="p-3 bg-[var(--muted)] rounded-lg border border-[var(--border)]">
          <div className="text-xs text-[var(--muted-foreground)]">Heart Rate</div>
          <div className={`text-2xl font-bold ${latest.hr === 0 ? 'text-slate-400' : 'text-[var(--foreground)]'}`}>
            {latest.hr ?? "—"}
          </div>
          <div className="text-xs text-slate-400 mt-1">BPM</div>
        </div>

        <div className="p-3 bg-[var(--muted)] rounded-lg border border-[var(--border)]">
          <div className="text-xs text-[var(--muted-foreground)]">SpO₂</div>
          <div className={`text-2xl font-bold ${latest.spo2 === 0 ? 'text-slate-400' : 'text-[var(--foreground)]'}`}>
            {latest.spo2 ?? "—"}
          </div>
          <div className="text-xs text-slate-400 mt-1">%</div>
        </div>

        <div className="p-3 bg-[var(--muted)] rounded-lg border border-[var(--border)]">
          <div className="text-xs text-[var(--muted-foreground)]">Blood Pressure</div>
          <div className={`text-xl font-bold ${(latest.sbp === 0 || !latest.sbp) ? 'text-slate-400' : 'text-[var(--foreground)]'}`}>
            {latest.sbp && latest.dbp ? `${latest.sbp}/${latest.dbp}` : "—"}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {latest.mean_bp ? `(Mean: ${Math.round(latest.mean_bp)})` : "mmHg"}
          </div>
        </div>

        <div className="p-3 bg-[var(--muted)] rounded-lg border border-[var(--border)]">
          <div className="text-xs text-[var(--muted-foreground)]">Blood Sugar</div>
          <div className={`text-2xl font-bold ${latest.blood_sugar ? 'text-[var(--foreground)]' : 'text-slate-400'}`}>
            {latest.blood_sugar ?? "—"}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {latest.blood_sugar ? "mg/dL" : "Manual entry only"}
          </div>
        </div>

        <div className="p-3 bg-[var(--muted)] rounded-lg border border-[var(--border)]">
          <div className="text-xs text-[var(--muted-foreground)]">Systolic BP</div>
          <div className={`text-2xl font-bold ${(latest.sbp === 0 || !latest.sbp) ? 'text-slate-400' : 'text-[var(--foreground)]'}`}>
            {latest.sbp ?? "—"}
          </div>
          <div className="text-xs text-slate-400 mt-1">mmHg</div>
        </div>

        <div className="p-3 bg-[var(--muted)] rounded-lg border border-[var(--border)]">
          <div className="text-xs text-[var(--muted-foreground)]">Diastolic BP</div>
          <div className={`text-2xl font-bold ${(latest.dbp === 0 || !latest.dbp) ? 'text-slate-400' : 'text-[var(--foreground)]'}`}>
            {latest.dbp ?? "—"}
          </div>
          <div className="text-xs text-slate-400 mt-1">mmHg</div>
        </div>
      </div>

      {/* Status Messages */}
      {latest.hr === 0 && latest.spo2 === 0 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800 font-medium">⚠️ Sensor Not Detecting</p>
          <p className="text-xs text-amber-700 mt-1">
            Please check: 1) Finger is on sensor, 2) MAX30105 connections, 3) AD8232 ECG pads attached
          </p>
        </div>
      )}

      {!latest.sbp && latest.hr > 0 && (
        <div className="mt-4 p-3 bg-[var(--accent)] border border-[var(--border)] rounded-lg">
          <p className="text-sm text-[var(--foreground)] font-medium">ℹ️ ML Prediction Pending</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Blood pressure will appear once ML model analyzes sensor data
          </p>
        </div>
      )}

      {/* Charts: HR, SpO2 */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[var(--card)] p-3 rounded-lg border border-[var(--border)]">
          <div className="text-sm text-[var(--foreground)] mb-2 font-medium">
            Heart Rate Trend
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
                  stroke="var(--chart-1)"
                  strokeWidth={2.2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[var(--card)] p-3 rounded-lg border border-[var(--border)]">
          <div className="text-sm text-[var(--foreground)] mb-2 font-medium">
            SpO₂ Trend
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
                  stroke="var(--chart-4)"
                  strokeWidth={2.2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Live ECG Waveform - always shown when ECG data exists (rolling buffer) */}
      {(ecgBuffer.length > 0 || (latest.ecg_data && latest.ecg_data.length > 0)) && (
        <div className="mt-4">
          <ECGWaveform
            ecgData={ecgBuffer.length > 0 ? ecgBuffer : latest.ecg_data}
            height={200}
          />
        </div>
      )}
    </div>
  );
}