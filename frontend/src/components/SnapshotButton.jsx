import React, { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export default function SnapshotButton({ currentVitals, onSnapshotTaken }) {
  const [isCapturing, setIsCapturing] = useState(false);

  const handleSnapshot = async () => {
    if (!currentVitals) {
      alert("No vitals data available to capture");
      return;
    }

    setIsCapturing(true);
    try {
      const snapshot = {
        patient_id: localStorage.getItem("userId") || "patient-001",
        heart_rate: currentVitals.hr,
        systolic_bp: currentVitals.sbp,
        diastolic_bp: currentVitals.dbp,
        spo2: currentVitals.spo2,
        blood_sugar: currentVitals.blood_sugar,
        ecg_snapshot: currentVitals.ecg_data,
        snapshot_type: "manual",
        trigger_reason: "Manual capture by patient",
        timestamp: serverTimestamp(),
        created_at: new Date().toISOString()
      };

      await addDoc(collection(db, "vitalsSnapshots"), snapshot);
      
      alert(`✅ Snapshot captured successfully!\nHR: ${currentVitals.hr || 'N/A'} | BP: ${currentVitals.sbp || 'N/A'}/${currentVitals.dbp || 'N/A'} | SpO₂: ${currentVitals.spo2 || 'N/A'}`);
      
      if (onSnapshotTaken) onSnapshotTaken(snapshot);
    } catch (error) {
      console.error("Error capturing snapshot:", error);
      alert("❌ Error capturing snapshot. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <button
      onClick={handleSnapshot}
      disabled={isCapturing || !currentVitals}
      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
      title="Capture current vitals snapshot"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      {isCapturing ? "Capturing..." : "Capture Snapshot"}
    </button>
  );
}



