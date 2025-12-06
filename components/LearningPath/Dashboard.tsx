"use client";
import { useAppContext } from "@/context/AppContext";
import PhaseCard from "./PhaseCard";
import SkillGapSummary from "./SkillGapSummary";
import Milestones from "./Milestones";
import PremiumCard from "./PremiumCard";
import { Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { deleteSkillsDataFromFirebase } from '@/services/firebaseService';
import { onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, get, child } from 'firebase/database';
import app from '@/firebase/config';
import { toast } from "react-toastify";
import LearningTracker from "./LearningTracker";
import SkillBlogs from "./SkillBlogs";


const Dashboard = () => {
  const { state } = useAppContext();
  const { learningPath, isLoading } = state;
  const router = useRouter();
  const auth = getAuth();
  const { resetState } = useAppContext();
  const [isPremium, setIsPremium] = useState(false);
  const [checkedPremium, setCheckedPremium] = useState(false);
  const [activeTab, setActiveTab] = useState<"lectures" | "tracker" | "blog">("lectures");


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Check premium status
        try {
          const db = getDatabase(app);
          const paymentStatusRef = ref(db, `user/${currentUser.uid}/Payment/Status`);
          const paymentSnap = await get(paymentStatusRef);
          if (paymentSnap.exists() && paymentSnap.val() === 'Premium') {
            setIsPremium(true);
          } else {
            setIsPremium(false);
          }
        } catch (e) {
          setIsPremium(false);
        }
        setCheckedPremium(true);
      } else {
        toast.error("You need to be signed in to access this page!");
        setTimeout(() => {
          window.location.href = "/sign-in";
        }, 2000)

      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // console.log('Dashboard mounted, learningPath:', JSON.stringify(learningPath, null, 2));
    // console.log('Dashboard formStep:', state.formStep);
    // console.log('Dashboard isLoading:', isLoading);
    // console.log('Current user:', auth.currentUser?.uid || 'None');
  }, [learningPath, state.formStep, isLoading]);

  const handleResetData = async () => {
    // Access resetState from context
    const user = auth.currentUser;

    if (user) {
      try {
        // Reset Firebase data
        await deleteSkillsDataFromFirebase(user.uid);

        localStorage.removeItem("skillBlogsCache");       // DELETE BLOG CACHE

        // Reset application state
        await resetState();
        // Redirect to job description page
        router.push('/course/jobdescription');
      } catch (error) {
        console.error('Error resetting data:', error);
      }
    } else {
      console.error('No authenticated user found');
      router.push('/login');
    }
  };

  if (!auth.currentUser && !isLoading) {
    console.warn('No authenticated user, redirecting to login');
    router.push('/login');
    return null;
  }

  if (isLoading || !checkedPremium) {
    return (
      <div className="flex flex-col bg-[#11011E]">
        <div className="animate-slide-in px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 border-4 border-[#0FAE96] border-t-transparent rounded-full animate-spin mb-8"></div>
            <p className="text-[#B6B6B6] font-inter text-sm sm:text-base">
              Loading your learning path...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Filter valid phases
  const validPhases = learningPath.filter(phase => phase && phase.id && Array.isArray(phase.skills));
  if (!validPhases.length) {
    console.warn('No valid learning path available, rendering fallback UI');
    return (
      <div className="flex flex-col bg-[#11011E]">
        <div className="animate-slide-in px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-[#B6B6B6] font-inter text-sm sm:text-base">
            No learning path available. Data may be missing or invalid. Please try analyzing again.
          </p>
          <button
            className="mt-4 bg-[#FF6B6B] text-white font-raleway font-semibold text-base px-6 py-2 rounded-md h-10 transition duration-200 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FF6B6B]"
            onClick={handleResetData}
          >
            <Trash2 className="mr-2 h-4 w-4 inline" />
            Reset Data and Re-analyze
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[#11011E]">
      <div className="animate-slide-in px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl sm:text-4xl mt-10 ml-4 font-raleway font-bold text-[#ECF1F0]">
              Your Learning Roadmap
            </h2>
            <Sparkles className="mt-10  h-10 w-12 text-amber-400" />
          </div>
          <p className="text-[#B6B6B6] ml-4 mb-4 font-inter text-sm sm:text-base mt-2">
            Based on AI-powered analysis of your resume and Real Time Jobs
          </p>
        </div>

        {/* <div className="mb-6">
          <button
            className="bg-[#FF6B6B] text-white font-raleway font-semibold text-base px-6 py-2 rounded-md h-10 transition duration-200 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FF6B6B]"
            onClick={handleResetData}
          >
            <Trash2 className="mr-2 h-4 w-4 inline" />
            Reset Data and Re-analyze
          </button>
        </div> */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 pb-16">
          <div className="lg:col-span-2">

            {/* -------- Tabs / Buttons -------- */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setActiveTab("lectures")}
                className={`px-4 py-2 rounded-md text-white font-semibold transition ${activeTab === "lectures" ? "bg-[#0FAE96]" : "bg-[#2A2A2A]"
                  }`}
              >
                Lectures
              </button>

              <button
                onClick={() => setActiveTab("tracker")}
                className={`px-4 py-2 rounded-md text-white font-semibold transition ${activeTab === "tracker" ? "bg-[#0FAE96]" : "bg-[#2A2A2A]"
                  }`}
              >
                Tracker
              </button>

              <button
                onClick={() => setActiveTab("blog")}
                className={`px-4 py-2 rounded-md text-white font-semibold transition ${activeTab === "blog" ? "bg-[#0FAE96]" : "bg-[#2A2A2A]"
                  }`}
              >
                Blog
              </button>
            </div>

            {/* -------- Content Based on Tab -------- */}
            {activeTab === "lectures" && (
              <div className="space-y-6">
                {validPhases.map((phase) => (
                  <PhaseCard key={phase.id} phase={phase} />
                ))}
              </div>
            )}

            {activeTab === "tracker" && (
              <div className="space-y-6">
                <LearningTracker />
              </div>
            )}

            {activeTab === "blog" && (
              <div className="space-y-6">
                <SkillBlogs />
              </div>
            )}

          </div>


          <div className="space-y-6">
            {!isPremium && <PremiumCard />}
            <SkillGapSummary />
            <Milestones />
            <button
              className="bg-[#FF6B6B] text-white font-raleway font-semibold text-base px-6 py-2 rounded-md h-10 transition duration-200 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FF6B6B]"
              onClick={handleResetData}
            >
              <Trash2 className="mr-2 h-4 w-4 inline" />
              Reset Data and Re-analyze
            </button>
          </div>
          <div className="mb-6">
            {/* <button
          className="bg-[#FF6B6B] text-white font-raleway font-semibold text-base px-6 py-2 rounded-md h-10 transition duration-200 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FF6B6B]"
          onClick={handleResetData}
        >
          <Trash2 className="mr-2 h-4 w-4 inline" />
          Reset Data and Re-analyze
        </button> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;