import type { SessionType } from "@/app/interview/interview_dashboard/page";
import app, { isFirebaseConfigured } from "@/firebase/config.js";
import { getDatabase, ref as dbRef, set, get, child, query, orderByChild } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { toast } from "@/components/ui/use-toast";

let db = null;
let storageInstance = null;

const isClient = typeof window !== 'undefined';
const isLocalhost = isClient && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

console.log("⚠️ Firebase Configured (from config):", isFirebaseConfigured);
console.log("⚠️ Running on Localhost:", isLocalhost);

// --- Firebase Initialization ---
if (isClient && isFirebaseConfigured && app) {
  console.log("✅ Firebase app is configured and running on client side.");

  if (isLocalhost && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
    console.log("Emulator mode flag (NEXT_PUBLIC_USE_FIREBASE_EMULATOR) is enabled on localhost.");
    if (!process.env.NEXT_PUBLIC_FIREBASE_DATABASE_EMULATOR_HOST && !process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST) {
      console.warn("⚠️ NEXT_PUBLIC_USE_FIREBASE_EMULATOR is true, but no emulator host env vars found. Check your .env.local file for NEXT_PUBLIC_FIREISE_DATABASE_EMULATOR_HOST and NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST.");
      toast({
        title: "Emulator Hosts Missing",
        description: "Emulator flag is set, but host variables are missing. Check .env.local",
        variant: "destructive",
      });
    } else {
      if (process.env.NEXT_PUBLIC_FIREBASE_DATABASE_EMULATOR_HOST) {
        console.log(`✅ RTDB Emulator host specified: ${process.env.NEXT_PUBLIC_FIREBASE_DATABASE_EMULATOR_HOST}`);
      }
      if (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST) {
        console.log(`✅ Storage Emulator host specified: ${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST}`);
      } else {
        console.warn("⚠️ Storage Emulator host not specified. Uploads may fail.");
        toast({
          title: "Storage Emulator Host Missing",
          description: "NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST not set. Check .env.local.",
          variant: "destructive",
        });
      }
      console.log("Firebase SDK will attempt to connect to specified emulators automatically.");
    }
  } else {
    console.log("Emulator mode flag not enabled or not on localhost. Connecting to production Firebase.");
  }

  try {
    db = getDatabase(app);
    console.log("✅ Firebase Realtime Database initialized.");
  } catch (error: any) {
    console.error("❌ Failed to initialize Firebase Realtime Database:", error.message, error.stack);
    db = null;
    toast({
      title: "RTDB Initialization Failed",
      description: `Could not initialize RTDB. Error: ${error.message}`,
      variant: "destructive",
    });
  }

  try {
    storageInstance = getStorage(app);
    console.log("✅ Firebase Storage initialized.");
  } catch (error: any) {
    console.error("❌ Failed to initialize Firebase Storage:", error.message, error.stack);
    storageInstance = null;
    toast({
      title: "Storage Initialization Failed",
      description: `Could not initialize Storage. Error: ${error.message}`,
      variant: "destructive",
    });
  }

} else {
  console.log("⚠️ Firebase app is not configured or not on client side. Firebase services will not be initialized.");
}

console.log("⚠️ Realtime Database Initialized (post-setup):", !!db);
console.log("⚠️ Storage Initialized (post-setup):", !!storageInstance);

export interface StoredSession extends Omit<SessionType, 'recording' | 'feedback'> {
  recording?: string[] | null;
  recordingUrl?: string | null;

  jobDescription?: string;
  email?: string;
  name?: string;

  timestamp: number;

  feedback?: {
    recording?: string[] | null;
    overallScore?: number;

    strengths: string[];
    improvements: string[];

    transcript?: Array<{
      isCompleted: boolean;
      jobDescription: string;
      role: string;
      sessionId: string;
      skillLevel: string;
      timestamp: number;
    }>;
  };
}

// Retry utility for Firebase Storage operations
const retryOperation = async <T>(operation: () => Promise<T>, maxAttempts: number = 3, delayMs: number = 1000): Promise<T> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`RetryOperation: Attempt ${attempt} of ${maxAttempts}`);
      return await operation();
    } catch (error: any) {
      console.error(`RetryOperation: Attempt ${attempt} failed:`, error.message);
      if (attempt === maxAttempts) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw new Error("RetryOperation: Unreachable code");
};

