// pages/hr-login.tsx
"use client";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import React, { useState, useEffect } from "react";
import app, { auth } from "@/firebase/config";
import { toast } from "react-toastify";
import { getDatabase, ref, get, set } from "firebase/database";
import Link from 'next/link';
import SignInWithGoogle from "../loginwithGoogle/SignInWithGoogle"

function HRLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const db = getDatabase(app);

  async function notifyExtensionOnLogin(uid: unknown) {
    try {
      const event = new CustomEvent("userLoggedIn", { detail: { uid } });
      document.dispatchEvent(event);
      return true;
    } catch (error) {
      console.error("Error notifying extension:", error);
      throw error;
    }
  }

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        await notifyExtensionOnLogin(user.uid);
        if (!user.emailVerified) {
          toast.error("Email not verified. Please verify before logging in.", {
            position: "bottom-center",
          });
        }
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      const user = auth.currentUser;

      if (user && user.emailVerified) {
        localStorage.setItem("UIDforHR", user.uid);
        localStorage.setItem("IsLoginAsHR", "true");

        //GET REFERRAL IF THERE IN COOKIE

        const getReferralCodeFromCookie = () => {
          const cookie = document.cookie.split('; ').find(row => row.startsWith('referral='));
          return cookie ? cookie.split('=')[1] : null;
        };
        const referralCode = getReferralCodeFromCookie()
        //** SAVE REFERAL CODE IN DATABASE  */
        const currentDate = new Date();
        const formattedDateTime = currentDate.toISOString().replace("T", " ").split(".")[0];
        const currentUser = auth?.currentUser?.uid;

        if (referralCode) {
          console.log("Save in database/firebase")
          console.log("login", user.uid)
          const newDocRef = ref(db, `/referrals/${referralCode}/${user.uid}`);
          console.log(newDocRef, typeof (newDocRef), "referrals");
          get(newDocRef).then((snapshot) => {
            if (!snapshot.exists()) {
              // If the referral code doesn't exist, create a new entry
              set(newDocRef, {
                signupDate: formattedDateTime,
                amount: 0,
              }).then(() => {

              })
            }
          })
        }

        // Only fetch Gemini API key
        const apiRef1 = ref(db, `hr/${user.uid}/API/apiKey`);
        const apiRef2 = ref(db, `hr/${user.uid}/API/apikey`);
        const apiSnapshot1 = await get(apiRef1);
        const apiSnapshot2 = await get(apiRef2);

        let apiKey = "";
        if (apiSnapshot1.exists()) {
          apiKey = apiSnapshot1.val();
        } else if (apiSnapshot2.exists()) {
          apiKey = apiSnapshot2.val();
        }

        localStorage.setItem("api_key", apiKey);
        console.log(apiKey, "key suman")

        toast.success("HR logged in successfully", { position: "top-center" });
        if (apiKey) {
          setTimeout(() => {
            window.location.href = "/hr"
          })

        }
        else {
          setTimeout(() => {
            window.location.href = "/hr/gemini";
          }, 2000)
        }
        // Direct HR to /gemini only
        // window.location.href = "/hr/gemini";
      } else {
        toast.error("Email is not verified. Please verify your email and try again!", {
          position: "bottom-center",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "HR Login Error";
      toast.error(errorMessage, { position: "bottom-center" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#11011E] via-[#35013E] to-[#11011E] p-6">
      <div className="w-full max-w-md p-8 bg-[rgba(255,255,255,0.05)] rounded-2xl shadow-2xl border border-[rgba(255,255,255,0.1)]">
        <h1 className="text-2xl font-raleway font-semibold mb-6 text-center animate-slideDown text-[#ECF1F0]">HR Sign In</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full p-3 border border-gray-600 rounded-lg bg-[#1A1A2E] text-white focus:ring-2 focus:ring-[#0FAE96]"
          />
          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="w-full p-3 border border-gray-600 rounded-lg bg-[#1A1A2E] text-white focus:ring-2 focus:ring-[#0FAE96]"
          />
          <div className="text-right">
            <Link href="/hr/passwordreset" className="text-[#0FAE96] hover:text-[#FF00C7] transition-colors duration-200">Forgot password?</Link>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-[#0FAE96] text-white p-3 rounded-lg hover:opacity-90 transition duration-300 transform hover:scale-105">
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <div className="flex justify-center">
            <SignInWithGoogle />
          </div>
        </form>
        <p className="text-center text-gray-400 mt-4">
          Don&apos;t have an account? <Link href="/hr/signUp" className="text-[#0FAE96] hover:text-[#FF00C7] transition-colors duration-200">Sign up</Link>
        </p>
      </div>
    </main>
  );
}

export default HRLogin;
