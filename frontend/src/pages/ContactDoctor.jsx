import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function ContactDoctor() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [urgency, setUrgency] = useState("Normal");
  const [chat, setChat] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    // Initialize Socket.IO connection
    socketRef.current = io(SOCKET_URL);
    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected to chat server");
      setIsConnected(true);
      
      // Join patient room
      const userId = localStorage.getItem("userId") || "patient-001";
      socket.emit("join_room", { userId, role: "patient" });
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from chat server");
      setIsConnected(false);
    });

    // Listen for incoming messages
    socket.on("chat_message", (data) => {
      setChat(prev => [...prev, {
        text: data.message,
        sender: data.sender || "Doctor",
        urgency: data.urgency || "Normal",
        time: new Date(data.timestamp || Date.now()).toLocaleTimeString(),
        id: data.id || Date.now()
      }]);
    });

    // Load chat history from localStorage
    const savedChat = localStorage.getItem("doctorChat");
    if (savedChat) {
      try {
        setChat(JSON.parse(savedChat));
      } catch (e) {
        console.error("Error loading chat history:", e);
      }
    }

    return () => {
      socket.disconnect();
    };
  }, []);

  // Scroll to bottom when new message arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    // Save chat to localStorage
    localStorage.setItem("doctorChat", JSON.stringify(chat));
  }, [chat]);

  const sendMessage = async () => {
    if (message.trim() === "") return;

    const newMessage = {
      text: message,
      urgency,
      sender: "Patient",
      time: new Date().toLocaleTimeString(),
      id: Date.now(),
      timestamp: new Date().toISOString()
    };

    // Add to local chat immediately
    setChat(prev => [...prev, newMessage]);
    setMessage("");

    // Send via Socket.IO
    if (socketRef.current && isConnected) {
      socketRef.current.emit("chat_message", {
        message: newMessage.text,
        sender: "Patient",
        urgency: newMessage.urgency,
        timestamp: newMessage.timestamp
      });
    }

    // Save to Firebase
    try {
      await addDoc(collection(db, "chatMessages"), {
        ...newMessage,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error saving message:", error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case "Emergency":
        return "bg-red-100 border-red-300 text-red-800";
      case "Urgent":
        return "bg-amber-100 border-amber-300 text-amber-800";
      default:
        return "bg-blue-100 border-blue-300 text-blue-800";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-6 shadow-xl rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Contact Doctor</h2>
              <p className="text-sm text-slate-600 mt-1">
                Real-time chat with your healthcare provider
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"}`}></div>
              <span className="text-xs text-slate-600">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>

          {/* Urgency Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Message Urgency Level
            </label>
            <select
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
            >
              <option value="Normal">Normal</option>
              <option value="Urgent">Urgent</option>
              <option value="Emergency">Emergency</option>
            </select>
          </div>

          {/* Chat Display */}
          <div className="bg-slate-50 p-4 rounded-lg h-96 overflow-y-auto mb-4 border border-slate-200">
            {chat.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-500">No messages yet. Start a conversation with your doctor.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chat.map((msg) => (
                  <div
                    key={msg.id || Date.now()}
                    className={`p-3 rounded-lg ${
                      msg.sender === "Patient"
                        ? "bg-emerald-50 ml-auto max-w-[80%]"
                        : "bg-white mr-auto max-w-[80%]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-900 text-sm">
                        {msg.sender}
                      </span>
                      <span className="text-xs text-slate-500">{msg.time}</span>
                    </div>
                    {msg.urgency !== "Normal" && (
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded mb-2 ${getUrgencyColor(
                          msg.urgency
                        )}`}
                      >
                        {msg.urgency}
                      </span>
                    )}
                    <p className="text-slate-800 whitespace-pre-wrap">{msg.text}</p>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Input Field */}
          <div className="flex gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
              placeholder="Type your message to the doctor... (Press Enter to send)"
              rows="3"
            ></textarea>
          </div>

          <div className="flex justify-between mt-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-semibold transition-colors"
            >
              Back to Dashboard
            </button>
            <button
              onClick={sendMessage}
              disabled={!message.trim() || !isConnected}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send Message
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