export const storeRecording = async (sessionId: string, recordingBlobs: Blob[]): Promise<string | undefined> => {
  console.log(`storeRecording: Attempting to store recording for session ${sessionId}. Storage available: ${!!storageInstance}, Running on Client: ${isClient}`);
  let recordingUrl: string | undefined;

  try {
    if (!recordingBlobs || recordingBlobs.length === 0) {
      console.warn("storeRecording: No recording data provided.");
      toast({ title: "Recording Error", description: "No recording data was captured.", variant: "destructive" });
      return undefined;
    }

    let videoBlob: Blob | undefined;
    if (isClient) {
      videoBlob = new Blob(recordingBlobs, { type: "video/webm" });
      if (videoBlob.size === 0) {
        console.warn("storeRecording: Video Blob is empty after creation.");
        toast({ title: "Recording Error", description: "Captured recording data is empty.", variant: "destructive" });
        return undefined;
      }
      console.log(`storeRecording: Created video blob of size ${videoBlob.size} bytes.`);
    } else {
      console.warn("storeRecording: Not on client side, cannot create local video blob for fallback.");
    }

    if (!isFirebaseConfigured || !storageInstance) {
      console.log("storeRecording: Firebase or Storage is not configured/initialized. Attempting local URL fallback.");
      toast({
        title: "Firebase Storage Not Available",
        description: "Video will be available locally for this session only (if on client).",
        variant: "default"
      });

      if (isClient && videoBlob && videoBlob.size > 0) {
        recordingUrl = URL.createObjectURL(videoBlob);
        console.log(`storeRecording: Returning local URL: ${recordingUrl}.`);
        return recordingUrl;
      } else {
        console.warn("storeRecording: Cannot create local URL fallback (not on client, or empty/missing blob).");
        return undefined;
      }
    }

    if (!isClient || !videoBlob) {
      console.error("storeRecording: Logic error - Attempting Firebase upload but not on client or no videoBlob.");
      toast({ title: "Recording Error", description: "Internal error before upload attempt.", variant: "destructive" });
      return undefined;
    }

    const uploadToStorage = async (): Promise<string> => {
      const storagePath = storageRef(storageInstance!, `recordings/${sessionId}.webm`);
      console.log(`storeRecording: Attempting to upload recording to Firebase Storage path: ${storagePath.fullPath}`);
      await retryOperation(() => uploadBytes(storagePath, videoBlob!), 3, 1000);
      console.log(`storeRecording: Upload successful for ${storagePath.fullPath}.`);
      const downloadURL = await retryOperation(() => getDownloadURL(storagePath), 3, 1000);
      console.log(`storeRecording: Download URL obtained: ${downloadURL}`);
      return downloadURL;
    };

    if (isLocalhost) {
      const LOCALHOST_UPLOAD_TIMEOUT_MS = 30000; // Increased to 30 seconds
      console.log(`storeRecording: Running on localhost. Attempting upload with ${LOCALHOST_UPLOAD_TIMEOUT_MS / 1000}s timeout.`);
      try {
        const result = await Promise.race([
          uploadToStorage(),
          new Promise((_, reject) => setTimeout(() => reject(new Error(`Localhost upload timeout (${LOCALHOST_UPLOAD_TIMEOUT_MS / 1000}s)`)), LOCALHOST_UPLOAD_TIMEOUT_MS))
        ]);
        recordingUrl = result as string;
        console.log(`storeRecording (localhost): Firebase Storage upload successful within timeout. Returning cloud URL.`);
        return recordingUrl;
      } catch (err: any) {
        console.error("storeRecording (localhost): Firebase Storage upload failed:", err.message, err.stack);
        toast({
          title: "Local Dev Storage Issue",
          description: `Upload to Firebase Storage failed (${err.message}). Using local video URL.`,
          variant: "default",
        });
        if (isClient && videoBlob && videoBlob.size > 0) {
          recordingUrl = URL.createObjectURL(videoBlob);
          console.log(`storeRecording (localhost): Falling back to local URL: ${recordingUrl}.`);
          return recordingUrl;
        } else {
          console.warn("storeRecording (localhost): Cannot create local URL fallback (not on client or empty blob) after upload failure.");
          return undefined;
        }
      }
    } else {
      console.log("storeRecording: Running in deployed environment. Attempting direct upload.");
      recordingUrl = await uploadToStorage();
      console.log(`storeRecording (deployed): Recording uploaded successfully. Returning cloud URL: ${recordingUrl}`);
      return recordingUrl;
    }

  } catch (error: any) {
    console.error("storeRecording: A general error occurred during recording storage process:", error.message, error.stack);
    toast({
      title: "Recording Storage Failed",
      description: `Could not save video to cloud storage. Error: ${error.message}. Attempting local save.`,
      variant: "destructive"
    });

    if (isClient && recordingBlobs && recordingBlobs.length > 0) {
      try {
        const videoBlob = new Blob(recordingBlobs, { type: "video/webm" });
        if (videoBlob.size > 0) {
          recordingUrl = URL.createObjectURL(videoBlob);
          console.log(`storeRecording: Falling back to local URL due to error: ${recordingUrl}`);
          return recordingUrl;
        } else {
          console.warn("storeRecording: Blob is empty even in error fallback. Cannot create local URL.");
          return undefined;
        }
      } catch (blobError: any) {
        console.error("storeRecording: Failed to create local URL during error fallback:", blobError.message);
        return undefined;
      }
    } else {
      console.warn("storeRecording: Not on client or no valid blobs available for local URL fallback.");
      return undefined;
    }
  }
};

