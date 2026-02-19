import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Send, ArrowLeft, AlertCircle, AlertTriangle, MessageCircle } from "lucide-react";
import io from "socket.io-client";
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, where } from "firebase/firestore";
import { db } from "../../firebase";

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export default function ContactDoctor() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [urgency, setUrgency] = useState("Normal");
  const [chat, setChat] = useState<any[]>([]);
  const [assignedDoctorId, setAssignedDoctorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "patient") {
      navigate(role === "doctor" ? "/doctor-dashboard" : "/login");
      return;
    }

    const userId = localStorage.getItem("userId");
    if (!userId) {
      navigate("/login");
      return;
    }

    const loadPatient = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) {
          console.warn("User doc not found for patient");
          setAssignedDoctorId(null);
        } else {
          const data: any = userDoc.data();
          setAssignedDoctorId(data.assignedDoctorId || null);
        }
      } catch (error) {
        console.error("Error loading patient profile:", error);
        setAssignedDoctorId(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadPatient();

    socketRef.current = io(SOCKET_URL);
    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected to chat server");
      setIsConnected(true);

      socket.emit("join_room", { userId, role: "patient" });
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from chat server");
      setIsConnected(false);
    });

    socket.on("chat_message", (data: any) => {
      if (!userId || !assignedDoctorId) return;
      if (data.patientId !== userId || data.doctorId !== assignedDoctorId) return;
      setChat(prev => [...prev, {
        text: data.message,
        sender: data.sender || "Doctor",
        urgency: data.urgency || "Normal",
        time: new Date(data.timestamp || Date.now()).toLocaleTimeString(),
        id: data.id || Date.now()
      }]);
    });

    return () => {
      socket.disconnect();
    };
  }, [assignedDoctorId, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId || !assignedDoctorId) return;

    const chatRef = collection(db, "chatMessages");
    const q = query(
      chatRef,
      where("patientId", "==", userId),
      where("doctorId", "==", assignedDoctorId),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        messages.push({
          id: docSnap.id,
          ...data,
          time: data.timestamp?.toDate
            ? data.timestamp.toDate().toLocaleTimeString()
            : new Date(data.createdAt || Date.now()).toLocaleTimeString()
        });
      });
      setChat(messages);
    });

    return () => unsubscribe();
  }, [assignedDoctorId]);

  const sendMessage = async () => {
    if (message.trim() === "") return;
    const userId = localStorage.getItem("userId");
    if (!userId || !assignedDoctorId) return;

    const newMessage = {
      text: message,
      urgency,
      sender: "Patient",
      patientId: userId,
      doctorId: assignedDoctorId,
      readByDoctor: false,
      readAt: null,
      time: new Date().toLocaleTimeString(),
      id: Date.now(),
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    setChat(prev => [...prev, newMessage]);
    setMessage("");

    if (socketRef.current && isConnected) {
      socketRef.current.emit("chat_message", {
        message: newMessage.text,
        sender: "Patient",
        urgency: newMessage.urgency,
        timestamp: newMessage.timestamp,
        patientId: newMessage.patientId,
        doctorId: newMessage.doctorId
      });
    }

    try {
      await addDoc(collection(db, "chatMessages"), {
        ...newMessage,
        timestamp: serverTimestamp(),
        createdAt: newMessage.createdAt
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
          bg: "bg-[var(--accent)] border-l-4 border-[var(--primary)]",
          badge: "bg-[var(--primary)] text-white",
          icon: null
        };
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[var(--card)] p-6 shadow-sm rounded-xl border border-[var(--border)]">
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-[var(--border)]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[var(--primary)] rounded-xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--foreground)]">
                  Contact Doctor
                </h2>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
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
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Message Urgency Level
            </label>
            <select
              className="w-full p-3 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] font-medium bg-[var(--input-background)]"
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
            >
              <option value="Normal">Normal</option>
              <option value="Urgent">Urgent</option>
              <option value="Emergency">Emergency</option>
            </select>
          </div>

          {/* Chat Display */}
          <div className="bg-[var(--muted)] p-4 rounded-xl h-96 overflow-y-auto mb-4 border border-[var(--border)]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-[var(--primary)] border-t-transparent mb-3"></div>
                <p className="text-[var(--muted-foreground)] font-medium">Loading messages...</p>
              </div>
            ) : !assignedDoctorId ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="p-4 bg-amber-100 rounded-full mb-4">
                  <AlertTriangle className="w-8 h-8 text-amber-600" />
                </div>
                <p className="text-slate-700 font-medium">No doctor assigned</p>
                <p className="text-sm text-slate-500 mt-1">
                  Please contact support to assign a doctor to your account.
                </p>
              </div>
            ) : chat.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="p-4 bg-[var(--accent)] rounded-full mb-4">
                  <MessageCircle className="w-8 h-8 text-[var(--primary)]" />
                </div>
                <p className="text-[var(--muted-foreground)] font-medium">No messages yet</p>
                <p className="text-sm text-slate-400 mt-1">Start a conversation with your doctor</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chat.map((msg) => {
                  const urgencyStyles = getUrgencyStyles(msg.urgency);
                  return (
                    <div
                      key={msg.id || Date.now()}
                      className={`p-4 rounded-xl shadow-sm ${msg.sender === "Patient"
                          ? "bg-[var(--primary)] text-white ml-auto max-w-[80%]"
                          : "bg-[var(--card)] mr-auto max-w-[80%] border border-[var(--border)]"
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
              className="flex-1 p-3 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] resize-none bg-[var(--input-background)]"
              placeholder="Type your message to the doctor... (Press Enter to send)"
              rows={3}
            ></textarea>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--muted)] text-[var(--foreground)] rounded-lg hover:bg-[var(--secondary)] font-medium transition border border-[var(--border)]"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <button
              onClick={sendMessage}
              disabled={!message.trim() || !isConnected || !assignedDoctorId}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-lg hover:bg-orange-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
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
