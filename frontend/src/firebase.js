// Import Firebase functions
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // ✅ Add Firestore

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCTL7Seg_kAL7MHhB_ZAGiDDpANPWAwtF4",
  authDomain: "cardio-dashboard.firebaseapp.com",
  projectId: "cardio-dashboard",
  storageBucket: "cardio-dashboard.firebasestorage.app",
  messagingSenderId: "360671211659",
  appId: "1:360671211659:web:ea9292d45c98d0285a648e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); 
export default app;