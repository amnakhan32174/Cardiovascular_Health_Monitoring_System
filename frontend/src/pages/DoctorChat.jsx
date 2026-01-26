import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function DoctorChat() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    loadPatient();
    setupSocket();
    loadChatHistory();
  }, [patientId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const loadPatient = async () => {
    try {
      const patientDoc = await getDoc(doc(db, "users", patientId));
      if (patientDoc.exists()) {
        setPatient({ id: patientDoc.id, ...patientDoc.data() });
      }
    } catch (error) {
      console.error("Error loading patient:", error);
    }
  };

  const setupSocket = () => {
    socketRef.current = io(SOCKET_URL);
    const socket = socketRef.current;

    socket.on("connect", () => {
      setIsConnected(true);
      const doctorId = localStorage.getItem("userId");
      socket.emit("join_room", { userId: doctorId, role: "doctor", patientId });
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("chat_message", (data) => {
      if (data.sender === "Patient") {
        setChat(prev => [...prev, {
          text: data.message,
          sender: "Patient",
          urgency: data.urgency || "Normal",
          time: new Date(data.timestamp || Date.now()).toLocaleTimeString(),
          id: data.id || Date.now()
        }]);
      }
    });

    return () => socket.disconnect();
  };

  const loadChatHistory = () => {
    if (!patientId) return;

    const chatRef = collection(db, "chatMessages");
    // Note: In production, you'd want to filter by both patientId and doctorId
    // For now, we'll get all messages and filter client-side
    const q = query(
      chatRef,
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Filter messages for this patient or where patientId matches
        if (data.patientId === patientId || 
            (data.sender === "Patient" && !data.patientId)) {
          messages.push({ id: doc.id, ...data });
        }
      });
      setChat(messages);
    });

    return unsubscribe;
  };

  const sendMessage = async () => {
    if (message.trim() === "") return;

    const newMessage = {
      text: message,
      sender: "Doctor",
      time: new Date().toLocaleTimeString(),
      id: Date.now(),
      timestamp: new Date().toISOString(),
      patientId: patientId
    };

    setChat(prev => [...prev, newMessage]);
    setMessage("");

    if (socketRef.current && isConnected) {
      socketRef.current.emit("chat_message", {
        message: newMessage.text,
        sender: "Doctor",
        timestamp: newMessage.timestamp,
        patientId: patientId
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

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!patient) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Loading patient information...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg">
          {/* Header */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <button
                  onClick={() => navigate("/doctor-dashboard")}
                  className="text-slate-600 hover:text-slate-900 mb-2 text-sm font-medium"
                >
                  ← Back to Dashboard
                </button>
                <h2 className="text-2xl font-bold text-slate-900">
                  Chat with {patient.name || "Patient"}
                </h2>
                <p className="text-sm text-slate-600 mt-1">{patient.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"}`}></div>
                <span className="text-xs text-slate-600">
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>
          </div>

          {/* Chat Display */}
          <div className="bg-slate-50 p-6 h-96 overflow-y-auto border-b border-slate-200">
            {chat.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-500">No messages yet. Start the conversation.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chat.map((msg) => (
                  <div
                    key={msg.id || Date.now()}
                    className={`p-3 rounded-lg ${
                      msg.sender === "Doctor"
                        ? "bg-blue-50 ml-auto max-w-[80%]"
                        : "bg-white mr-auto max-w-[80%]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-900 text-sm">
                        {msg.sender}
                      </span>
                      <span className="text-xs text-slate-500">{msg.time}</span>
                    </div>
                    <p className="text-slate-800 whitespace-pre-wrap">{msg.text}</p>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Input Field */}
          <div className="p-6">
            <div className="flex gap-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                placeholder="Type your message... (Press Enter to send)"
                rows="3"
              ></textarea>
            </div>

            <div className="flex justify-end mt-4">
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
    </div>
  );
}