export const saveSession = async (session: Omit<StoredSession, 'timestamp'>): Promise<void> => {
  const email = localStorage.getItem("email") || "";
  const name = localStorage.getItem("name") || "";
  const timestamp = Date.now();
  const sessionId = session.sessionId || uuidv4();
  const sessionData: StoredSession = {
    ...session,
    sessionId,
    timestamp,
    name,
    email,
    feedback: session.feedback || {
      recording: null,
      overallScore: 0,
      strengths: [],
      improvements: [],
      transcript: []
    } // Ensure feedback is fully initialized
  };

  console.log(`saveSession: Attempting to save session ${sessionId} metadata. RTDB available: ${!!db}, Running on Client: ${isClient}`);

  try {
    if (!isFirebaseConfigured || !db) {
      console.log("saveSession: Firebase or RTDB not configured/initialized. Saving session metadata locally.");
      if (isClient) {
        const localSessions = JSON.parse(localStorage.getItem('interviewSessions') || '{}');
        localSessions[sessionId] = sessionData;
        localStorage.setItem('interviewSessions', JSON.stringify(localSessions));
        console.log(`saveSession: Session ${sessionId} metadata saved locally.`);
        toast({ title: "Session Metadata Saved", description: "Metadata saved locally." });
      } else {
        console.warn("saveSession: Cannot save locally outside of client environment.");
        toast({ title: "Save Failed", description: "Cannot save outside client environment.", variant: "destructive" });
        throw new Error("Cannot save session metadata outside client environment without Firebase.");
      }
      return;
    }

    // Always save full session data to interviews/${sessionId}
    const mainSessionRef = dbRef(db, `interviews/${sessionId}`);
    await set(mainSessionRef, sessionData);
    console.log(`saveSession: Full session ${sessionId} metadata saved to Realtime Database at interviews/${sessionId}.`);

    // If hr_code exists, save only sessionId to hr/${hrCode}/interviews/${sessionId}
    let hrCode = null;
    if (isClient) {
      hrCode = localStorage.getItem('hr_code');
      if (hrCode) {
        console.log(`saveSession: hr_code found in localStorage: ${hrCode}. Saving sessionId to hr/${hrCode}/interviews/${sessionId}`);
        const hrSessionRef = dbRef(db, `hr/${hrCode}/interviews/${sessionId}`);
        await set(hrSessionRef, sessionId);
        console.log(`saveSession: SessionId ${sessionId} saved to hr/${hrCode}/interviews/${sessionId}.`);
      } else {
        console.log(`saveSession: No hr_code found in localStorage. Only saving full session data to interviews/${sessionId}.`);
      }
    } else {
      console.log(`saveSession: Not on client side, only saving full session data to interviews/${sessionId}.`);
    }

    toast({ title: "Session Metadata Saved", description: "Metadata saved to cloud." });

    // Remove hr_code from localStorage if it exists
    if (isClient && hrCode) {
      localStorage.removeItem('hr_code');
      console.log(`saveSession: Removed hr_code from localStorage after successful save.`);
    }

  } catch (error: any) {
    console.error("saveSession: Error saving session metadata:", error.message, error.stack);
    toast({
      title: "Session Metadata Save Failed",
      description: `Could not save metadata to cloud. Error: ${error.message}`,
      variant: "destructive"
    });
    if (isClient) {
      const localSessions = JSON.parse(localStorage.getItem('interviewSessions') || '{}');
      localSessions[sessionId] = sessionData;
      localStorage.setItem('interviewSessions', JSON.stringify(localSessions));
      console.log(`saveSession: Session ${sessionId} metadata saved locally as fallback.`);
    } else {
      console.warn("saveSession: Cannot save locally as fallback outside of client environment.");
      throw new Error(`Failed to save session metadata. Error: ${error.message}`);
    }
  }
};

