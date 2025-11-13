import React from "react";

export default function Card({ title, children, height = "220px" }) {
  return (
    <div
      className="p-6 bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 mb-6"
      style={{ minHeight: height }}
    >
      <h2 className="text-xl font-semibold text-gray-700 mb-4">{title}</h2>
      {children}
    </div>
  );
}
