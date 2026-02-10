// frontend/src/components/LiveSensor.jsx
import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import ECGWaveform from "./ECGWaveform";

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
const socket = io(SOCKET_URL);

export default function LiveSensor({ deviceId = null, onVitalsUpdate }) {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const maxPoints = 60;
  const histRef = useRef([]);

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
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="text-sm text-slate-500">⏳ Waiting for live data from ESP32...</div>
        <div className="text-xs text-slate-400 mt-2">
          Make sure your ESP32 is powered on and connected to WiFi
        </div>
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
          <div className={`text-2xl font-bold ${latest.hr === 0 ? 'text-slate-400' : 'text-slate-900'}`}>
            {latest.hr ?? "—"}
          </div>
          <div className="text-xs text-slate-400 mt-1">BPM</div>
        </div>

        <div className="p-3 bg-slate-50 rounded border border-slate-100">
          <div className="text-xs text-slate-500">SpO₂</div>
          <div className={`text-2xl font-bold ${latest.spo2 === 0 ? 'text-slate-400' : 'text-slate-900'}`}>
            {latest.spo2 ?? "—"}
          </div>
          <div className="text-xs text-slate-400 mt-1">%</div>
        </div>

        <div className="p-3 bg-slate-50 rounded border border-slate-100">
          <div className="text-xs text-slate-500">Blood Pressure</div>
          <div className={`text-xl font-bold ${(latest.sbp === 0 || !latest.sbp) ? 'text-slate-400' : 'text-slate-900'}`}>
            {latest.sbp && latest.dbp ? `${latest.sbp}/${latest.dbp}` : "—"}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {latest.mean_bp ? `(Mean: ${Math.round(latest.mean_bp)})` : "mmHg"}
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded border border-slate-100">
          <div className="text-xs text-slate-500">Blood Sugar</div>
          <div className={`text-2xl font-bold ${latest.blood_sugar ? 'text-slate-900' : 'text-slate-400'}`}>
            {latest.blood_sugar ?? "—"}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {latest.blood_sugar ? "mg/dL" : "Manual entry only"}
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded border border-slate-100">
          <div className="text-xs text-slate-500">Systolic BP</div>
          <div className={`text-2xl font-bold ${(latest.sbp === 0 || !latest.sbp) ? 'text-slate-400' : 'text-slate-900'}`}>
            {latest.sbp ?? "—"}
          </div>
          <div className="text-xs text-slate-400 mt-1">mmHg</div>
        </div>

        <div className="p-3 bg-slate-50 rounded border border-slate-100">
          <div className="text-xs text-slate-500">Diastolic BP</div>
          <div className={`text-2xl font-bold ${(latest.dbp === 0 || !latest.dbp) ? 'text-slate-400' : 'text-slate-900'}`}>
            {latest.dbp ?? "—"}
          </div>
          <div className="text-xs text-slate-400 mt-1">mmHg</div>
        </div>
      </div>

      {/* Status Messages */}
      {latest.hr === 0 && latest.spo2 === 0 && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800 font-semibold">⚠️ Sensor Not Detecting</p>
          <p className="text-xs text-amber-700 mt-1">
            Please check: 1) Finger is on sensor, 2) MAX30105 connections, 3) AD8232 ECG pads attached
          </p>
        </div>
      )}

      {!latest.sbp && latest.hr > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 font-semibold">ℹ️ ML Prediction Pending</p>
          <p className="text-xs text-blue-700 mt-1">
            Blood pressure will appear once ML model analyzes sensor data
          </p>
        </div>
      )}

      {/* Charts: HR, SpO2 */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-3 rounded border border-slate-200">
          <div className="text-sm text-slate-700 mb-2 font-semibold">
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
      {latest.ecg_data && latest.ecg_data.length > 0 && (
        <div className="mt-4">
          <ECGWaveform ecgData={latest.ecg_data} height={200} />
        </div>
      )}
    </div>
  );
}