export const saveSessionWithRecording = async (session: Omit<StoredSession, 'timestamp' | 'recordingUrl'>, recordingBlobs: Blob[]): Promise<string | undefined> => {
  const sessionId = session.sessionId || uuidv4();
  let recordingUrl: string | undefined;
  const timestamp = Date.now();

  // Ensure feedback is fully initialized
  const sessionData: StoredSession = {
    ...session,
    sessionId,
    timestamp,
    recording: null,
    recordingUrl: null,
    feedback: session.feedback ? {
      ...session.feedback,
      recording: null,
      overallScore: session.feedback.overallScore ?? 0,
      strengths: session.feedback.strengths ?? [],
      improvements: session.feedback.improvements ?? [],
      transcript: session.feedback.transcript ?? []
    } : {
      recording: null,
      overallScore: 0,
      strengths: [],
      improvements: [],
      transcript: []
    },
  };

  console.log(`saveSessionWithRecording: Attempting to save session ${sessionId} including recording.`);

  try {
    // Save recording to Firebase Storage
    console.log(`saveSessionWithRecording: Calling storeRecording for session ${sessionId}`);
    recordingUrl = await storeRecording(sessionId, recordingBlobs);

    if (recordingUrl !== undefined) {
      sessionData.recordingUrl = recordingUrl || null;
      sessionData.recording = [recordingUrl];
      if (sessionData.feedback) {
        sessionData.feedback = {
          ...sessionData.feedback,
          recording: [recordingUrl],
        };
      }
      console.log(`saveSessionWithRecording: Recording URL obtained from storeRecording: ${recordingUrl}.`);
    } else {
      console.warn("saveSessionWithRecording: storeRecording did not return a URL. Session metadata will be saved without recording URL.");
      toast({
        title: "Recording URL Missing",
        description: "Recording was not saved to Storage. Saving session metadata only.",
        variant: "default",
      });
    }

    console.log(`saveSessionWithRecording: Session data before saving:`, JSON.stringify(sessionData, null, 2));

    if (!isFirebaseConfigured || !db) {
      console.log("saveSessionWithRecording: Firebase or RTDB not configured/initialized. Saving session locally.");
      if (isClient) {
        const localSessions = JSON.parse(localStorage.getItem('interviewSessions') || '{}');
        localSessions[sessionId] = sessionData;
        localStorage.setItem('interviewSessions', JSON.stringify(localSessions));
        console.log(`saveSessionWithRecording: Session ${sessionId} with recording status saved locally.`);
        toast({ title: "Session Saved", description: "Session data saved locally." + (recordingUrl ? " Video available locally." : "") });
      } else {
        console.warn("saveSessionWithRecording: Cannot save locally outside of client environment.");
        toast({ title: "Save Failed", description: "Cannot save outside client environment.", variant: "destructive" });
        throw new Error("Cannot save session with recording outside client environment without Firebase.");
      }
      return recordingUrl;
    }

    // Always save full session data to interviews/${sessionId}
    const mainSessionRef = dbRef(db, `interviews/${sessionId}`);
    await set(mainSessionRef, sessionData);
    console.log(`saveSessionWithRecording: Full session ${sessionId} with recording status saved to Realtime Database at interviews/${sessionId}.`);

    // If hr_code exists, save only sessionId to hr/${hrCode}/interviews/${sessionId}
    let hrCode = null;
    if (isClient) {
      hrCode = localStorage.getItem('hr_code');
      if (hrCode) {
        console.log(`saveSessionWithRecording: hr_code found in localStorage: ${hrCode}. Saving sessionId to hr/${hrCode}/interviews/${sessionId}`);
        const hrSessionRef = dbRef(db, `hr/${hrCode}/interviews/${sessionId}`);
        await set(hrSessionRef, sessionId);
        console.log(`saveSessionWithRecording: SessionId ${sessionId} saved to hr/${hrCode}/interviews/${sessionId}.`);
      } else {
        console.log(`saveSessionWithRecording: No hr_code found in localStorage. Only saving full session data to interviews/${sessionId}.`);
      }
    } else {
      console.log(`saveSessionWithRecording: Not on client side, only saving full session data to interviews/${sessionId}.`);
    }

    toast({
      title: "Session Saved",
      description: "Session data saved to cloud." +
        (recordingUrl && !recordingUrl.startsWith('blob:') ? " Video uploaded." : "") +
        (recordingUrl && recordingUrl.startsWith('blob:') ? " Video saved locally only." : "")
    });

    // Remove hr_code from localStorage if it exists
    if (isClient && hrCode) {
      localStorage.removeItem('hr_code');
      console.log(`saveSessionWithRecording: Removed hr_code from localStorage after successful save.`);
    }

  } catch (error: any) {
    console.error("saveSessionWithRecording: Error saving session metadata after recording attempt:", error.message, error.stack);
    toast({
      title: "Session Save Failed",
      description: `Could not save session metadata to cloud. Error: ${error.message}. Data saved locally.`,
      variant: "destructive"
    });

    if (isClient) {
      const localSessions = JSON.parse(localStorage.getItem('interviewSessions') || '{}');
      localSessions[sessionId] = sessionData;
      localStorage.setItem('interviewSessions', JSON.stringify(localSessions));
      console.log(`saveSessionWithRecording: Session ${sessionId} saved locally as fallback.`);
    } else {
      console.warn("saveSessionWithRecording: Cannot save locally as fallback outside of client environment.");
      throw new Error(`Failed to save session with recording. Error: ${error.message}`);
    }
  }

  return recordingUrl;
};

