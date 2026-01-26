import React, { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

export default function BloodSugarForm({ onSuccess }) {
  const [bloodSugar, setBloodSugar] = useState("");
  const [mealType, setMealType] = useState("fasting");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bloodSugar || bloodSugar <= 0) {
      alert("Please enter a valid blood sugar reading");
      return;
    }

    setIsSubmitting(true);
    try {
      const reading = {
        blood_sugar: Number(bloodSugar),
        meal_type: mealType,
        notes: notes.trim() || null,
        timestamp: serverTimestamp(),
        type: "manual",
        source: "patient_input"
      };

      await addDoc(collection(db, "bloodSugarReadings"), reading);
      
      // Also add to sensorData collection for consistency
      await addDoc(collection(db, "sensorData"), {
        deviceId: "manual-input",
        blood_sugar: Number(bloodSugar),
        timestamp: serverTimestamp(),
        meal_type: mealType,
        notes: notes.trim() || null
      });

      alert(`✅ Blood sugar reading (${bloodSugar} mg/dL) recorded successfully!`);
      
      // Reset form
      setBloodSugar("");
      setNotes("");
      setMealType("fasting");
      
      if (onSuccess) onSuccess(reading);
    } catch (error) {
      console.error("Error saving blood sugar:", error);
      alert("❌ Error saving reading. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (value) => {
    const val = Number(value);
    if (!val) return "text-slate-500";
    if (val < 70) return "text-red-600"; // Low
    if (val > 180) return "text-red-600"; // High
    if (val > 140) return "text-amber-600"; // Elevated
    return "text-emerald-600"; // Normal
  };

  const getStatusText = (value) => {
    const val = Number(value);
    if (!val) return "";
    if (val < 70) return "⚠️ Low";
    if (val > 180) return "⚠️ High";
    if (val > 140) return "⚠️ Elevated";
    return "✓ Normal";
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">Manual Blood Sugar Reading</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Blood Sugar Level (mg/dL)
          </label>
          <input
            type="number"
            min="0"
            max="600"
            step="1"
            value={bloodSugar}
            onChange={(e) => setBloodSugar(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Enter reading (e.g., 95)"
            required
          />
          {bloodSugar && (
            <div className={`mt-2 text-sm font-medium ${getStatusColor(bloodSugar)}`}>
              {getStatusText(bloodSugar)} (Normal range: 70-140 mg/dL)
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Meal Type
          </label>
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="fasting">Fasting</option>
            <option value="before_meal">Before Meal</option>
            <option value="after_meal">After Meal (Postprandial)</option>
            <option value="random">Random</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Any additional notes..."
            rows="3"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "Saving..." : "Save Reading"}
        </button>
      </form>
    </div>
  );
}



