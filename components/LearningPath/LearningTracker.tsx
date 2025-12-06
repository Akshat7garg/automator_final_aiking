"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ListChecks, Loader2 } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { getAuth } from "firebase/auth";
import { getDatabase, ref, get, set } from "firebase/database";
import app from "@/firebase/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { toast } from "react-toastify";

type TrackerItem = {
    title: string;
    done: boolean;
};

type TrackerData = Record<string, TrackerItem[]>; // skillName -> items[]

const LearningTracker: React.FC = () => {
    const { state } = useAppContext();
    const { missingSkills } = state;

    const auth = getAuth();
    const db = getDatabase(app);

    const [apiKey, setApiKey] = useState<string | null>(null);
    const [tracker, setTracker] = useState<TrackerData>({});
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);

    // ==== Load Gemini API key (following your other pages convention) ====
    useEffect(() => {
        // For this project we use 'geminiApiKey' in localStorage (your analysisService)
        const keyFromLocal = localStorage.getItem("geminiApiKey");
        if (!keyFromLocal) {
            console.warn("No Gemini API key found in localStorage (geminiApiKey).");
        }
        setApiKey(keyFromLocal);
    }, []);

    // ==== Gemini client (same style as CreateResume) ====
    const geminiClient = useMemo(() => {
        if (!apiKey) return null;
        try {
            return new GoogleGenerativeAI(apiKey);
        } catch (e) {
            console.error("Error creating Gemini client:", e);
            return null;
        }
    }, [apiKey]);

    // ==== Helper: fetch existing tracker data from Firebase ====
    const loadTrackerFromFirebase = useCallback(
        async (uid: string): Promise<TrackerData> => {
            try {
                const trackerRef = ref(db, `user/${uid}/learningTracker`);
                const snap = await get(trackerRef);
                if (snap.exists()) {
                    return snap.val() as TrackerData;
                }
            } catch (e) {
                console.error("Error loading tracker from Firebase:", e);
            }
            return {};
        },
        [db]
    );

    // ==== Helper: save tracker data to Firebase ====
    const saveTrackerToFirebase = useCallback(
        async (uid: string, data: TrackerData) => {
            try {
                const trackerRef = ref(db, `user/${uid}/learningTracker`);
                await set(trackerRef, data);
            } catch (e) {
                console.error("Error saving tracker to Firebase:", e);
            }
        },
        [db]
    );

    // ==== Gemini: generate breakdown (sub-skills) for a skill ====
    const generateBreakdownForSkill = useCallback(
        async (skillName: string): Promise<TrackerItem[]> => {
            if (!geminiClient || !apiKey) {
                console.warn("Gemini client or API key missing, returning fallback subskills.");
                return [
                    { title: `Core fundamentals of ${skillName}`, done: false },
                    { title: `Important concepts in ${skillName}`, done: false },
                    { title: `Practical applications of ${skillName}`, done: false },
                ];
            }

            try {
                const prompt = `
You are helping a student understand the skill "${skillName}" for a job interview preparation platform.

Break this skill into 6–7 important **sub-skills / sub-topics** that a learner must master before becoming confident in this main skill.

Guidelines:
- DO NOT give learning steps.
- DO NOT explain how to learn.
- ONLY give sub-topics (example: “SQL Joins”, “Async/Await”, “React Hooks”).
- Each sub-topic must be short, specific, and represent a key area of the skill.
- Cover fundamentals, core concepts, and practical essentials.

Return ONLY valid JSON in this exact format:

{
  "subskills": [
    "Sub-skill 1",
    "Sub-skill 2",
    "Sub-skill 3"
  ]
}
`.trim();

                const model = geminiClient.getGenerativeModel({
                    model: "gemini-2.0-flash"
                });

                const response = await model.generateContent(prompt);
                const text =
                    response?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

                if (!text) throw new Error("Empty response from Gemini");

                // Extract JSON
                const jsonMatch =
                    text.match(/```json\s*([\s\S]*?)```/i) ||
                    text.match(/{[\s\S]*}/);

                if (!jsonMatch) throw new Error("JSON block not found");

                const jsonStr = jsonMatch[1] || jsonMatch[0];
                const parsed = JSON.parse(jsonStr);

                if (!Array.isArray(parsed.subskills) || parsed.subskills.length === 0) {
                    throw new Error("Invalid 'subskills' format from Gemini");
                }

                return parsed.subskills.map((topic: string) => ({
                    title: topic,
                    done: false
                }));

            } catch (err) {
                console.error(`Error generating subskills for ${skillName}:`, err);
                return [
                    { title: `Key topics of ${skillName}`, done: false },
                    { title: `Important concepts of ${skillName}`, done: false }
                ];
            }
        },
        [geminiClient, apiKey]
    );


    // ==== Main effect: load tracker (and call Gemini if needed) ====
    useEffect(() => {
        const bootstrap = async () => {
            const uid = auth.currentUser?.uid;
            if (!uid) {
                console.warn("No authenticated user found for LearningTracker");
                setIsLoading(false);
                return;
            }

            if (!missingSkills || missingSkills.length === 0) {
                setTracker({});
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                // 1. Load existing tracker from Firebase
                let trackerData: TrackerData = await loadTrackerFromFirebase(uid);

                // 2. Ensure each missingSkill has breakdown entries
                let updated = false;
                for (const skillName of missingSkills) {
                    const existing = trackerData[skillName];

                    if (!existing || !Array.isArray(existing) || existing.length === 0) {
                        // Need to generate
                        const breakdown = await generateBreakdownForSkill(skillName);
                        trackerData[skillName] = breakdown;
                        updated = true;
                    }
                }

                // 3. Optionally remove skills that are no longer missing
                const trackerSkills = Object.keys(trackerData);
                let removed = false;
                for (const skillName of trackerSkills) {
                    if (!missingSkills.includes(skillName)) {
                        delete trackerData[skillName];
                        removed = true;
                    }
                }

                if (updated || removed) {
                    await saveTrackerToFirebase(uid, trackerData);
                }

                setTracker(trackerData);
            } catch (e) {
                console.error("Error initializing LearningTracker:", e);
                toast.error("Failed to load learning tracker.");
            } finally {
                setIsLoading(false);
            }
        };

        bootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auth.currentUser, missingSkills, loadTrackerFromFirebase, saveTrackerToFirebase, generateBreakdownForSkill]);

    // ==== Toggle a checklist item ====
    const handleToggleItem = async (skillName: string, index: number) => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        setTracker((prev) => {
            const copy: TrackerData = structuredClone
                ? structuredClone(prev)
                : JSON.parse(JSON.stringify(prev));

            const items = copy[skillName];
            if (!items || !items[index]) return prev;

            items[index].done = !items[index].done;
            return copy;
        });

        try {
            setIsSyncing(true);
            await saveTrackerToFirebase(uid, {
                ...tracker,
                [skillName]: tracker[skillName]?.map((item, i) =>
                    i === index ? { ...item, done: !item.done } : item
                ),
            });
        } catch (e) {
            console.error("Error updating tracker item:", e);
            toast.error("Failed to update tracker. Please try again.");
        } finally {
            setIsSyncing(false);
        }
    };

    // ==== UI ====
    if (isLoading) {
        return (
            <div className="flex flex-col bg-[#11011E]">
                <Card className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-5">
                    <CardContent className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-[#0FAE96]" />
                        <span className="ml-2 text-sm text-[#B6B6B6] font-inter">
                            Building your learning tracker...
                        </span>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Maintain original missingSkills order
    const skillNames = missingSkills.filter((skill) => tracker[skill]);

    if (skillNames.length === 0) {
        return (
            <div className="flex flex-col bg-[#11011E]">
                <Card className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-5">
                    <CardHeader>
                        <CardTitle className="text-xl font-raleway font-bold text-[#ECF1F0] flex items-center gap-2">
                            <ListChecks className="h-5 w-5 text-[#0FAE96]" />
                            Learning Tracker
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-[#B6B6B6] font-inter">
                            No missing skills found. Once new skill gaps are identified, we’ll
                            generate a step-by-step learning checklist here.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col bg-[#11011E]">
            <Card className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-5">
                <CardHeader className="pb-3">
                    <CardTitle className="text-xl font-raleway font-bold text-[#ECF1F0] flex items-center gap-2">
                        <ListChecks className="h-5 w-5 text-[#0FAE96]" />
                        Learning Tracker
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {skillNames.map((skillName) => {
                        const items = tracker[skillName] || [];
                        const completedCount = items.filter((i) => i.done).length;

                        return (
                            <div
                                key={skillName}
                                className="border border-[rgba(255,255,255,0.05)] rounded-md p-4"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-[#ECF1F0] font-raleway font-semibold text-base">
                                        {skillName}
                                    </h3>
                                    <span className="text-xs text-[#B6B6B6] font-inter">
                                        {completedCount}/{items.length} steps done
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {items.map((item, index) => (
                                        <div
                                            key={index}
                                            className="flex items-start gap-2 text-sm text-[#B6B6B6] font-inter"
                                        >
                                            <Checkbox
                                                checked={item.done}
                                                onCheckedChange={() =>
                                                    handleToggleItem(skillName, index)
                                                }
                                                className="mt-0.5"
                                            />
                                            <span
                                                className={
                                                    item.done
                                                        ? "line-through text-[#0FAE96]"
                                                        : "text-[#B6B6B6]"
                                                }
                                            >
                                                {item.title}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {isSyncing && (
                        <div className="text-xs text-[#B6B6B6] font-inter mt-2">
                            Syncing your progress...
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default LearningTracker;