export const getSession = async (sessionId: string): Promise<StoredSession | null> => {
  console.log(`getSession: Attempting to retrieve session ${sessionId}. RTDB available: ${!!db}, Running on Client: ${isClient}`);
  try {
    if (!isFirebaseConfigured || !db) {
      console.log("getSession: Firebase or RTDB not configured/initialized. Retrieving session locally.");
      if (isClient) {
        const localSessions = JSON.parse(localStorage.getItem('interviewSessions') || '{}');
        console.log(`getSession: Retrieved session ${sessionId} from local storage.`);
        return localSessions[sessionId] || null;
      } else {
        console.warn("getSession: Cannot retrieve locally outside of client environment.");
        return null;
      }
    }

    console.log(`getSession: Attempting to retrieve session ${sessionId} from Realtime Database.`);
    const sessionRef = dbRef(db);
    const snapshot = await get(child(sessionRef, `interviews/${sessionId}`));
    const session = snapshot.exists() ? snapshot.val() as StoredSession : null;
    console.log(`getSession: Retrieved session ${sessionId} from RTDB. Exists: ${snapshot.exists()}`);
    return session;
  } catch (error: any) {
    console.error("getSession: Error retrieving session:", error.message, error.stack);
    toast({
      title: "Failed to Get Session",
      description: `Could not retrieve session from cloud. Error: ${error.message}. Checking local storage.`,
      variant: "destructive"
    });
    if (isClient) {
      const localSessions = JSON.parse(localStorage.getItem('interviewSessions') || '{}');
      console.log(`getSession: Retrieved session ${sessionId} from local storage as fallback.`);
      return localSessions[sessionId] || null;
    } else {
      console.warn("getSession: Cannot retrieve locally as fallback outside of client environment.");
      throw new Error(`Failed to get session. Error: ${error.message}`);
    }
  }
};

