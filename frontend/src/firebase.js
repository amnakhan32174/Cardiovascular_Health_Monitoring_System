// Import Firebase functions
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

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

// Enable offline persistence (optional, helps with offline support)
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.warn('Firestore persistence already enabled in another tab');
    } else if (err.code === 'unimplemented') {
      // The current browser does not support all of the features required
      console.warn('Firestore persistence not supported in this browser');
    }
  });
} catch (error) {
  console.warn('Error enabling Firestore persistence:', error);
}

export default app;