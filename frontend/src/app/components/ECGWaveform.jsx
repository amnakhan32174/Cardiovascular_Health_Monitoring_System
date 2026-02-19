import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function ECGWaveform({ ecgData, height = 200 }) {
  // Generate sample ECG data if none provided
  const generateSampleECG = () => {
    const data = [];
    const sampleRate = 250; // samples per second
    const duration = 5; // seconds
    const totalSamples = sampleRate * duration;
    
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      // Simulate ECG waveform (PQRST complex)
      const value = 
        Math.sin(2 * Math.PI * 1 * t) * 0.3 + // P wave
        Math.sin(2 * Math.PI * 2 * t) * 0.8 + // QRS complex
        Math.sin(2 * Math.PI * 0.5 * t) * 0.2; // T wave
      
      data.push({
        time: t.toFixed(2),
        voltage: Math.round(value * 1000) / 1000,
        index: i
      });
    }
    return data;
  };

  const chartData = ecgData && Array.isArray(ecgData) && ecgData.length > 0
    ? ecgData.map((point, idx) => ({
        time: point.time || point.timestamp || idx,
        voltage: typeof point === 'number' ? point : (point.voltage || point.value || 0),
        index: idx
      }))
    : generateSampleECG();

  return (
    <div className="bg-card border border-[var(--border)] rounded-[var(--radius)] p-3">
      <div className="text-sm font-medium mb-2 text-[var(--foreground)]">ECG Waveform (Live)</div>
      <div style={{ width: "100%", height: height }}>
        <ResponsiveContainer>
          <LineChart data={chartData.slice(-500)} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <XAxis 
              dataKey="index" 
              hide 
              domain={['dataMin', 'dataMax']}
            />
            <YAxis 
              domain={['dataMin - 0.5', 'dataMax + 0.5']}
              tick={false}
              axisLine={false}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const val = payload[0].value;
                  const is12bit = typeof val === "number" && val >= 0 && val <= 4095;
                  return (
                    <div className="bg-white p-2 border border-slate-300 rounded shadow-lg">
                      <p className="text-xs text-slate-600">
                        {is12bit ? `ADC: ${Math.round(val)} (12-bit)` : `Value: ${val}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        Sample: {payload[0].payload.index}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="voltage"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-[var(--muted-foreground)] mt-1">
        {ecgData && ecgData.length > 0
          ? `Live ECG from sensor (${ecgData.length} samples)`
          : "Sample ECG Waveform (Demo)"}
      </div>
    </div>
  );
}



