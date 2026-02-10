import React from "react";

export default function Card({ title, children, height = "220px", className = "" }) {
  return (
    <div
      className={`p-5 bg-white border border-slate-200/70 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 mb-6 ${className}`}
      style={{ minHeight: height }}
    >
      <h2 className="text-lg font-semibold text-slate-800 mb-3">{title}</h2>
      {children}
    </div>
  );
}
