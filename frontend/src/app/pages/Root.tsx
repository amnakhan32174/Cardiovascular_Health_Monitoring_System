import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Heart } from "lucide-react";

export default function Root() {
  const navigate = useNavigate();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    const userRole = localStorage.getItem("userRole");

    if (isLoggedIn === "true") {
      if (userRole === "doctor") {
        navigate("/doctor-dashboard");
      } else {
        navigate("/dashboard");
      }
    } else {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-rose-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(244,63,94,0.1),transparent_50%)]"></div>
      
      <div className="relative text-center">
        <div className="mb-8 flex justify-center">
          <div className="p-6 bg-gradient-to-br from-blue-500 to-rose-500 rounded-full animate-pulse">
            <Heart className="w-16 h-16 text-white" fill="white" />
          </div>
        </div>
        
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-rose-600 bg-clip-text text-transparent">
          CardioMonitor
        </h1>
        <p className="text-xl text-slate-600 mb-8">
          Cardiovascular Health Monitoring System
        </p>
        
        <div className="flex flex-col gap-4 items-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Initializing...</p>
        </div>
      </div>
    </div>
  );
}
