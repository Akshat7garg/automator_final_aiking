import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, Volume2, VolumeX } from "lucide-react";
import {
  requestUserMedia,
  VideoRecorder,
  SpeechRecognitionUtil,
} from "@/lib/webrtc-utils";
import { useToast } from "@/components/ui/use-toast";
import { generateInterviewQuestion, generateInterviewFeedback } from "@/lib/gemini-utils";
import type { SessionType } from "@/pages/Interview";
import { saveSessionWithRecording, saveSession } from "@/lib/db-service";
import { onAuthStateChanged } from "firebase/auth";
import app, { auth } from "@/firebase/config";
import { getDatabase, ref, set, get, update } from "firebase/database";
import { usePathname, useRouter } from "next/navigation";

export interface SessionTypes {
  jobDescription?: string;
  role?: string;
  skillLevel?: string;
  transcript?: Array<{ question: string; answer: string }>;
  recording?: string[] | null;
  feedback?: {
    strengths: string[];
    improvements: string[];
    overallScore?: number;
    transcript?: Array<{ question: string; answer: string }>;
    recording?: string[] | null;
  };
  isCompleted?: boolean;
}

interface InterviewSessionProps {
  session: SessionType | null;
  setSession: React.Dispatch<React.SetStateAction<SessionType | null>>;
  isRecording: boolean;
  setIsRecording: React.Dispatch<React.SetStateAction<boolean>>;
  onComplete: (feedback: SessionType["feedback"]) => void;
}

// ========== MOCK MODE FOR TESTING ==========
// Set this to true to bypass API calls and use hardcoded questions
// Set to false when API quota is available
const MOCK_MODE = false;

const MOCK_QUESTIONS = [
  "Hello! Welcome to your interview. I'm excited to get to know you better. Let's start with a classic - could you tell me a bit about yourself and what brings you here today?",
  "That's great to hear! Now, could you walk me through a challenging project you've worked on recently? What was your role and what made it challenging?",
  "Interesting! How do you typically approach problem-solving when you encounter something you've never seen before?",
  "I appreciate your thoughtfulness. Can you tell me about a time when you had to work under pressure or meet a tight deadline? How did you handle it?",
  "That's a valuable skill. What would you say are your greatest strengths, and how have they helped you in your career?",
  "Perfect. Now, where do you see yourself in the next few years? What are your career goals?",
  "Great perspective! Is there anything you'd like to ask me or anything else you'd like to share about your experience?",
];

let mockQuestionIndex = 0;

const getMockQuestion = (): string => {
  const question = MOCK_QUESTIONS[mockQuestionIndex % MOCK_QUESTIONS.length];
  mockQuestionIndex++;
  return question;
};
// ========== END MOCK MODE ==========

