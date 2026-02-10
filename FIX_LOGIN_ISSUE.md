# Fix: Firebase Login Error (auth/invalid-credential)

## 🔍 Problem
You're getting `Firebase: Error (auth/invalid-credential)` when trying to login after signing up.

## ✅ Solutions

### Solution 1: Verify Your Account Was Created

1. **Check Firebase Console:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project: `cardio-dashboard`
   - Go to **Authentication** → **Users**
   - Check if your email appears in the list

2. **If your account is NOT in Firebase:**
   - The signup might have failed silently
   - Try signing up again
   - Check browser console (F12) for any errors during signup

### Solution 2: Double-Check Your Credentials

1. **Email:**
   - Make sure you're using the EXACT email you signed up with
   - Check for typos (capitalization doesn't matter, but spelling does)
   - No extra spaces before/after

2. **Password:**
   - Make sure you're using the EXACT password you created
   - Check for typos
   - Password is case-sensitive

### Solution 3: Try Resetting Password

If you're not sure about your password:

1. Go to login page
2. Click "Forgot Password" (if available) or
3. Sign up again with a new account

### Solution 4: Check Browser Console

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Try to login again
4. Look for any error messages
5. Share the error code (e.g., `auth/invalid-credential`, `auth/user-not-found`)

### Solution 5: Clear Browser Data

Sometimes cached data can cause issues:

1. Clear browser cache
2. Clear localStorage:
   - Open DevTools (F12)
   - Go to **Console** tab
   - Type: `localStorage.clear()`
   - Press Enter
   - Refresh the page
3. Try signing up and logging in again

### Solution 6: Verify Firebase Configuration

Make sure your Firebase config is correct:

1. Check `frontend/src/firebase.js`
2. Verify the Firebase project settings match
3. Check Firebase Console → Project Settings → General
4. Make sure Authentication is enabled

## 🔧 Quick Test

### Test 1: Create a New Account
1. Go to Sign Up page
2. Use a **different email** (e.g., `test@example.com`)
3. Use a simple password (at least 6 characters)
4. Complete signup
5. Try logging in immediately

### Test 2: Check Firebase Console
1. Go to Firebase Console
2. Authentication → Users
3. See if your account appears
4. If it does, the issue is with login credentials
5. If it doesn't, the issue is with signup

## 📝 Common Causes

1. **Typo in email or password** - Most common!
2. **Account not actually created** - Signup failed silently
3. **Email verification required** - Check if enabled in Firebase
4. **Network issues** - Check internet connection
5. **Firebase configuration wrong** - Check firebase.js

## 🆘 Still Not Working?

1. **Check all error messages:**
   - Browser console (F12)
   - Network tab for failed requests
   - Firebase Console → Authentication → Users

2. **Try these steps:**
   - Sign up with a completely new email
   - Use a simple password (e.g., `test123`)
   - Try logging in immediately after signup
   - Check if account appears in Firebase Console

3. **Share these details:**
   - What error message you see (exact text)
   - Browser console errors (F12 → Console)
   - Whether account appears in Firebase Console
   - Whether signup shows "Account created successfully"

## 💡 Pro Tips

1. **Use a password manager** to avoid typos
2. **Copy-paste email** instead of typing
3. **Check Firebase Console** to verify account creation
4. **Try incognito mode** to rule out cache issues
5. **Check network tab** in DevTools for failed requests