export const getAllSessions = async (): Promise<StoredSession[]> => {
  console.log(`getAllSessions: Attempting to retrieve all sessions. RTDB available: ${!!db}, Running on Client: ${isClient}`);
  try {
    if (!isFirebaseConfigured || !db) {
      console.log("getAllSessions: Firebase or RTDB not configured/initialized. Retrieving all sessions locally.");
      if (isClient) {
        const localSessions = JSON.parse(localStorage.getItem('interviewSessions') || '{}');
        const sessions = Object.values(localSessions).filter(
          (s): s is StoredSession => typeof s === 'object' && s !== null && 'sessionId' in s && 'timestamp' in s
        ).sort((a, b) => b.timestamp - a.timestamp);
        console.log(`getAllSessions: Retrieved ${sessions.length} sessions from local storage.`);
        return sessions;
      } else {
        console.warn("getAllSessions: Cannot retrieve locally outside of client environment.");
        return [];
      }
    }

    console.log("getAllSessions: Attempting to retrieve all sessions from Realtime Database.");
    const sessionsRef = dbRef(db, "interviews");
    const snapshot = await get(sessionsRef);

    if (!snapshot.exists()) {
      console.log("getAllSessions: No sessions found in Realtime Database.");
      return [];
    }

    const sessions = Object.values(snapshot.val() || {}).filter(
      (s): s is StoredSession => typeof s === 'object' && s !== null && 'sessionId' in s && 'timestamp' in s
    );
    sessions.sort((a, b) => b.timestamp - a.timestamp);
    console.log(`getAllSessions: Retrieved ${sessions.length} sessions from Realtime Database.`);
    return sessions;
  } catch (error: any) {
    console.error("getAllSessions: Error getting all sessions:", error.message, error.stack);
    toast({
      title: "Failed to Get Sessions",
      description: `Could not retrieve sessions from cloud. Error: ${error.message}. Checking local storage.`,
      variant: "destructive"
    });
    if (isClient) {
      const localSessions = JSON.parse(localStorage.getItem('interviewSessions') || '{}');
      const sessions = Object.values(localSessions).filter(
        (s): s is StoredSession => typeof s === 'object' && s !== null && 'sessionId' in s && 'timestamp' in s
      ).sort((a, b) => b.timestamp - a.timestamp);
      console.log(`getAllSessions: Retrieved ${sessions.length} sessions from local storage as fallback.`);
      return sessions;
    } else {
      console.warn("getAllSessions: Cannot retrieve locally as fallback outside of client environment.");
      throw new Error(`Failed to get all sessions. Error: ${error.message}`);
    }
  }
};

export const clearSessions = async (): Promise<void> => {
  console.log(`clearSessions: Attempting to clear all sessions. RTDB available: ${!!db}, Running on Client: ${isClient}`);
  try {
    if (!isFirebaseConfigured || !db) {
      console.log("clearSessions: Firebase or RTDB not configured/initialized. Clearing sessions locally.");
      if (isClient) {
        localStorage.removeItem('interviewSessions');
        console.log("clearSessions: All local sessions cleared.");
        toast({ title: "Sessions Cleared", description: "All local sessions have been removed." });
      } else {
        console.warn("clearSessions: Cannot clear locally outside of client environment.");
        toast({ title: "Clear Failed", description: "Cannot clear outside client environment.", variant: "destructive" });
        throw new Error("Cannot clear sessions outside client environment without Firebase.");
      }
      return;
    }

    console.log("clearSessions: Attempting to clear all sessions from Realtime Database.");
    const sessionsRef = dbRef(db, "interviews");
    await set(sessionsRef, null);
    console.log("clearSessions: All sessions cleared from Realtime Database.");
    toast({ title: "Sessions Cleared", description: "All cloud sessions have been removed." });

  } catch (error: any) {
    console.error("clearSessions: Error clearing sessions:", error.message, error.stack);
    localStorage.removeItem('interviewSessions');
    console.log("All local sessions cleared as fallback");
  }
};