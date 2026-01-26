# Firebase Setup Guide

## Issue: "Failed to get document because the client is offline"

This error typically occurs when Firestore is not enabled or properly configured in your Firebase project.

## Steps to Fix:

### 1. Enable Firestore Database

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `cardio-dashboard`
3. Click on **Firestore Database** in the left sidebar
4. Click **Create Database**
5. Choose **Start in test mode** (for development)
6. Select a location (choose closest to you)
7. Click **Enable**

### 2. Set Firestore Security Rules

Go to **Firestore Database** → **Rules** tab and use these rules for development:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null; // Allow authenticated users to read
    }
    
    // Allow authenticated users to read/write their own data
    match /sensorData/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    match /chatMessages/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    match /patientQuestionnaires/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    match /bloodSugarReadings/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    match /vitalsSnapshots/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Click **Publish** to save the rules.

### 3. Verify Firebase Configuration

Make sure your `firebase.js` has the correct configuration. The current config should be:
- Project ID: `cardio-dashboard`
- API Key: (from Firebase Console → Project Settings)

### 4. Test Connection

After enabling Firestore:
1. Refresh your browser
2. Try signing up again as a doctor
3. Try logging in

## Alternative: Use LocalStorage Fallback

The code has been updated to use localStorage as a fallback if Firestore is unavailable. However, for full functionality, you should enable Firestore.

## Troubleshooting

If you still see errors:

1. **Check Browser Console** - Look for specific Firebase errors
2. **Check Network Tab** - See if requests to Firestore are being blocked
3. **Verify Internet Connection** - Firestore requires internet access
4. **Check Firebase Project** - Make sure you're using the correct project

## Production Setup

For production, you'll want stricter security rules that:
- Only allow users to read/write their own data
- Implement proper role-based access control
- Add validation for data structure



