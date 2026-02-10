import React, { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";
import { Droplet, Check } from "lucide-react";

interface BloodSugarFormProps {
  onSuccess?: (reading: any) => void;
}

export default function BloodSugarForm({ onSuccess }: BloodSugarFormProps) {
  const [bloodSugar, setBloodSugar] = useState("");
  const [mealTiming, setMealTiming] = useState("fasting");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const reading = {
        blood_sugar: parseFloat(bloodSugar),
        meal_timing: mealTiming,
        notes: notes,
        timestamp: serverTimestamp(),
      };

      await addDoc(collection(db, "bloodSugarReadings"), reading);

      if (onSuccess) {
        onSuccess({ ...reading, blood_sugar: parseFloat(bloodSugar) });
      }

      alert("Blood sugar reading saved successfully!");
      setBloodSugar("");
      setNotes("");
    } catch (error) {
      console.error("Error saving blood sugar:", error);
      alert("Failed to save reading. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-100 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl">
          <Droplet className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Blood Sugar Reading</h2>
          <p className="text-sm text-slate-600">Manual glucose level entry</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Blood Sugar Level (mg/dL)
          </label>
          <input
            type="number"
            step="0.1"
            value={bloodSugar}
            onChange={(e) => setBloodSugar(e.target.value)}
            className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition"
            placeholder="Enter blood sugar reading"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Meal Timing
          </label>
          <select
            value={mealTiming}
            onChange={(e) => setMealTiming(e.target.value)}
            className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition"
          >
            <option value="fasting">Fasting</option>
            <option value="before_meal">Before Meal</option>
            <option value="after_meal">After Meal (2 hours)</option>
            <option value="bedtime">Bedtime</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition resize-none"
            placeholder="Add any relevant notes..."
            rows={3}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-lg font-semibold hover:from-rose-600 hover:to-rose-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Saving...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Save Reading
            </>
          )}
        </button>
      </form>
    </div>
  );
}