const InterviewSession: React.FC<InterviewSessionProps> = ({
  session,
  setSession,
  isRecording,
  setIsRecording,
  onComplete,
}) => {
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [hasMediaPermission, setHasMediaPermission] = useState<boolean>(false);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [userResponse, setUserResponse] = useState<string>("");
  const [micEnabled, setMicEnabled] = useState<boolean>(true);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(true);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [voiceType, setVoiceType] = useState<"male" | "female">("female");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [waitingForResponse, setWaitingForResponse] = useState<boolean>(false);
  const [conversation, setConversation] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [title, setTitle] = useState<string>("");
  const [hrCode, setHrCode] = useState<string>("");
  const [uid, setUid] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<VideoRecorder>(new VideoRecorder());
  const speechRecognitionRef = useRef<SpeechRecognitionUtil>(
    new SpeechRecognitionUtil()
  );
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const destinationNodeRef = useRef<MediaStreamAudioDestinationNode | null>(
    null
  );
  const userAudioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const responseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const continueListeningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechRef = useRef<string>("");
  const hasStartedInterview = useRef<boolean>(false);
  const mediaStreamRef = useRef<MediaStream | null>(null); // Ref to avoid stale closure
  const [isFinishing, setIsFinishing] = useState<boolean>(false);
  const [interviewCount, setInterviewCount] = useState<number>(0);
  const [isInterviewStarted, setIsInterviewStarted] = useState<boolean>(false);
  const accumulatedSpeechRef = useRef<string>("");
  const db = getDatabase(app);
  const { toast } = useToast();
  const micIconRef = useRef<HTMLImageElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const aiAudioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const router = useRouter();
  const memoryRef = useRef<string[]>([]);
  const voiceTypeRef = useRef<string>(voiceType);

  // Sync ref with state to fix stale closure in useEffect
  useEffect(() => {
    voiceTypeRef.current = voiceType;
  }, [voiceType]);

  // Sync mediaStream ref with state to avoid stale closures in audio callbacks
  useEffect(() => {
    mediaStreamRef.current = mediaStream;
  }, [mediaStream]);

  const pathname = usePathname();

  useEffect(() => {
    if (!session) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    const handleNavigation = () => {
      const confirmLeave = confirm(
        "Interview is in progress. Do you really want to leave?"
      );
      if (!confirmLeave) {
        router.push(pathname);
        throw "Navigation cancelled";
      }
    };

    window.history.pushState(null, "", window.location.href);
    const onPopState = () => handleNavigation();
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", onPopState);
    };
  }, [pathname, session]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
      } else {
        toast({
          title: "Authentication Error",
          description: "No user is signed in. Please log in.",
          variant: "destructive",
        });
        window.location.href = "/sign-in";
      }
    });
    return () => unsubscribe();
  }, []);

  // GET INTERVIEW COUNT
  useEffect(() => {
    getInterviewCount();
  }, [uid]);

  const getInterviewCount = async () => {
    const userInterviewRef = ref(db, `user/${uid}/interview_count`);
    const snapshot = await get(userInterviewRef);
    setInterviewCount(snapshot.val());
  };

  const updateUserData = async (uid: string, title: string, hrCode: string) => {
    const key = hrCode + title;
    const userInterviewRef = ref(db, `user/${uid}/interViewRecords/${key}`);
    try {
      await set(userInterviewRef, true);
      localStorage.removeItem("title");
      localStorage.removeItem("hr_code");
      console.log("Interview record updated successfully");
    } catch (error) {
      console.error("Error updating interview record:", error);
      throw error;
    }
  };

  useEffect(() => {
    const code = localStorage.getItem("hr_code") || "";
    const title = localStorage.getItem("title") || "";
    const actualTitle = title.replace(/\s/g, "");
    console.log(code, actualTitle);
    setHrCode(code);
    setTitle(actualTitle);
  }, []);

  useEffect(() => {
    console.log(
      "useEffect triggered, hasStartedInterview:",
      hasStartedInterview.current
    );
    const setupMedia = async () => {
      if (!window.MediaRecorder) {
        toast({
          title: "Browser Not Supported",
          description:
            "Your browser does not support video recording. Please use Chrome or Firefox.",
          variant: "destructive",
        });
        setHasMediaPermission(false);
        return;
      }

      try {
        const stream = await requestUserMedia();
        setMediaStream(stream);
        setHasMediaPermission(true);

        console.log("Media stream acquired:", stream, stream.getTracks());
        stream.getTracks().forEach((track) => {
          console.log(
            `Track ${track.kind}: enabled=${track.enabled}, readyState=${track.readyState}`
          );
        });

        audioContextRef.current = new AudioContext();
        destinationNodeRef.current =
          audioContextRef.current.createMediaStreamDestination();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 512;
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const userAudioTracks = stream.getAudioTracks();
        if (userAudioTracks.length > 0) {
          userAudioSourceRef.current =
            audioContextRef.current.createMediaStreamSource(
              new MediaStream([userAudioTracks[0]])
            );
          if (userAudioSourceRef.current) {
            userAudioSourceRef.current.connect(analyserRef.current);
            userAudioSourceRef.current.connect(destinationNodeRef.current);
            console.log(
              "User audio source connected for analysis and recording"
            );
          } else {
            console.error("Failed to create audio source node");
            toast({
              title: "Audio Setup Error",
              description:
                "Failed to initialize audio source. Animation may not work.",
              variant: "destructive",
            });
          }
        } else {
          console.warn("No user audio tracks available to mix");
          toast({
            title: "Audio Setup Warning",
            description:
              "No microphone audio detected. Animation and recording may be affected.",
            variant: "default",
          });
        }

        // Video initialization moved to separate useEffect

        if (speechRecognitionRef.current.isSupported()) {
          // Let the user speak longer before we finalize their turn (tweak 6000–10000)
          speechRecognitionRef.current.setSilenceTimeout(10000);
          speechRecognitionRef.current.setAutoRestart(true);

          speechRecognitionRef.current.on({
            onStart: () => setIsListening(true),
            onEnd: () => setIsListening(false),

            // Live captions as the user speaks
            onInterim: (text) => {
              accumulatedSpeechRef.current = text.trim();
              setUserResponse(accumulatedSpeechRef.current);
            },

            // This is the ONLY place that finalizes a user turn and triggers AI
            onFinal: async (finalText) => {
              const finalResponse = finalText.trim();
              if (!finalResponse) return;


              // Describe why we stop here:
              // Stop immediately after capturing final input to enforce turn-based flow.
              // This prevents the engine from staying active or auto-restarting while AI thinks.
              setIsListening(false);
              speechRecognitionRef.current.stop();

              setConversation((prev) => [
                ...prev,
                { role: "user", content: finalResponse },
              ]);
              setWaitingForResponse(false);
              setIsProcessing(true);

              // Attach to last transcript question
              if (session) {
                setSession((prev: any) => {
                  const updated = [...(prev?.transcript || [])];
                  if (updated.length > 0) {
                    updated[updated.length - 1].answer = finalResponse;
                  }
                  return { ...prev!, transcript: updated };
                });
              }

              try {
                const lower = finalResponse.toLowerCase();
                let aiResponseText = "";

                // Your quick responses (unchanged)
                if (
                  lower.includes("what is software") ||
                  lower.includes("what's software")
                ) {
                  aiResponseText =
                    "Software is a set of computer programs and associated data that provide instructions for computers to perform specific tasks. It includes everything from operating systems like Windows or macOS to applications like web browsers, games, and office tools. Unlike hardware, software is intangible and consists of code written by programmers. Want to dive deeper into any specific type of software?";
                } else if (
                  lower.includes("what is hardware") ||
                  lower.includes("what's hardware")
                ) {
                  aiResponseText =
                    "Hardware refers to the physical components of a computer system, like the monitor, keyboard, mouse, CPU, memory, and storage drives. Unlike software, which is just code, hardware is tangible equipment. Curious about any specific hardware components?";
                } else if (
                  lower.includes("what is coding") ||
                  lower.includes("what's coding")
                ) {
                  aiResponseText =
                    "Coding, or programming, is the process of creating instructions for computers using programming languages. It's like writing a detailed recipe that tells the computer what to do. Programmers use languages like Python, JavaScript, or C++ to create websites, apps, games, and more. Have you tried coding before?";
                } else {
                  aiResponseText = MOCK_MODE
                    ? getMockQuestion()
                    : await generateInterviewQuestion(
                      session?.jobDescription || "",
                      conversation.map((m) => m.content).slice(-4),
                      [finalResponse],
                      {
                        role: session?.role || "General",
                        skillLevel: session?.skillLevel || "Intermediate",
                      }
                    );
                }

                // Add AI message
                setAiResponse(aiResponseText);
                setConversation((prev) => [
                  ...prev,
                  { role: "assistant", content: aiResponseText },
                ]);
                setCurrentQuestion(aiResponseText);

                // Push next question stub in transcript
                if (session) {
                  setSession((prev: any) => {
                    const updated = [
                      ...(prev?.transcript || []),
                      { question: aiResponseText, answer: "" },
                    ];
                    return { ...prev!, transcript: updated };
                  });
                }

                // Speak it (your existing TTS will set waitingForResponse=true on end)
                setTimeout(() => {
                  speakText(aiResponseText);
                }, 100);
              } catch (err) {
                console.error("Error generating AI response:", err);

                const lower = finalResponse.toLowerCase();
                const isQ =
                  lower.startsWith("what") ||
                  lower.startsWith("how") ||
                  lower.startsWith("why") ||
                  lower.startsWith("when") ||
                  lower.startsWith("where") ||
                  lower.startsWith("can") ||
                  lower.startsWith("could") ||
                  lower.endsWith("?");

                let fallbackResponse = "";
                if (isQ) {
                  fallbackResponse = `That's a great question! ${getInformationResponse(
                    lower
                  )} Want to explore this topic more or move to an interview question?`;
                } else if (
                  lower.includes("bye") ||
                  lower.includes("goodbye") ||
                  lower.includes("done")
                ) {
                  fallbackResponse =
                    "Thanks for the chat! It was great talking with you. Ready to wrap up or continue with another question?";
                } else {
                  fallbackResponse =
                    "Got it! Let's keep going. Could you share an experience where you demonstrated relevant skills?";
                }

                setAiResponse(fallbackResponse);
                setConversation((prev) => [
                  ...prev,
                  { role: "assistant", content: fallbackResponse },
                ]);
                setCurrentQuestion(fallbackResponse);

                if (session) {
                  setSession((prev: any) => {
                    const updated = [
                      ...(prev?.transcript || []),
                      { question: fallbackResponse, answer: "" },
                    ];
                    return { ...prev!, transcript: updated };
                  });
                }

                setTimeout(() => {
                  speakText(fallbackResponse);
                }, 100);
              } finally {
                setIsProcessing(false);
              }
            },
          });
        } else {
          toast({
            title: "Speech Recognition Not Available",
            description: "Your browser doesn't support speech recognition.",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        console.error("Error setting up media:", error.name, error.message);
        setHasMediaPermission(false);
        toast({
          title: "Media Setup Error",
          description:
            "Failed to access camera or microphone. Please check permissions.",
          variant: "destructive",
        });
      }
    };

    setupMedia();

    // Removed auto-start to allow voice selection first
    // if (!hasStartedInterview.current) {
    //   hasStartedInterview.current = true;
    //   startInterview();
    // }

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        setMediaStream(null);
      }
      speechRecognitionRef.current.stop();
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (destinationNodeRef.current) {
        destinationNodeRef.current.disconnect();
        destinationNodeRef.current = null;
      }
      if (userAudioSourceRef.current) {
        userAudioSourceRef.current.disconnect();
        userAudioSourceRef.current = null;
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current);
      }
      if (continueListeningTimeoutRef.current) {
        clearTimeout(continueListeningTimeoutRef.current);
      }
      if (session?.recordings) {
        session.recordings.forEach((url) => URL.revokeObjectURL(url));
      }
    };
  }, []);

  useEffect(() => {
    if (!isInterviewStarted || !mediaStream) return;

    const initVideo = async (attempts = 5) => {
      if (!videoRef.current) {
        if (attempts > 0) {
          setTimeout(() => initVideo(attempts - 1), 500);
        }
        return;
      }

      videoRef.current.srcObject = mediaStream;
      const videoTracks = mediaStream.getVideoTracks();
      if (videoTracks.length > 0 && !videoTracks[0].enabled) {
        videoTracks[0].enabled = true;
      }

      try {
        await videoRef.current.play();

        if (!destinationNodeRef.current) return;

        const combinedStream = new MediaStream([
          ...mediaStream.getVideoTracks(),
          ...destinationNodeRef.current.stream.getAudioTracks(),
        ]);

        try {
          recorderRef.current.initialize(combinedStream, {
            mimeType: "video/webm;codecs=vp8,opus",
          });
          recorderRef.current.start();
          setIsRecording(true);
          toast({
            title: "Recording Started",
            description: "Video recording has started for the interview.",
            variant: "default",
          });
        } catch (recorderError) {
          console.error("Error initializing/starting recorder:", recorderError);
          setIsRecording(false);
        }

      } catch (error) {
        console.error("Error playing video:", error);
      }
    };

    initVideo();
  }, [isInterviewStarted, mediaStream]);

  // INCREASE INTERVIEW COUNT
  const increaseInterviewCount = async () => {
    const userInterviewRef = ref(db, `user/${uid}`);
    await update(userInterviewRef, {
      interview_count: interviewCount - 1,
    });
  };

  function humanizeForTTS(text: string): string {
    let t = text.trim();

    // CALMNESS & PACING:
    // Removed aggressive text-based pausing to allow Neural2's natural prosody to shine.
    // Clean text sounds smoother and less robotic.

    // EXPRESSION:
    // Removed manual sentence breaking for the same reason.

    // Professional yet natural tone smoothing
    t = t.replace(/\bhowever\b/gi, "however"); // remove bolding if any

    // HUMAN-LIKE FILLERS:
    // Insert fillers at the start of long responses to simulate "gathering thoughts"
    const naturalOpeners = [
      "Hmm, ",
      "Well, ",
      "You know, ",
      "I see. ",
      "Okay, ",
      "Right, ",
    ];

    if (t.length > 40 && Math.random() > 0.6) {
      const opener = naturalOpeners[Math.floor(Math.random() * naturalOpeners.length)];
      t = opener + t;
    }

    return t;
  }

  const speakText = async (text: string) => {
    if (!voiceEnabled) return;

    try {
      console.log(
        "Attempting to use backend for Google Cloud Text-to-Speech..."
      );
      setIsProcessing(true);
      setWaitingForResponse(false);

      const response = await fetch(
        "https://google-tts-backend.vercel.app/api/speak",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: humanizeForTTS(text),
            gender: voiceTypeRef.current.toUpperCase(),
            // Indian Neural2 Voices for better prosody/expression
            voiceName: voiceTypeRef.current === "female" ? "en-IN-Neural2-D" : "en-IN-Neural2-C",
            // Tweak audio config for "calmness" and "smoothness"
            languageCode: "en-IN",
            audioConfig: {
              speakingRate: 0.9, // Slower = clearer, calmer
              pitch: -1.0,       // Slightly lower pitch = more grounded/professional
            },
          }),

        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Backend response:", response.status, errorText);
        if (response.status === 429) {
          toast({
            title: "Quota Exceeded",
            description:
              "Google Cloud TTS quota exceeded. Please check your Google Cloud Console.",
            variant: "destructive",
          });
        } else if (
          errorText.includes("INVALID_ARGUMENT") &&
          errorText.includes("voice")
        ) {
          toast({
            title: "Voice Not Available",
            description:
              "The requested voice is not available. Please check the voice name.",
            variant: "destructive",
          });
        }
        throw new Error(`Backend error: ${response.status} - ${errorText}`);
      }

      console.log("Backend call successful, generating audio...");
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = "";
      }
      // Stop listening because AI is speaking now
      if (speechRecognitionRef.current?.isActive()) {
        speechRecognitionRef.current.stop();
      }
      setIsListening(false);

      audioElementRef.current = new Audio();
      audioElementRef.current.src = audioUrl;

      if (audioContextRef.current && destinationNodeRef.current) {
        // Disconnect previous instance if exists
        if (aiAudioSourceRef.current) {
          aiAudioSourceRef.current.disconnect();
        }

        aiAudioSourceRef.current =
          audioContextRef.current.createMediaElementSource(
            audioElementRef.current
          );

        // ✅ Always send AI audio to recording stream
        aiAudioSourceRef.current.connect(destinationNodeRef.current);

        // ✅ Only send AI audio to speakers if voiceEnabled is true
        if (voiceEnabled) {
          aiAudioSourceRef.current.connect(audioContextRef.current.destination);
        }

        console.log(
          "AI audio routing updated (recording always on, speaker conditional)"
        );
      } else {
        console.warn(
          "Audio context or destination node not available. AI audio won't be recorded."
        );
        toast({
          title: "Audio Setup Error",
          description:
            "Failed to set up audio mixing. AI voice may not be recorded.",
          variant: "destructive",
        });
      }

      // Set up the onended handler BEFORE calling play() to avoid race conditions
      const handleAudioEnded = () => {
        console.log("[Audio] AI finished speaking, triggering auto-listen...");
        setIsProcessing(false);
        setWaitingForResponse(true);
        // AUTO-LISTEN: Start listening automatically after AI finishes speaking
        setTimeout(() => {
          console.log("[Auto-Listen] Attempting to start speech recognition...");
          // Use ref instead of state to avoid stale closure
          if (mediaStreamRef.current) {
            console.log("[Auto-Listen] Starting speech recognition after AI finished speaking");
            setIsListening(true);
            speechRecognitionRef.current.start();
          } else {
            console.warn("[Auto-Listen] Cannot start: mediaStream not available");
          }
          startResponseTimeout();
        }, 800);
      };

      // Use addEventListener for more reliable event binding
      audioElementRef.current.addEventListener('ended', handleAudioEnded, { once: true });

      audioElementRef.current.play().catch((error) => {
        console.error("Error playing audio:", error);
        toast({
          title: "Audio Playback Error",
          description:
            "Failed to play AI voice. Please check your browser's audio settings.",
          variant: "destructive",
        });
        // If play fails, still trigger auto-listen
        handleAudioEnded();
      });

      startResponseTimeout();
    } catch (error) {
      console.error("Error with Google Cloud TTS:", error);
      toast({
        title: "Text-to-Speech Error",
        description:
          "Failed to generate AI voice. Please check the backend server and Google Cloud setup.",
        variant: "destructive",
      });
      setIsProcessing(false);
      setWaitingForResponse(true);
      // AUTO-LISTEN: Start listening automatically even on TTS error
      setTimeout(() => {
        // Use ref instead of state to avoid stale closure
        if (mediaStreamRef.current) {
          console.log("[Auto-Listen] Starting speech recognition (TTS error fallback)");
          setIsListening(true);
          speechRecognitionRef.current.start();
        }
        startResponseTimeout();
      }, 800);
    }
  };

  const handleStartInterview = () => {
    setIsInterviewStarted(true);
    if (!hasStartedInterview.current) {
      hasStartedInterview.current = true;
      startInterview();
    }
  };

  const startInterview = async () => {
    try {
      const initialQuestion = MOCK_MODE
        ? getMockQuestion()
        : await generateInterviewQuestion(
          session?.jobDescription || "",
          [],
          [],
          {
            role: session?.role || "General",
            skillLevel: session?.skillLevel || "Intermediate",
          }
        );
      console.log("Initial question received:", initialQuestion);
      if (
        conversation.length === 0 ||
        !conversation.some((msg) => msg.content === initialQuestion)
      ) {
        setCurrentQuestion(initialQuestion);
        setConversation([{ role: "assistant", content: initialQuestion }]);
        if (session) {
          setSession((prev) => ({
            ...prev!,
            transcript: [{ question: initialQuestion, answer: "" }],
          }));
          console.log("Initial transcript:", [
            { question: initialQuestion, answer: "" },
          ]);
        }
        // Speak immediately without delay
        speakText(initialQuestion);
      }
    } catch (error: any) {
      console.error("Error starting interview:", error);
      // gemini-utils.ts already shows react-toastify notification for API errors

      const fallbackQuestion = `Let's get started with your interview. Could you tell me about your background and experience?`;
      console.log("Fallback question:", fallbackQuestion);
      if (
        conversation.length === 0 ||
        !conversation.some((msg) => msg.content === fallbackQuestion)
      ) {
        setCurrentQuestion(fallbackQuestion);
        setConversation([{ role: "assistant", content: fallbackQuestion }]);
        if (session) {
          setSession((prev) => ({
            ...prev!,
            transcript: [{ question: fallbackQuestion, answer: "" }],
          }));
          console.log("Initial transcript (fallback):", [
            { question: fallbackQuestion, answer: "" },
          ]);
        }
        speakText(fallbackQuestion);
      }
    }
  };

  const startResponseTimeout = () => {
    if (responseTimeoutRef.current) {
      clearTimeout(responseTimeoutRef.current);
    }

    responseTimeoutRef.current = setTimeout(() => {
      // Do nothing on silence, simply wait
      // No auto-response, no auto-end
    }, 15000);
  };

  function generateAcknowledgment(input: string) {
    const text = input.trim();
    const wordCount = text.split(" ").length;

    if (wordCount <= 4) {
      return "Alright, thanks.";
    }

    if (wordCount <= 12) {
      return "Got it, that makes sense.";
    }

    if (wordCount <= 20) {
      return "I appreciate you explaining that.";
    }

    const variations = [
      "Thanks for sharing that in detail — that's helpful.",
      "I appreciate the depth of your explanation.",
      "That gives me a clearer picture — thank you.",
      "That's helpful context, appreciate you sharing it.",
    ];

    return variations[Math.floor(Math.random() * variations.length)];
  }

  function enhanceFollowUpQuestion(userAnswer: string, aiQuestion: string) {
    const lower = userAnswer.toLowerCase();

    // If user talked about teamwork
    if (lower.includes("team") || lower.includes("collaborat")) {
      return "Great, teamwork is always crucial. " + aiQuestion;
    }

    // If user mentioned challenges
    if (
      lower.includes("challenge") ||
      lower.includes("difficult") ||
      lower.includes("issue")
    ) {
      return (
        "Thanks for sharing that challenge — that gives good insight into your approach. " +
        aiQuestion
      );
    }

    // If user mentioned specific tech
    const techKeywords = ["react", "node", "python", "java", "database", "api"];
    if (techKeywords.some((kw) => lower.includes(kw))) {
      return "Nice, that's a solid tech stack. " + aiQuestion;
    }

    // Default natural HR tone
    return "Thanks for sharing that. " + aiQuestion;
  }

  function extractKeyPoints(answer: string) {
    const points: string[] = [];

    const lower = answer.toLowerCase();

    // Tech stack
    const tech = [
      "react",
      "node",
      "express",
      "python",
      "java",
      "c++",
      "api",
      "database",
    ];
    tech.forEach((t) => {
      if (lower.includes(t)) points.push(`Candidate has experience with ${t}`);
    });

    // Types of work
    if (lower.includes("frontend")) points.push("Prefers frontend development");
    if (lower.includes("backend")) points.push("Prefers backend development");
    if (lower.includes("full stack"))
      points.push("Works as a full-stack developer");

    // Soft skills
    if (lower.includes("team")) points.push("Strong teamwork experience");
    if (lower.includes("communication"))
      points.push("Good communication skills");
    if (lower.includes("lead")) points.push("Leadership experience");

    // Challenges
    if (lower.includes("challenge"))
      points.push("Faced notable technical challenges");

    return points;
  }

  const handleUserSpeech = (text: string) => {
    accumulatedSpeechRef.current = text;
    setUserResponse(text);

    if (continueListeningTimeoutRef.current) {
      clearTimeout(continueListeningTimeoutRef.current);
    }

    continueListeningTimeoutRef.current = setTimeout(async () => {
      if (isProcessing) return;

      setIsListening(false);
      speechRecognitionRef.current.stop();

      const finalResponse = accumulatedSpeechRef.current.trim();
      accumulatedSpeechRef.current = "";

      const extracted = extractKeyPoints(finalResponse);
      memoryRef.current = [...memoryRef.current, ...extracted];

      // Log user answer in conversation history
      setConversation((prev) => [
        ...prev,
        { role: "user", content: finalResponse },
      ]);

      setWaitingForResponse(false);
      setIsProcessing(true);

      // Update transcript
      if (session) {
        setSession((prev: any) => {
          const currentTranscript = prev?.transcript || [];
          const updatedTranscript = [...currentTranscript];
          if (updatedTranscript.length > 0) {
            updatedTranscript[updatedTranscript.length - 1].answer =
              finalResponse;
          }
          return { ...prev!, transcript: updatedTranscript };
        });
      }

      try {
        const lowerText = finalResponse.toLowerCase();
        let aiResponseText = "";

        // Natural HR-style acknowledgment before the question
        const acknowledgment = generateAcknowledgment(finalResponse);

        // Your old quick replies (untouched)
        if (
          lowerText.includes("what is software") ||
          lowerText.includes("what's software")
        ) {
          aiResponseText =
            "Software refers to a set of instructions and programs that tell a computer how to work. Unlike hardware, software is intangible and includes operating systems, apps, and development tools. " +
            acknowledgment;
        } else if (
          lowerText.includes("what is hardware") ||
          lowerText.includes("what's hardware")
        ) {
          aiResponseText =
            "Hardware refers to the physical components of a computer—like the CPU, memory, keyboard, and display. These are tangible, unlike software which is code. " +
            acknowledgment;
        } else if (
          lowerText.includes("what is coding") ||
          lowerText.includes("what's coding")
        ) {
          aiResponseText =
            "Coding is the process of writing instructions for computers using programming languages like Python, JavaScript, or C++. " +
            acknowledgment;
        } else {
          // Generate next question (uses mock in MOCK_MODE)
          const generated = MOCK_MODE
            ? getMockQuestion()
            : await generateInterviewQuestion(
              session?.jobDescription || "",
              conversation.map((msg) => msg.content).slice(-4),
              [finalResponse],
              {
                role: session?.role || "General",
                skillLevel: session?.skillLevel || "Intermediate",
                memory: memoryRef.current.slice(-8).join(". "),
                hrTone: "friendly-conversational",
              }
            );

          aiResponseText =
            acknowledgment +
            " " +
            enhanceFollowUpQuestion(finalResponse, generated);
        }

        // Push AI message into UI
        setAiResponse(aiResponseText);
        setConversation((prev) => [
          ...prev,
          { role: "assistant", content: aiResponseText },
        ]);
        setCurrentQuestion(aiResponseText);

        // Transcript entry for next question
        if (session) {
          setSession((prev: any) => {
            const updatedTranscript = [
              ...prev!.transcript,
              { question: aiResponseText, answer: "" },
            ];
            return { ...prev!, transcript: updatedTranscript };
          });
        }

        // Speak it
        setTimeout(() => speakText(aiResponseText), 100);
      } catch (error: any) {
        console.error("Error generating AI response:", error);
        // gemini-utils.ts already shows react-toastify notification for API errors

        const fallbackResponse =
          "Got it. Let's keep moving forward. Could you walk me through a challenge you recently solved in any project?";
        setAiResponse(fallbackResponse);
        setConversation((prev) => [
          ...prev,
          { role: "assistant", content: fallbackResponse },
        ]);
        setCurrentQuestion(fallbackResponse);

        if (session) {
          setSession((prev: any) => ({
            ...prev!,
            transcript: [
              ...prev!.transcript,
              { question: fallbackResponse, answer: "" },
            ],
          }));
        }

        setTimeout(() => speakText(fallbackResponse), 100);
      } finally {
        setIsProcessing(false);
      }
    }, 6000);
  };

  const getInformationResponse = (text: string): string => {
    if (text.includes("software")) {
      return "Software refers to programs and applications that run on computers and other devices. It's the instructions that tell hardware what to do.";
    } else if (text.includes("hardware")) {
      return "Hardware is the physical components of a computer system - things you can touch like screens, keyboards, and the electronic parts inside.";
    } else if (text.includes("coding") || text.includes("programming")) {
      return "Coding is writing instructions for computers using programming languages. It's how people create websites, apps, and other software.";
    } else if (text.includes("internet")) {
      return "The internet is a global network of connected computers that allows information sharing and communication worldwide.";
    } else if (
      text.includes("ai") ||
      text.includes("artificial intelligence")
    ) {
      return "Artificial Intelligence refers to computer systems designed to perform tasks that typically require human intelligence, like visual perception, speech recognition, and decision-making.";
    } else {
      return "I'm not sure about that specific topic, but I'd be happy to discuss it or move to an interview question.";
    }
  };

  const handleNoResponse = async () => {
    setWaitingForResponse(false);
    setIsProcessing(true);

    try {
      const role = session?.role || "General";
      const skillLevel = session?.skillLevel || "Intermediate";
      const aiResponseText = MOCK_MODE
        ? getMockQuestion()
        : await generateInterviewQuestion(
          session?.jobDescription || "",
          conversation.map((msg) => msg.content).slice(-4),
          [],
          { role, skillLevel }
        );
      setAiResponse(aiResponseText);
      setConversation((prev) => {
        const updatedConversation = [
          ...prev,
          { role: "assistant", content: aiResponseText },
        ];
        console.log("Conversation after no response:", updatedConversation);
        return updatedConversation;
      });
      setCurrentQuestion(aiResponseText);

      if (session) {
        setSession((prev) => {
          const currentTranscript = prev?.transcript || [];
          const updatedTranscript = [...currentTranscript];
          if (
            updatedTranscript.length > 0 &&
            updatedTranscript[updatedTranscript.length - 1].answer === ""
          ) {
            updatedTranscript[updatedTranscript.length - 1].answer =
              "No response";
          }
          updatedTranscript.push({ question: aiResponseText, answer: "" });
          console.log(
            "Updated transcript after no response:",
            updatedTranscript
          );
          return {
            ...prev!,
            transcript: updatedTranscript,
          };
        });
      }

      setTimeout(() => {
        speakText(aiResponseText);
      }, 100);
    } catch (error) {
      console.error("Error generating follow-up:", error);
      const fallbackResponse = `Looks like you're thinking! Can you describe a challenge you faced in a past project and how you handled it?`;
      setAiResponse(fallbackResponse);
      setConversation((prev) => {
        const updatedConversation = [
          ...prev,
          { role: "assistant", content: fallbackResponse },
        ];
        console.log(
          "Conversation after no response (fallback):",
          updatedConversation
        );
        return updatedConversation;
      });
      setCurrentQuestion(fallbackResponse);

      if (session) {
        setSession((prev) => {
          const currentTranscript = prev?.transcript || [];
          const updatedTranscript = [...currentTranscript];
          if (
            updatedTranscript.length > 0 &&
            updatedTranscript[updatedTranscript.length - 1].answer === ""
          ) {
            updatedTranscript[updatedTranscript.length - 1].answer =
              "No response";
          }
          updatedTranscript.push({ question: fallbackResponse, image: "" });
          console.log(
            "Updated transcript after no response (fallback):",
            updatedTranscript
          );
          return {
            ...prev!,
            transcript: updatedTranscript,
          };
        });
      }

      setTimeout(() => {
        speakText(fallbackResponse);
      }, 100);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleMic = () => {
    if (mediaStream) {
      const audioTracks = mediaStream.getAudioTracks();
      if (audioTracks.length === 0) {
        toast({
          title: "No Audio Track",
          description:
            "No audio track available. Please check your microphone.",
          variant: "destructive",
        });
        return;
      }
      audioTracks.forEach((track) => {
        track.enabled = !micEnabled;
      });
      setMicEnabled(!micEnabled);
      console.log(
        "Mic toggled, audio tracks:",
        audioTracks.map((t) => ({ enabled: t.enabled }))
      );
    }
  };

  const toggleVideo = () => {
    if (mediaStream) {
      const videoTracks = mediaStream.getVideoTracks();
      if (videoTracks.length == 0) {
        toast({
          title: "No Video Track",
          description: "No video track available. Please check your camera.",
          variant: "destructive",
        });
        return;
      }
      videoTracks.forEach((track) => {
        track.enabled = !videoEnabled;
      });
      setVideoEnabled(!videoEnabled);
      console.log(
        "Video toggled, video tracks:",
        videoTracks.map((t) => ({ enabled: t.enabled }))
      );
    }
  };

  const toggleVoice = () => {
    setVoiceEnabled((prev) => {
      const newState = !prev;

      // Mute → disconnect speaker output
      if (!newState && aiAudioSourceRef.current) {
        aiAudioSourceRef.current.disconnect();

        // Reconnect to recording pipeline only (safe null-check)
        if (destinationNodeRef.current) {
          aiAudioSourceRef.current.connect(destinationNodeRef.current);
        }
      }

      // Unmute → reconnect speaker output
      if (newState && aiAudioSourceRef.current && audioContextRef.current) {
        aiAudioSourceRef.current.connect(audioContextRef.current.destination);
      }

      // Immediately stop playback on mute
      if (audioElementRef.current && !newState) {
        audioElementRef.current.pause();
      }

      return newState;
    });
  };

  const startListening = () => {
    // Skip if AI is still processing or not waiting for user response
    if (isProcessing || !waitingForResponse) {
      return;
    }

    if (speechRecognitionRef.current.isActive()) {
      toast({
        title: "Already Listening",
        description:
          "Speech recognition is already active. Please wait for the current session to complete.",
        variant: "default",
      });
      return;
    }

    if (
      !mediaStream ||
      !mediaStream
        .getTracks()
        .some((track) => track.enabled && track.readyState === "live")
    ) {
      toast({
        title: "Media Error",
        description:
          "No active media stream available. Attempting to reconnect...",
        variant: "destructive",
      });
      requestUserMedia()
        .then((newStream) => {
          setMediaStream(newStream);
          setHasMediaPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = newStream;
          }
          const currentTracks =
            recorderRef.current.getStream()?.getTracks() || [];
          currentTracks.forEach((track) => track.stop());

          if (audioContextRef.current && destinationNodeRef.current) {
            if (userAudioSourceRef.current) {
              userAudioSourceRef.current.disconnect();
              userAudioSourceRef.current = null;
            }
            const userAudioTracks = newStream.getAudioTracks();
            if (userAudioTracks.length > 0) {
              userAudioSourceRef.current =
                audioContextRef.current.createMediaStreamSource(
                  new MediaStream([userAudioTracks[0]])
                );
              userAudioSourceRef.current.connect(destinationNodeRef.current);
              userAudioSourceRef.current.connect(analyserRef.current);
              console.log(
                "User audio source reconnected to destination node after stream reconnect"
              );
            }
          }

          const combinedStream = new MediaStream([
            ...newStream.getVideoTracks(),
            ...destinationNodeRef.current!.stream.getAudioTracks(),
          ]);

          recorderRef.current.updateStream(combinedStream);

          if (!isRecording) {
            try {
              recorderRef.current.start();
              setIsRecording(true);
              console.log("Recorder restarted after stream reconnect");
              toast({
                title: "Recording Restated",
                description:
                  "Recording has been restarted after reconnecting the media stream.",
                variant: "default",
              });
            } catch (error) {
              console.error("Error restarting recorder:", error);
              toast({
                title: "Recording Error",
                description:
                  "Failed to restart recording after reconnecting the stream.",
                variant: "destructive",
              });
            }
          }
        })
        .catch((error) => {
          console.error("Error re-requesting media:", error);
          toast({
            title: "Permission Denied",
            description: "Camera and microphone access are required to record.",
            variant: "destructive",
          });
        });
      return;
    }

    setIsListening(true);
    speechRecognitionRef.current.start();
  };

  // Renamed old function to serve as fallback
  const generateStaticFeedback = (
    transcript: Array<{ question: string; answer: string }>
  ) => {
    const strengths: string[] = [];
    const improvements: string[] = [];
    const responses = transcript
      .map((item) => item.answer)
      .filter((answer) => answer && answer !== "No response");

    const hasDetailedResponses = responses.some(
      (response) => response.length > 50
    );
    const hasRelevantTerms = responses.some((response) =>
      ["react", "component", "state", "javascript"].some((term) =>
        response.toLowerCase().includes(term)
      )
    );
    const responseCount = responses.length;

    if (hasDetailedResponses) {
      strengths.push("Provided detailed responses to some questions");
    }
    if (hasRelevantTerms) {
      strengths.push("Demonstrated familiarity with relevant technical terms");
    }
    if (responseCount >= transcript.length - 1) {
      strengths.push("Answered most questions promptly");
    }
    if (strengths.length === 0) {
      strengths.push("Attempted to engage with the interview process");
    }

    const hasVagueResponses = responses.some(
      (response) =>
        response.toLowerCase().includes("don't know") ||
        response.toLowerCase().includes("not sure")
    );
    const hasShortResponses = responses.some(
      (response) => response.length < 20 && response !== "No response"
    );
    const missedResponses = transcript.some(
      (item) => item.answer === "No response"
    );

    if (hasVagueResponses) {
      improvements.push(
        "Clarify answers by avoiding vague phrases like 'don't know'"
      );
    }
    if (hasShortResponses) {
      improvements.push("Elaborate on answers to provide more depth");
    }
    if (missedResponses) {
      improvements.push(
        "Ensure to respond to all questions, even with partial answers"
      );
    }
    if (responses.length < transcript.length / 2) {
      improvements.push("Increase engagement by answering more questions");
    }
    if (improvements.length == 0) {
      improvements.push("Continue practicing to enhance response confidence");
    }

    // specific static score logic
    const calculateScore = (responses: string[]): number => {
      let totalScore = 0;
      const maxScorePerResponse = 3;
      const minLength = 20;
      const keywords = [
        "react",
        "component",
        "state",
        "experience",
        "project",
        "skills",
        "team",
        "solution",
        "javascript",
        "development",
      ];

      responses.forEach((response) => {
        let responseScore = 0;
        if (response.length > minLength) {
          responseScore += 1;
        }
        const keywordMatches = keywords.filter((keyword) =>
          response.toLowerCase().includes(keyword)
        ).length;
        responseScore += keywordMatches * 0.2;
        totalScore += Math.min(responseScore, maxScorePerResponse);
      });

      const normalizedScore =
        (totalScore / (responses.length * maxScorePerResponse)) * 10;
      return Math.round(normalizedScore * 10) / 10;
    };

    // Calculate score inside fallback
    const overallScore = calculateScore(responses);

    return { strengths, improvements, overallScore };
  };

  const handleFinishInterview = async () => {
    if (isFinishing) return;
    setIsFinishing(true);
    increaseInterviewCount();
    console.log("Finishing interview initiated");

    try {
      speechRecognitionRef.current.stop();
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current);
      }
      if (continueListeningTimeoutRef.current) {
        clearTimeout(continueListeningTimeoutRef.current);
      }

      let recordingUrl: string | undefined = undefined;
      let recordedBlobs: Blob[] | null = null;

      if (isRecording && recorderRef.current) {
        console.log("Stopping recorder...");
        const recordedBlob = await recorderRef.current.stop();
        if (recordedBlob && recordedBlob.size > 0) {
          recordedBlobs = [recordedBlob];
          console.log("Recording blob obtained, size:", recordedBlob.size);
        } else {
          console.warn("No valid recording data obtained.");
          toast({
            title: "No Recording Data",
            description: "No video data was recorded. Saving metadata only.",
            variant: "default",
          });
        }
        setIsRecording(false);

        const recorderStream = recorderRef.current.getStream();
        if (recorderStream) {
          recorderStream.getTracks().forEach((track) => {
            track.stop();
            console.log(`Recorder track ${track.kind} stopped`);
          });
        }
        if (recorderRef.current.getStream()) {
          try {
            recorderRef.current.cleanup();
          } catch { }
        }
        console.log("Recorder stream cleared");
      }

      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => {
          track.stop();
          console.log(`Media stream track ${track.kind} stopped`);
        });
        setMediaStream(null);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
        console.log("Video element srcObject cleared");
      }

      let finalTranscript = session?.transcript || [];
      if (
        finalTranscript.length > 0 &&
        userResponse &&
        finalTranscript[finalTranscript.length - 1].answer === ""
      ) {
        finalTranscript = finalTranscript.map((entry, index) =>
          index === finalTranscript.length - 1
            ? { ...entry, answer: userResponse }
            : entry
        );
        console.log("Final transcript updated:", finalTranscript);
      }

      // Generate Feedback (Dynamic -> Fallback)
      let strengths: string[] = [];
      let improvements: string[] = [];
      let overallScore = 0;

      try {
        console.log("Generating dynamic AI feedback...");
        const aiFeedback = await generateInterviewFeedback(
          finalTranscript,
          session?.jobDescription || "Software Engineer"
        );
        strengths = aiFeedback.strengths;
        improvements = aiFeedback.improvements;
        overallScore = aiFeedback.overallScore;
        console.log("AI Feedback generated:", aiFeedback);
      } catch (error) {
        console.error("AI Feedback generation failed, falling back to static logic:", error);
        toast({
          title: "AI Feedback Unavailable",
          description: "Could not generate AI feedback. Using basic analysis instead.",
          variant: "default", // not destructive, just info
        });
        const staticFb = generateStaticFeedback(finalTranscript);
        strengths = staticFb.strengths;
        improvements = staticFb.improvements;
        overallScore = staticFb.overallScore;
      }

      const updatedSession = {
        ...session!,
        recordings: recordedBlobs ? [] : [],
        feedback: {
          strengths,
          improvements,
          overallScore,
          transcript: finalTranscript,
          recording: recordedBlobs ? [] : [],
        },
        isCompleted: true,
      };

      if (recordedBlobs && session) {
        try {
          recordingUrl = await saveSessionWithRecording(
            updatedSession,
            recordedBlobs
          );
          if (recordingUrl) {
            updatedSession.recordings = [recordingUrl];
            updatedSession.feedback.recording = [recordingUrl];
            console.log("Recording saved, URL:", recordingUrl);
          } else {
            console.warn("No recording URL returned, saving locally.");
            const blobUrl = URL.createObjectURL(recordedBlobs[0]);
            updatedSession.recordings = [blobUrl];
            updatedSession.feedback.recording = [blobUrl];
            console.log("Recording saved locally:", blobUrl);
            toast({
              title: "Recording Saved Locally",
              description: "Failed to upload to Firebase, saved locally.",
              variant: "default",
            });
          }
        } catch (error) {
          console.error("Error saving recording:", error);
          const blobUrl = URL.createObjectURL(recordedBlobs[0]);
          updatedSession.recordings = [blobUrl];
          updatedSession.feedback.recording = [blobUrl];
          console.log("Recording saved locally due to error:", blobUrl);
          toast({
            title: "Recording Save Error",
            description: "Saved recording locally due to Firebase error.",
            variant: "destructive",
          });
        }
      }

      try {
        await saveSession(updatedSession);
        console.log("Session metadata saved:", updatedSession);
      } catch (error) {
        console.error("Error saving session metadata:", error);
        toast({
          title: "Metadata Save Error",
          description: "Failed to save session metadata.",
          variant: "destructive",
        });
      }

      try {
        await updateUserData(uid, title, hrCode);
      } catch (error) {
        console.error("Error updating user data:", error);
        toast({
          title: "User Data Update Error",
          description: "Failed to update interview records.",
          variant: "destructive",
        });
      }

      setSession(updatedSession);
      onComplete(updatedSession.feedback!);
      toast({
        title: "Interview Completed",
        description: "Your interview has ended. View feedback for details.",
        variant: "default",
      });
      console.log("Interview finished, feedback sent");
    } catch (error) {
      console.error("Error finishing interview:", error);
      toast({
        title: "Error",
        description: "An error occurred while ending the interview.",
        variant: "destructive",
      });
    } finally {
      setIsFinishing(false);
    }
  };

  useLayoutEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversation]);

  useEffect(() => {
    let animationFrameId: number;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;

      if (micIconRef.current) {
        // USER SPEAKING
        if (
          isListening &&
          analyserRef.current &&
          audioContextRef.current?.state === "running"
        ) {
          const dataArray = new Uint8Array(
            analyserRef.current.frequencyBinCount
          );
          analyserRef.current.getByteFrequencyData(dataArray);

          const rawVolume =
            dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          const normalizedVolume = Math.min(rawVolume / 128, 1);

          if (!isNaN(normalizedVolume)) {
            const pulseScale = 1 + normalizedVolume * 0.4;
            const glowIntensity = normalizedVolume * 30;
            const opacity = 0.9 + normalizedVolume * 0.1;
            const rotation = Math.sin(timestamp / 100) * 2;
            const hueShift = (timestamp / 10) % 360;

            micIconRef.current.style.transform = `scale(${pulseScale}) rotate(${rotation}deg)`;
            micIconRef.current.style.opacity = `${Math.min(opacity, 1)}`;
            micIconRef.current.style.setProperty(
              "--glow-color",
              `radial-gradient(circle, rgba(0,255,150,0.5), rgba(0,150,255,0.5))`
            );
            micIconRef.current.style.setProperty(
              "--glow-intensity",
              `${glowIntensity}px`
            );
            micIconRef.current.style.setProperty(
              "--overlay-opacity",
              `${0.4 + normalizedVolume * 0.4}`
            );
            micIconRef.current.style.filter = `hue-rotate(${hueShift}deg) brightness(1.2)`;
          }
        }

        // AI SPEAKING
        else if (isProcessing) {
          const elapsed = timestamp - startTime;
          const pulseScale = 1 + Math.sin(elapsed / 300) * 0.25;
          const glowIntensity = 10 + Math.sin(elapsed / 500) * 10;
          const waveAngle = Math.sin(elapsed / 250) * 5;
          const hueShift = (timestamp / 5) % 360;

          micIconRef.current.style.transform = `scale(${pulseScale}) rotate(${waveAngle}deg)`;
          micIconRef.current.style.opacity = `0.95`;
          micIconRef.current.style.setProperty(
            "--glow-color",
            `radial-gradient(circle, rgba(255,0,200,0.5), rgba(255,0,100,0.5))`
          );
          micIconRef.current.style.setProperty(
            "--glow-intensity",
            `${glowIntensity}px`
          );
          micIconRef.current.style.setProperty(
            "--overlay-opacity",
            `${0.5 + Math.sin(elapsed / 400) * 0.3}`
          );
          micIconRef.current.style.filter = `hue-rotate(${hueShift}deg) brightness(1.2)`;
        }

        // IDLE
        else {
          micIconRef.current.style.transform = `scale(1) rotate(0deg)`;
          micIconRef.current.style.opacity = "0.8";
          micIconRef.current.style.setProperty("--glow-color", "transparent");
          micIconRef.current.style.setProperty("--glow-intensity", "0px");
          micIconRef.current.style.setProperty("--overlay-opacity", "0");
          micIconRef.current.style.filter = "";
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    if (isListening || isProcessing) {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (micIconRef.current) {
        micIconRef.current.style.transform = `scale(1) rotate(0deg)`;
        micIconRef.current.style.opacity = "0.8";
        micIconRef.current.style.setProperty("--glow-color", "transparent");
        micIconRef.current.style.setProperty("--glow-intensity", "0px");
        micIconRef.current.style.setProperty("--overlay-opacity", "0");
        micIconRef.current.style.filter = "";
      };
    };
  }, [isListening, isProcessing]);

  if (!isInterviewStarted) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#ECF1F0] font-sans flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#11011E] border border-[rgba(255,255,255,0.05)] rounded-xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold mb-6 text-center text-[#0FAE96] font-raleway">
            Choose Interviewer Voice
          </h2>

          <div className="space-y-4 mb-8">
            <div
              onClick={() => setVoiceType("male")}
              className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 flex items-center justify-between ${voiceType === "male"
                ? "bg-[rgba(15,174,150,0.1)] border-[#0FAE96]"
                : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.05)]"
                }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${voiceType === "male" ? "bg-[#0FAE96] text-white" : "bg-[rgba(255,255,255,0.1)]"
                  }`}>
                  <Volume2 className="w-5 h-5" />
                </div>
                <span className="font-medium">Male Voice</span>
              </div>
              {voiceType === "male" && (
                <div className="w-3 h-3 rounded-full bg-[#0FAE96]" />
              )}
            </div>

            <div
              onClick={() => setVoiceType("female")}
              className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 flex items-center justify-between ${voiceType === "female"
                ? "bg-[rgba(15,174,150,0.1)] border-[#0FAE96]"
                : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.05)]"
                }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${voiceType === "female" ? "bg-[#0FAE96] text-white" : "bg-[rgba(255,255,255,0.1)]"
                  }`}>
                  <Volume2 className="w-5 h-5" />
                </div>
                <span className="font-medium">Female Voice</span>
              </div>
              {voiceType === "female" && (
                <div className="w-3 h-3 rounded-full bg-[#0FAE96]" />
              )}
            </div>
          </div>

          <Button
            onClick={handleStartInterview}
            className="w-full bg-[#0FAE96] text-white font-raleway font-semibold text-lg py-6 rounded-lg hover:scale-[1.02] transition duration-200"
          >
            Start Interview
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ECF1F0] font-sans grid grid-cols-1 md:grid-cols-4 overflow-hidden relative">
      {/* Loading Overlay - Shows while generating feedback */}
      {isFinishing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#11011E] border border-[rgba(255,255,255,0.1)] rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
            {/* Simple Spinner */}
            <div className="w-12 h-12 border-4 border-[#0FAE96]/30 border-t-[#0FAE96] rounded-full animate-spin mx-auto mb-6"></div>

            {/* Text */}
            <h3 className="text-xl font-raleway font-semibold text-[#0FAE96] mb-2">
              Generating Feedback
            </h3>
            <p className="text-[#ECF1F0]/60 font-inter text-sm">
              Please wait...
            </p>
          </div>
        </div>
      )}

      {/* Left: Video & Controls */}
      <div className="md:col-span-3 relative bg-[#11011E] flex flex-col justify-between p-4 min-h-[450px] overflow-hidden">
        {/* Background Blurs */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-[#7000FF] blur-[180px] opacity-20 rounded-full z-0"></div>
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-[#FF00C7] blur-[180px] opacity-20 rounded-full z-0"></div>

        {/* Video or Placeholder */}
        <div className="flex-1 relative z-10 rounded-lg overflow-hidden border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]">
          {hasMediaPermission ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-[#ECF1F0] font-raleway">
                Camera access required
              </p>
            </div>
          )}

          {/* 🔽 Controls inside video box */}
          <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 z-20">
            {/* Mic */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleMic}
              className={`rounded-full h-10 w-10 border-2 ${micEnabled
                ? "bg-[#0FAE96] border-[#0FAE96] text-white hover:bg-[#0FAE96]/80"
                : "bg-[#FF00C7]/80 border-[#FF00C7] text-white hover:bg-[#FF00C7]"
                }`}
            >
              {micEnabled ? (
                <Mic className="h-4 w-4 ml-2.5" />
              ) : (
                <MicOff className="h-4 w-4 ml-2.5" />
              )}
            </Button>

            {/* Video */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleVideo}
              className={`rounded-full h-10 w-10 border-2 ${videoEnabled
                ? "bg-[#0FAE96] border-[#0FAE96] text-white hover:bg-[#0FAE96]/80"
                : "bg-[#FF00C7]/80 border-[#FF00C7] text-white hover:bg-[#FF00C7]"
                }`}
            >
              {videoEnabled ? (
                <Video className="h-4 w-4 ml-2.5" />
              ) : (
                <VideoOff className="h-4 w-4 ml-2.5" />
              )}
            </Button>

            {/* Voice */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleVoice}
              className={`rounded-full h-10 w-10 border-2 ${voiceEnabled
                ? "bg-[#0FAE96] border-[#0FAE96] text-white hover:bg-[#0FAE96]/80"
                : "bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.2)]"
                }`}
            >
              {voiceEnabled ? (
                <Volume2 className="h-4 w-4 ml-2.5" />
              ) : (
                <VolumeX className="h-4 w-4 ml-2.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mic Animation */}
        {
          (isListening || isProcessing) && (
            <div className="flex flex-col items-center justify-center mt-4 z-10">
              <div
                className="w-12 h-12 rounded-full relative overflow-hidden mic-animation"
                ref={micIconRef}
              >
                <img
                  src="/images/interview.jpeg"
                  alt="Mic Animation"
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    console.error("Mic image failed:", e);
                    e.currentTarget.style.display = 'none'; // Hide if fails
                  }}
                />
                <div
                  className={`absolute inset-0 rounded-full opacity-40 mix-blend-multiply transition-all duration-300 ${isListening ? "bg-[#0FAE96]" : "bg-[#FF00C7]"
                    }`}
                ></div>
              </div>
              {!isListening && (
                <p className="text-sm text-[#ECF1F0] mt-1 font-raleway">
                  AI Thinking...
                </p>
              )}
            </div>
          )
        }
      </div>

      {/* Right: Chat Panel */}
      {/* Right Panel - Chat + Buttons */}
      <div className="p-6 bg-[#11011E] border-l border-[rgba(255,255,255,0.05)] flex flex-col md:col-span-1">
        {/* Chat History with Scrollable Area (Fixed Height) */}
        <div
          ref={chatScrollRef}
          className="flex-1 min-h-0 max-h-[360px] overflow-y-auto space-y-4 pr-1 hide-scrollbar"
        >
          {conversation.map((msg, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border text-sm font-inter ${msg.role === "assistant"
                ? "bg-[rgba(15,174,150,0.1)] border-[rgba(15,174,150,0.2)] text-[#B6F2E5]"
                : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.05)] text-[#ECF1F0]"
                }`}
            >
              <span className="font-medium mr-1">
                {msg.role === "assistant" ? "AI:" : "You:"}
              </span>
              {msg.content}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {/* Speak + End Buttons */}
        <div className="mt-5 space-y-3">
          {/* Voice Selection */}


          {/* Status Indicator - Shows user when they can speak */}
          <div className={`w-full px-6 py-4 rounded-lg border-2 transition-all duration-300 flex items-center justify-center gap-3 ${isProcessing
            ? "bg-[rgba(255,0,199,0.1)] border-[rgba(255,0,199,0.3)] text-[#FF00C7]"
            : isListening
              ? "bg-[rgba(15,174,150,0.15)] border-[rgba(15,174,150,0.4)] text-[#0FAE96]"
              : waitingForResponse
                ? "bg-[rgba(15,174,150,0.1)] border-[rgba(15,174,150,0.3)] text-[#B6F2E5]"
                : "bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)] text-[#ECF1F0]/60"
            }`}>
            {isProcessing ? (
              <>
                <div className="w-3 h-3 bg-[#FF00C7] rounded-full animate-pulse" />
                <span className="font-raleway font-medium">AI is responding...</span>
              </>
            ) : isListening ? (
              <>
                <div className="flex gap-1">
                  <div className="w-1.5 h-4 bg-[#0FAE96] rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" />
                  <div className="w-1.5 h-4 bg-[#0FAE96] rounded-full animate-[bounce_0.6s_ease-in-out_infinite_0.1s]" />
                  <div className="w-1.5 h-4 bg-[#0FAE96] rounded-full animate-[bounce_0.6s_ease-in-out_infinite_0.2s]" />
                </div>
                <span className="font-raleway font-semibold">Listening... Speak now!</span>
              </>
            ) : waitingForResponse ? (
              <>
                <Mic className="w-5 h-5" />
                <span className="font-raleway font-medium">You can speak now...</span>
              </>
            ) : (
              <span className="font-raleway">Interview starting...</span>
            )}
          </div>
          <Button
            className="w-full bg-[#FF00C7]/80 text-white font-raleway font-semibold text-base px-6 py-3 rounded-md hover:scale-105 transition duration-200 disabled:opacity-50"
            onClick={handleFinishInterview}
            disabled={isFinishing}
          >
            End Interview
          </Button>
        </div>
      </div>
    </div>
  );
};
export default InterviewSession;