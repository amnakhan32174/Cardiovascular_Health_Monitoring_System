import React, { useEffect, useState, useRef } from "react";
import { Activity, Heart, Droplets } from "lucide-react";

interface LiveSensorProps {
  deviceId?: string;
  onVitalsUpdate?: (vitals: any) => void;
}

export default function LiveSensor({ deviceId, onVitalsUpdate }: LiveSensorProps) {
  const [vitals, setVitals] = useState({
    hr: 0,
    spo2: 0,
    sbp: 0,
    dbp: 0,
    mean_bp: 0,
    smoothed_hr: 0,
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Simulate sensor connection
    setIsConnected(true);

    // Simulate real-time data
    const interval = setInterval(() => {
      const newVitals = {
        hr: Math.floor(60 + Math.random() * 40),
        smoothed_hr: Math.floor(65 + Math.random() * 30),
        spo2: Math.floor(94 + Math.random() * 6),
        sbp: Math.floor(110 + Math.random() * 30),
        dbp: Math.floor(70 + Math.random() * 20),
        mean_bp: Math.floor(80 + Math.random() * 20),
      };
      
      setVitals(newVitals);
      
      if (onVitalsUpdate) {
        onVitalsUpdate(newVitals);
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      setIsConnected(false);
    };
  }, [deviceId, onVitalsUpdate]);

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}></div>
        <span className="text-sm text-slate-600">
          {isConnected ? "Sensor Connected" : "Disconnected"}
        </span>
      </div>

      {/* Vitals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-rose-50 to-rose-100 border-2 border-rose-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-rose-200 rounded-lg">
              <Heart className="w-6 h-6 text-rose-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-rose-700">Heart Rate</p>
            </div>
          </div>
          <p className="text-4xl font-bold text-rose-700">
            {vitals.hr || vitals.smoothed_hr || "—"}
          </p>
          <p className="text-sm text-rose-600 mt-1">BPM</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-200 rounded-lg">
              <Activity className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-700">Blood Pressure</p>
            </div>
          </div>
          <p className="text-4xl font-bold text-blue-700">
            {vitals.sbp && vitals.dbp ? `${vitals.sbp}/${vitals.dbp}` : "—"}
          </p>
          <p className="text-sm text-blue-600 mt-1">
            {vitals.mean_bp ? `Mean: ${Math.round(vitals.mean_bp)} mmHg` : "mmHg"}
          </p>
        </div>

        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-2 border-cyan-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-cyan-200 rounded-lg">
              <Droplets className="w-6 h-6 text-cyan-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-cyan-700">SpO₂</p>
            </div>
          </div>
          <p className="text-4xl font-bold text-cyan-700">
            {vitals.spo2 ? `${vitals.spo2}%` : "—"}
          </p>
          <p className="text-sm text-cyan-600 mt-1">Oxygen Saturation</p>
        </div>
      </div>

      {/* Waveform Placeholder */}
      <div className="bg-slate-900 rounded-xl p-6 border-2 border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-emerald-400">ECG Waveform</p>
          <span className="text-xs text-slate-400">Real-time monitoring</span>
        </div>
        <div className="h-32 bg-slate-800 rounded-lg flex items-center justify-center">
          <p className="text-emerald-400 text-sm animate-pulse">
            ⎯⎯⎯∿∿∿⎯⎯⎯∿∿∿⎯⎯⎯ Simulated ECG ⎯⎯⎯∿∿∿⎯⎯⎯∿∿∿⎯⎯⎯
          </p>
        </div>
      </div>
    </div>
  );
}
