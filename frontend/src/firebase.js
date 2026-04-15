// Import Firebase functions
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";

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

// Use modern persistent cache (replaces deprecated enableIndexedDbPersistence).
// This does NOT interfere with getDocFromServer unlike the old API.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});

export default app;