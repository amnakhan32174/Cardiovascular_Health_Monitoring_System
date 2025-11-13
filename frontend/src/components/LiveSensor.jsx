// frontend/src/components/LiveSensor.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebase"; // adjust path if needed
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc
} from "firebase/firestore";

/*
This component listens to the 'sensorData' collection (latest document per device)
and shows the most recent reading. It uses Firestore onSnapshot for real-time updates.
*/

export default function LiveSensor({ deviceId = null }) {
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Query latest entries. If deviceId provided, filter by deviceId field
    let q;
    const colRef = collection(db, "sensorData");

    if (deviceId) {
      // If you store each device under its own doc ID, you can listen to that doc instead.
      // For this code, we assume sensorData is a collection of documents for each reading.
      q = query(colRef, orderBy("timestamp", "desc"), limit(50));
    } else {
      q = query(colRef, orderBy("timestamp", "desc"), limit(50));
    }

    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        setLatest(null);
        setLoading(false);
        return;
      }
      // convert to array of docs
      const readings = [];
      snap.forEach((d) => {
        const data = d.data();
        readings.push({ id: d.id, ...data });
      });

      // if deviceId provided, find newest for that device; else take latest overall
      let newest = null;
      if (deviceId) {
        newest = readings.find((r) => r.deviceId === deviceId) || readings[0];
      } else {
        newest = readings[0];
      }
      setLatest(newest);
      setLoading(false);
    }, (err) => {
      console.error("Firestore onSnapshot error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [deviceId]);

  if (loading) return <div className="p-4">Loading live data…</div>;

  if (!latest) {
    return (
      <div className="p-4 bg-white rounded shadow">
        <div className="text-sm text-gray-500">No data yet</div>
      </div>
    );
  }

  // Display fields you have (hr, spo2, sbp, dbp)
  return (
    <div className="p-4 bg-white rounded-2xl shadow">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">Device</div>
          <div className="text-lg font-semibold">{latest.deviceId || "device"}</div>
        </div>
        <div className="text-sm text-gray-400">{new Date(latest.timestamp?.toDate?.() || Date.now()).toLocaleString()}</div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="p-3 bg-gray-50 rounded">
          <div className="text-xs text-gray-500">HR</div>
          <div className="text-2xl font-bold">{latest.hr ?? "—"}</div>
        </div>

        <div className="p-3 bg-gray-50 rounded">
          <div className="text-xs text-gray-500">SpO₂</div>
          <div className="text-2xl font-bold">{latest.spo2 ?? "—"}</div>
        </div>

        <div className="p-3 bg-gray-50 rounded">
          <div className="text-xs text-gray-500">SBP</div>
          <div className="text-2xl font-bold">{latest.sbp ?? "—"}</div>
        </div>

        <div className="p-3 bg-gray-50 rounded">
          <div className="text-xs text-gray-500">DBP</div>
          <div className="text-2xl font-bold">{latest.dbp ?? "—"}</div>
        </div>
      </div>
    </div>
  );
}
