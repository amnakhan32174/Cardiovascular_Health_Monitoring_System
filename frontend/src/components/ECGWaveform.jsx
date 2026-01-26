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
    <div className="bg-white p-3 rounded border border-slate-200">
      <div className="text-sm text-slate-700 mb-2 font-semibold">ECG Waveform</div>
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
                  return (
                    <div className="bg-white p-2 border border-slate-300 rounded shadow-lg">
                      <p className="text-xs text-slate-600">
                        Voltage: {payload[0].value.toFixed(3)} mV
                      </p>
                      <p className="text-xs text-slate-500">
                        Time: {payload[0].payload.time}s
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
              stroke="#EF4444"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-slate-500 mt-1">
        {ecgData ? "Live ECG Data" : "Sample ECG Waveform (Demo)"}
      </div>
    </div>
  );
}



