import { createBrowserRouter, RouterProvider, Navigate } from "react-router";
import Login from "./pages/Login";
import LoginWrapper from "./pages/LoginWrapper";
import Signup from "./pages/Signup";
import Root from "./pages/Root";
import Dashboard from "./pages/Dashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ContactDoctor from "./pages/ContactDoctor";
import DoctorChat from "./pages/DoctorChat";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

const router = createBrowserRouter([
  { path: "/",                  element: <Root /> },
  { path: "/login",             element: <LoginWrapper /> },
  { path: "/signup",            element: <Signup /> },
  { path: "/dashboard",         element: <Dashboard /> },
  { path: "/doctor-dashboard",  element: <DoctorDashboard /> },
  { path: "/admin-dashboard",   element: <AdminDashboard /> },
  { path: "/contact-doctor",    element: <ContactDoctor /> },
  { path: "/doctor-chat/:patientId", element: <DoctorChat /> },
  { path: "/profile",           element: <Profile /> },
  { path: "/settings",          element: <Settings /> },
  { path: "*",                  element: <Navigate to="/" replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}