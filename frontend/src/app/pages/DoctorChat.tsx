import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Send, MessageCircle, Stethoscope } from "lucide-react";
import io from "socket.io-client";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function DoctorChat() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
      if (!patientId) return;
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

    socket.on("chat_message", (data: any) => {
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
    const q = query(
      chatRef,
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!patient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading patient information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-rose-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.05),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(244,63,94,0.05),transparent_50%)]"></div>
      
      <div className="relative max-w-4xl mx-auto p-6">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border-2 border-blue-200 shadow-2xl">
          {/* Header */}
          <div className="p-6 border-b-2 border-blue-100 bg-gradient-to-r from-blue-50 to-rose-50">
            <button
              onClick={() => navigate("/doctor-dashboard")}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-3 text-sm font-semibold transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl">
                  <Stethoscope className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-rose-600 bg-clip-text text-transparent">
                    Chat with {patient.name || "Patient"}
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    {patient.email}
                    {patient.age && patient.sex && ` · Age ${patient.age} · ${patient.sex}`}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></div>
                <span className="text-xs text-slate-600 font-medium">
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>
          </div>

          {/* Chat Display */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 p-6 h-96 overflow-y-auto border-b-2 border-blue-100">
            {chat.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="p-4 bg-blue-100 rounded-full mb-4">
                  <MessageCircle className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-slate-500 font-medium">No messages yet</p>
                <p className="text-sm text-slate-400 mt-1">Start the conversation with your patient</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chat.map((msg) => (
                  <div
                    key={msg.id || Date.now()}
                    className={`p-4 rounded-xl shadow-md ${
                      msg.sender === "Doctor"
                        ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white ml-auto max-w-[80%]"
                        : "bg-white mr-auto max-w-[80%] border-2 border-rose-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-semibold text-sm ${msg.sender === "Doctor" ? "text-white" : "text-slate-900"}`}>
                        {msg.sender}
                      </span>
                      <span className={`text-xs ${msg.sender === "Doctor" ? "text-blue-100" : "text-slate-500"}`}>
                        {msg.time}
                      </span>
                    </div>
                    <p className={`${msg.sender === "Doctor" ? "text-white" : "text-slate-800"} whitespace-pre-wrap`}>
                      {msg.text}
                    </p>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Input Field */}
          <div className="p-6">
            <div className="flex gap-2 mb-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 p-3 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Type your message... (Press Enter to send)"
                rows={3}
              ></textarea>
            </div>

            <div className="flex justify-end">
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
    </div>
  );
}
