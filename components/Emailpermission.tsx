"use client";
import { useState, useEffect } from "react";
import { FaEnvelope, FaLock, FaCheckCircle } from "react-icons/fa";
import { toast } from "react-toastify";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, get } from "firebase/database";
import app from "@/firebase/config";

const EmailPermission = () => {
  const [isGranted, setIsGranted] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isVerifying, setIsVerifying] = useState(true);
  const auth = getAuth();
  const db = getDatabase(app);

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email || "");
        localStorage.setItem("userEmail", user.email || "");
        localStorage.setItem("userName", user.displayName || "");
      } else {
        toast.error("No user logged in!");
        window.location.href = "/sign-in";
      }
    });
  }, [auth]);

  useEffect(() => {
    if (!userEmail) return;

    const DB_email = userEmail.replace(/\./g, ",");
    const userRef = ref(db, "users/" + DB_email);

    get(userRef)
      .then((snapshot) => {
        if (!snapshot.exists()) {
          toast.info("Please verify your email before proceeding.");
          // setTimeout(() => {
          //   window.location.href = "/email_auth";
          // }, 2000);

        } else {
          const hasPermission = localStorage.getItem("emailPermissionGranted") === "true";
          console.log(hasPermission, "va")
          if (!hasPermission) {
            toast.info("For security reasons, please verify your email again.");
            setIsGranted(false);
          } else {
            setIsGranted(true);
            localStorage.setItem("emailPermissionGranted", "true");
            localStorage.setItem("emailVerified", "true");
            setTimeout(() => {
              window.location.href = "/send-auto-mail";
            }, 2000);
          }
        }
      })
      .catch((err) => toast.error("Error fetching user data: " + err.message))
      .finally(() => setIsVerifying(false));
  }, [userEmail, db]);

  const handleGrantAccess = async () => {
    try {
      setIsGranted(true);
      localStorage.setItem("emailPermissionGranted", "true");
      localStorage.setItem("emailVerified", "true");
      window.location.href = " https://send-auto-email-user-render.onrender.com/auth/google";
    } catch (error) {
      console.error("Error granting email access:", error);
      setIsGranted(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-8 rounded-xl backdrop-blur-sm">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
            <FaEnvelope className="text-3xl text-blue-500" />
          </div>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Enable Automated Email Sending
        </h2>
        <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
          Allow Jobform Automator to send applications on your behalf. This secure access
          enables automatic submission to multiple companies while maintaining your
          professional email presence.
        </p>

        {isVerifying ? (
          <p className="text-gray-400">Checking verification status...</p>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <FaLock className="text-blue-500" />
              Your credentials are securely encrypted
            </div>

            <button
              onClick={handleGrantAccess}
              disabled={isGranted}
              className={`px-8 py-3 rounded-lg font-medium flex items-center gap-2 transition-all ${isGranted ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
                }`}
            >
              {isGranted ? (
                <>
                  <FaCheckCircle />
                  Access Granted
                </>
              ) : (
                <>
                  <FaEnvelope />
                  Grant Email Access
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {[
          "Automated application sending",
          "Professional email formatting",
          "Secure credential handling",
          "Multi-company submissions",
          "Real-time sending status",
          "Revocable access anytime",
        ].map((feature, index) => (
          <div key={index} className="flex items-center gap-2 p-3 rounded-lg bg-gray-700/20">
            <FaCheckCircle className="text-blue-500" />
            <span className="text-gray-200">{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmailPermission;
