import React, { useState } from "react";

export default function ContactDoctor() {
  const [message, setMessage] = useState("");
  const [urgency, setUrgency] = useState("Normal");
  const [chat, setChat] = useState([]);

  const sendMessage = () => {
    if (message.trim() === "") return;
    const newMessage = { text: message, urgency, sender: "Patient", time: new Date().toLocaleTimeString() };
    setChat([...chat, newMessage]);
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto bg-white p-6 shadow-lg rounded-2xl">
        <h2 className="text-2xl font-bold text-blue-700 mb-4">Contact Doctor</h2>

        {/* Urgency Selector */}
        <label className="block font-medium mb-2">Select Urgency</label>
        <select
          className="w-full p-2 border rounded mb-4"
          value={urgency}
          onChange={(e) => setUrgency(e.target.value)}
        >
          <option value="Normal">Normal</option>
          <option value="Urgent">Urgent</option>
          <option value="Emergency">Emergency</option>
        </select>

        {/* Chat Display */}
        <div className="bg-gray-100 p-4 rounded-lg h-64 overflow-y-scroll mb-4">
          {chat.length === 0 ? (
            <p className="text-gray-500">No messages yet</p>
          ) : (
            chat.map((msg, index) => (
              <div key={index} className="mb-3">
                <p className="text-sm text-gray-800">
                  <strong>{msg.sender}</strong> ({msg.urgency}) <span className="text-gray-500 text-xs">{msg.time}</span>
                </p>
                <p className="bg-white p-2 rounded shadow">{msg.text}</p>
              </div>
            ))
          )}
        </div>

        {/* Input Field */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full p-3 border rounded-lg mb-4"
          placeholder="Type your message to the doctor..."
        ></textarea>

        <div className="flex justify-between">
          <button
            onClick={sendMessage}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Send Message
          </button>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
