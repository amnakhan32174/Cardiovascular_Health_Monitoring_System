import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Send, ArrowLeft, AlertCircle, AlertTriangle, MessageCircle } from "lucide-react";
import io from "socket.io-client";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function ContactDoctor() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [urgency, setUrgency] = useState("Normal");
  const [chat, setChat] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected to chat server");
      setIsConnected(true);
      
      const userId = localStorage.getItem("userId") || "patient-001";
      socket.emit("join_room", { userId, role: "patient" });
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from chat server");
      setIsConnected(false);
    });

    socket.on("chat_message", (data: any) => {
      setChat(prev => [...prev, {
        text: data.message,
        sender: data.sender || "Doctor",
        urgency: data.urgency || "Normal",
        time: new Date(data.timestamp || Date.now()).toLocaleTimeString(),
        id: data.id || Date.now()
      }]);
    });

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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

    setChat(prev => [...prev, newMessage]);
    setMessage("");

    if (socketRef.current && isConnected) {
      socketRef.current.emit("chat_message", {
        message: newMessage.text,
        sender: "Patient",
        urgency: newMessage.urgency,
        timestamp: newMessage.timestamp
      });
    }

    try {
      await addDoc(collection(db, "chatMessages"), {
        ...newMessage,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error saving message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getUrgencyStyles = (urgency: string) => {
    switch (urgency) {
      case "Emergency":
        return {
          bg: "bg-red-100 border-l-4 border-red-500",
          badge: "bg-red-500 text-white",
          icon: <AlertCircle className="w-4 h-4" />
        };
      case "Urgent":
        return {
          bg: "bg-amber-100 border-l-4 border-amber-500",
          badge: "bg-amber-500 text-white",
          icon: <AlertTriangle className="w-4 h-4" />
        };
      default:
        return {
          bg: "bg-blue-50 border-l-4 border-blue-300",
          badge: "bg-blue-500 text-white",
          icon: null
        };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-rose-50 p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.05),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(244,63,94,0.05),transparent_50%)]"></div>
      
      <div className="relative max-w-4xl mx-auto">
        <div className="bg-white/90 backdrop-blur-sm p-6 shadow-2xl rounded-2xl border-2 border-blue-200">
          <div className="flex items-center justify-between mb-6 pb-6 border-b-2 border-blue-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-rose-500 rounded-xl">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-rose-600 bg-clip-text text-transparent">
                  Contact Doctor
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Real-time chat with your healthcare provider
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></div>
                <span className="text-xs text-slate-600 font-medium">
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>
          </div>

          {/* Urgency Selector */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Message Urgency Level
            </label>
            <select
              className="w-full p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
            >
              <option value="Normal">Normal</option>
              <option value="Urgent">Urgent</option>
              <option value="Emergency">Emergency</option>
            </select>
          </div>

          {/* Chat Display */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 rounded-xl h-96 overflow-y-auto mb-4 border-2 border-blue-100">
            {chat.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="p-4 bg-blue-100 rounded-full mb-4">
                  <MessageCircle className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-slate-500 font-medium">No messages yet</p>
                <p className="text-sm text-slate-400 mt-1">Start a conversation with your doctor</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chat.map((msg) => {
                  const urgencyStyles = getUrgencyStyles(msg.urgency);
                  return (
                    <div
                      key={msg.id || Date.now()}
                      className={`p-4 rounded-xl shadow-md ${
                        msg.sender === "Patient"
                          ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white ml-auto max-w-[80%]"
                          : "bg-white mr-auto max-w-[80%] border-2 border-blue-100"
                      } ${msg.urgency !== "Normal" && msg.sender === "Patient" ? urgencyStyles.bg : ""}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold text-sm ${msg.sender === "Patient" ? "text-white" : "text-slate-900"}`}>
                            {msg.sender}
                          </span>
                          {msg.urgency !== "Normal" && msg.sender === "Patient" && (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-full ${urgencyStyles.badge}`}>
                              {urgencyStyles.icon}
                              {msg.urgency}
                            </span>
                          )}
                        </div>
                        <span className={`text-xs ${msg.sender === "Patient" ? "text-blue-100" : "text-slate-500"}`}>
                          {msg.time}
                        </span>
                      </div>
                      <p className={`${msg.sender === "Patient" ? "text-white" : "text-slate-800"} whitespace-pre-wrap`}>
                        {msg.text}
                      </p>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Input Field */}
          <div className="flex gap-2 mb-4">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Type your message to the doctor... (Press Enter to send)"
              rows={3}
            ></textarea>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-semibold transition-all border-2 border-slate-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <button
              onClick={sendMessage}
              disabled={!message.trim() || !isConnected}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              <Send className="w-4 h-4" />
              Send Message
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
