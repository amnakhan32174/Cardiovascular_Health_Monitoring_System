// src/app/pages/Profile.tsx
import React, { useState, useEffect } from "react";
import { User, Save, Camera, CheckCircle } from "lucide-react";
import SidebarLayout from "../components/Sidebar";

export default function Profile() {
  const role = (localStorage.getItem("userRole") || "patient") as "patient" | "doctor" | "admin";
  const [profile, setProfile] = useState({ name: "", age: "", sex: "" });
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    const s = localStorage.getItem("userProfile");
    if (s) { try { setProfile(JSON.parse(s)); } catch {} }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("userProfile", JSON.stringify(profile));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const email  = JSON.parse(localStorage.getItem("userData") || "{}").email || "—";
  const initials = profile.name
    ? profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <SidebarLayout role={role}>
      <div className="p-6 max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Edit Profile</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Manage your personal information</p>
        </div>

        {/* Avatar card */}
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 shadow-sm">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-rose-500/30">
                {initials}
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[var(--card)] border-2 border-[var(--border)] rounded-lg flex items-center justify-center cursor-pointer hover:bg-[var(--muted)] transition">
                <Camera className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
              </div>
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--foreground)]">{profile.name || "Your Name"}</p>
              <p className="text-sm text-[var(--muted-foreground)]">{email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-semibold rounded-full capitalize">
                {role}
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 shadow-sm">
          <h3 className="text-base font-semibold text-[var(--foreground)] mb-5">Personal Information</h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Full Name</label>
              <input
                type="text" name="name" value={profile.name} onChange={handleChange}
                className="w-full p-3 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-[var(--input-background)] text-sm transition"
                placeholder="Enter your full name" required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Age</label>
                <input
                  type="number" name="age" value={profile.age} onChange={handleChange}
                  className="w-full p-3 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-[var(--input-background)] text-sm transition"
                  placeholder="Age" min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Sex</label>
                <select
                  name="sex" value={profile.sex} onChange={handleChange}
                  className="w-full p-3 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-[var(--input-background)] text-sm transition"
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${
                saved
                  ? "bg-emerald-500 text-white"
                  : "bg-rose-500 text-white hover:bg-rose-600"
              }`}
            >
              {saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Profile</>}
            </button>
          </form>
        </div>

        {/* Account info */}
        <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6 shadow-sm">
          <h3 className="text-base font-semibold text-[var(--foreground)] mb-4">Account Information</h3>
          <div className="space-y-3">
            {[
              { label: "Email",   value: email },
              { label: "Role",    value: role.charAt(0).toUpperCase() + role.slice(1) },
              { label: "User ID", value: localStorage.getItem("userId") || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
                <p className="text-sm font-medium text-[var(--foreground)] font-mono truncate max-w-[200px]">{value}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </SidebarLayout>
  );
}