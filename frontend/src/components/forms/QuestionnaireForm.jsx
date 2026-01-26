import React, { useState, useEffect } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

export default function QuestionnaireForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    smoking_status: "",
    exercise_frequency: "",
    diet_type: "",
    sleep_hours: "",
    has_hypertension: false,
    has_diabetes: false,
    has_heart_disease: false,
    medications: "",
    family_history: "",
    additional_notes: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => {
    // Load saved questionnaire from localStorage
    const saved = localStorage.getItem("patientQuestionnaire");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(parsed);
        setLastSaved(parsed.lastSaved);
      } catch (e) {
        console.error("Error loading saved questionnaire:", e);
      }
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const questionnaire = {
        ...formData,
        timestamp: serverTimestamp(),
        updated_at: new Date().toISOString()
      };

      await addDoc(collection(db, "patientQuestionnaires"), questionnaire);
      
      // Save to localStorage
      localStorage.setItem("patientQuestionnaire", JSON.stringify({
        ...formData,
        lastSaved: new Date().toISOString()
      }));

      setLastSaved(new Date().toISOString());
      alert("✅ Health questionnaire saved successfully!");
      
      if (onSuccess) onSuccess(questionnaire);
    } catch (error) {
      console.error("Error saving questionnaire:", error);
      alert("❌ Error saving questionnaire. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Health Questionnaire</h3>
        {lastSaved && (
          <span className="text-xs text-slate-500">
            Last saved: {new Date(lastSaved).toLocaleString()}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Smoking Status */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Smoking Status
          </label>
          <select
            name="smoking_status"
            value={formData.smoking_status}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Select...</option>
            <option value="never">Never Smoked</option>
            <option value="former">Former Smoker</option>
            <option value="current">Current Smoker</option>
          </select>
        </div>

        {/* Exercise Frequency */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Exercise Frequency
          </label>
          <select
            name="exercise_frequency"
            value={formData.exercise_frequency}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Select...</option>
            <option value="none">No Exercise</option>
            <option value="1-2">1-2 times per week</option>
            <option value="3-4">3-4 times per week</option>
            <option value="5+">5+ times per week</option>
            <option value="daily">Daily</option>
          </select>
        </div>

        {/* Diet Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Diet Type
          </label>
          <select
            name="diet_type"
            value={formData.diet_type}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Select...</option>
            <option value="balanced">Balanced</option>
            <option value="vegetarian">Vegetarian</option>
            <option value="vegan">Vegan</option>
            <option value="low_carb">Low Carb</option>
            <option value="mediterranean">Mediterranean</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Sleep Hours */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Average Sleep Hours per Night
          </label>
          <input
            type="number"
            name="sleep_hours"
            min="0"
            max="24"
            value={formData.sleep_hours}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            placeholder="e.g., 7.5"
          />
        </div>

        {/* Medical Conditions */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Medical Conditions
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="has_hypertension"
                checked={formData.has_hypertension}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-sm text-slate-700">Hypertension (High Blood Pressure)</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="has_diabetes"
                checked={formData.has_diabetes}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-sm text-slate-700">Diabetes</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="has_heart_disease"
                checked={formData.has_heart_disease}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-sm text-slate-700">Heart Disease</span>
            </label>
          </div>
        </div>

        {/* Medications */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Current Medications
          </label>
          <textarea
            name="medications"
            value={formData.medications}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            placeholder="List your current medications..."
            rows="3"
          />
        </div>

        {/* Family History */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Family History
          </label>
          <textarea
            name="family_history"
            value={formData.family_history}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            placeholder="Any relevant family medical history..."
            rows="3"
          />
        </div>

        {/* Additional Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Additional Notes
          </label>
          <textarea
            name="additional_notes"
            value={formData.additional_notes}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            placeholder="Any other relevant information..."
            rows="3"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "Saving..." : "Save Questionnaire"}
        </button>
      </form>
    </div>
  );
}



