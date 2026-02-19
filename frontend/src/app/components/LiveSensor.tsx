import React, { useEffect, useState } from "react";
import { Activity } from "lucide-react";

interface LiveSensorProps {
  deviceId?: string;
  onVitalsUpdate?: (vitals: any) => void;
}

export default function LiveSensor({ deviceId, onVitalsUpdate }: LiveSensorProps) {
  const [vitals, setVitals] = useState({
    mean_bp: 0,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

    const fetchPrediction = async () => {
      try {
        setError(null);
        const response = await fetch(`${backendUrl}/api/predict-from-csv`);
        const payload = await response.json();
        if (!response.ok || !payload?.data) {
          throw new Error(payload?.error || "Prediction failed");
        }

        const newVitals = { mean_bp: payload.data.mean_bp };
        if (!isMounted) return;
        setVitals(newVitals);
        setIsConnected(true);
        if (onVitalsUpdate) {
          onVitalsUpdate(newVitals);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || "Failed to load prediction");
        setIsConnected(false);
      }
    };

    fetchPrediction();

    return () => {
      isMounted = false;
    };
  }, [deviceId, onVitalsUpdate]);

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}></div>
        <span className="text-sm text-[var(--muted-foreground)]">
          {error ? "Prediction Error" : isConnected ? "Sensor Connected" : "Disconnected"}
        </span>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Vitals Grid */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-[var(--muted)] border border-[var(--border)] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-[var(--accent)] rounded-lg">
              <Activity className="w-6 h-6 text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Mean Arterial Pressure</p>
            </div>
          </div>
          <p className="text-4xl font-bold text-[var(--foreground)]">
            {vitals.mean_bp ? Math.round(vitals.mean_bp) : "—"}
          </p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">mmHg</p>
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
