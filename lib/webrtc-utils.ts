/* ---------------------------------------------------------------------------
   webrtc-utils.ts
   Purpose: A small, predictable layer over Web APIs (MediaDevices,
            MediaRecorder, Web Speech) that’s easy to read, test, and debug.

   What it does:
   - requestUserMedia(): asks for mic+camera with sensible fallbacks
   - VideoRecorder: robust wrapper around MediaRecorder (webm) with chunking
   - SpeechRecognitionUtil: continuous speech capture with interim + final text,
     silence detection, auto-restart, and event callbacks (no UI assumptions)

   Design goals:
   - No surprises: never throw cryptic errors, always log context
   - Safe defaults: codecs, constraints, and timeouts work on most browsers
   - Controllable: the parent can enable/disable features at runtime
---------------------------------------------------------------------------- */

type Nullable<T> = T | null;

/* ----------------------------- Media (Camera/Mic) ------------------------- */

/**
 * Request a user MediaStream with mic + camera.
 * If full A/V fails, we try video-only, then audio-only, and finally throw.
 * This way the session stays usable even when only one device is available.
 */
export const requestUserMedia = async (): Promise<MediaStream> => {
  // Start with a simple, widely-supported constraint set
  const constraints: MediaStreamConstraints = {
    audio: true,
    video: true,
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    logStream("MediaStream acquired (A/V)", stream);
    return stream;
  } catch (err) {
    console.warn("[requestUserMedia] A/V failed, trying fallbacks…", err);

    // Try video-only
    try {
      const videoOnly = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      logStream("MediaStream acquired (Video-only)", videoOnly);
      return videoOnly;
    } catch (e1) {
      console.warn("[requestUserMedia] Video-only failed, trying audio-only…", e1);
    }

    // Try audio-only
    try {
      const audioOnly = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      });
      logStream("MediaStream acquired (Audio-only)", audioOnly);
      return audioOnly;
    } catch (e2) {
      console.error("[requestUserMedia] Audio-only failed. No media available.", e2);
      throw new Error(
        "Could not access camera or microphone. Please check site permissions and device connectivity."
      );
    }
  }
};

const logStream = (label: string, stream: MediaStream) => {
  console.log(`[webrtc] ${label}:`, stream, stream.getTracks());
  stream.getTracks().forEach((t) =>
    console.log(
      `   • ${t.kind} | enabled=${t.enabled} readyState=${t.readyState} id=${t.id}`
    )
  );
};

/* ------------------------------- VideoRecorder ---------------------------- */

/**
 * A resilient MediaRecorder wrapper that:
 * - picks a supported MIME type (prefers vp8/opus webm)
 * - records in chunks (1s) to avoid memory spikes
 * - tolerates stream switches (updateStream)
 * - returns a single Blob on stop()
 */
export class VideoRecorder {
  private mediaRecorder: Nullable<MediaRecorder> = null;
  private recordedChunks: Blob[] = [];
  private stream: Nullable<MediaStream> = null;
  private mimeType: string = "video/webm;codecs=vp8,opus";

  initialize(stream: MediaStream, options?: { mimeType?: string }) {
    this.stream = stream;
    this.recordedChunks = [];

    // Choose a safe MIME
    const candidates = [
      options?.mimeType || "video/webm;codecs=vp8,opus",
      "video/webm;codecs=vp9,opus",
      "video/webm",
    ];
    const supported =
      candidates.find((c) => MediaRecorder.isTypeSupported(c)) || "video/webm";
    this.mimeType = supported;

    // Sanity: must have at least one live track
    if (!hasLiveTrack(stream)) {
      throw new Error("No active tracks detected in provided stream.");
    }

    try {
      this.mediaRecorder = new MediaRecorder(stream, { mimeType: this.mimeType });
    } catch (err: any) {
      console.error("[VideoRecorder] Failed to create MediaRecorder:", err?.message);
      throw err;
    }

    this.mediaRecorder.ondataavailable = (evt) => {
      if (evt.data && evt.data.size > 0) {
        this.recordedChunks.push(evt.data);
      }
    };

    this.mediaRecorder.onerror = (evt) => {
      console.error("[VideoRecorder] MediaRecorder error:", evt);
    };
  }

  start() {
    if (!this.mediaRecorder) throw new Error("MediaRecorder not initialized.");
    if (!this.stream || !hasLiveTrack(this.stream)) {
      throw new Error("No active tracks in stream. Cannot start recording.");
    }
    if (this.mediaRecorder.state === "recording") {
      console.warn("[VideoRecorder] Already recording.");
      return;
    }
    // 1000ms timeslice → emits chunks periodically
    this.mediaRecorder.start(1000);
  }

  /**
   * Gracefully stop and return a single webm Blob.
   */
  stop(): Promise<Nullable<Blob>> {
    if (!this.mediaRecorder || this.mediaRecorder.state !== "recording") {
      console.warn("[VideoRecorder] stop() called while not recording.");
      return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => {
      try {
        this.mediaRecorder!.onstop = () => {
          // Slight delay to ensure last chunk is flushed
          setTimeout(() => {
            if (this.recordedChunks.length === 0) {
              resolve(null);
              return;
            }
            try {
              const blob = new Blob(this.recordedChunks, { type: this.mimeType });
              // Reset internal buffer for next recording
              this.recordedChunks = [];
              resolve(blob);
            } catch (err) {
              console.error("[VideoRecorder] Failed to assemble Blob:", err);
              reject(err);
            }
          }, 400);
        };
        this.mediaRecorder!.stop();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Swap to a new MediaStream mid-session (e.g., when you rebuild audio graph).
   * If we were recording, we stop → recreate → resume automatically.
   */
  async updateStream(newStream: MediaStream) {
    if (!this.mediaRecorder) throw new Error("MediaRecorder not initialized.");
    if (!hasLiveTrack(newStream)) throw new Error("New stream has no live tracks.");

    const wasRecording = this.mediaRecorder.state === "recording";
    const prevMime = this.mimeType;

    if (wasRecording) {
      await this.stop();
    }

    this.initialize(newStream, { mimeType: prevMime });

    if (wasRecording) {
      this.start();
    }
  }

  getStream(): Nullable<MediaStream> {
    return this.stream;
  }

  cleanup() {
    try {
      if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
        this.mediaRecorder.stop();
      }
    } catch {}
    this.mediaRecorder = null;

    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.recordedChunks = [];
  }
}

const hasLiveTrack = (stream: MediaStream) =>
  stream.getTracks().some((t) => t.readyState === "live" && t.enabled);

/* --------------------------- SpeechRecognition ---------------------------- */
/**
 * Cross-browser speech recognition wrapper (Web Speech API).
 * Features:
 * - Continuous mode with interim + final results
 * - Silence detection (finalize after N ms without speech)
 * - Auto-restart (to simulate streaming recognition)
 * - Event callbacks: onInterim, onFinal, onStart, onEnd, onError
 *
 * Notes:
 * - This relies on browser speech recognition (Chrome supports; Safari partial).
 * - For server-grade accuracy/latency, later swap to cloud STT (same callbacks).
 */

type SpeechCallbacks = {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: string) => void;
};

export class SpeechRecognitionUtil {
  private recognition: any = null;
  private active = false;
  private interimBuffer = "";
  private silenceTimer: Nullable<number> = null;
  private silenceMs = 4000; // default silence window
  private autoRestart = true;
  private cbs: SpeechCallbacks = {};

  constructor(lang = "en-US") {
    const SR: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      console.warn("[SpeechRecognition] Not supported in this browser.");
      return;
    }

    this.recognition = new SR();
    this.recognition.lang = lang;
    this.recognition.continuous = true;     // keep listening
    this.recognition.interimResults = true; // send partial text while speaking
    this.wireEvents();
  }

  private wireEvents() {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.active = true;
      this.cbs.onStart?.();
    };

    this.recognition.onresult = (evt: any) => {
      let interim = "";
      let finalParts: string[] = [];

      for (let i = evt.resultIndex; i < evt.results.length; i++) {
        const res = evt.results[i];
        const text = res[0]?.transcript || "";
        if (res.isFinal) finalParts.push(text);
        else interim += text;
      }

      // Notify interim (live subtitles)
      if (interim) {
        this.interimBuffer = interim;
        this.cbs.onInterim?.(interim);
        this.bumpSilenceTimer(); // still speaking → extend timer
      }

      // Notify final (user stopped speaking a sentence)
      if (finalParts.length > 0) {
        const finalText = finalParts.join(" ").trim();
        if (finalText) {
          this.interimBuffer = "";
          this.cbs.onFinal?.(finalText);
          this.bumpSilenceTimer(); // keep window open; user may continue
        }
      }
    };

    this.recognition.onerror = (evt: any) => {
      const msg = evt?.error || "unknown_error";
      this.active = false;
      this.cbs.onError?.(msg);

      // Some errors are recoverable; try to restart if requested
      if (this.autoRestart && msg !== "not-allowed" && msg !== "service-not-allowed") {
        try {
          this.recognition.stop();
          // brief cooldown
          setTimeout(() => this.safeStart(), 300);
        } catch {}
      }
    };

    this.recognition.onend = () => {
      this.active = false;
      this.cbs.onEnd?.();

      // If we didn’t explicitly stop and autoRestart is on, resume
      if (this.autoRestart) {
        setTimeout(() => this.safeStart(), 200);
      }
    };
  }

  private bumpSilenceTimer() {
    // When we see speech (interim/final), reset the silence window.
    if (this.silenceTimer) window.clearTimeout(this.silenceTimer);
    this.silenceTimer = window.setTimeout(() => {
      // Silence reached → emit final from interim buffer if any
      const trimmed = this.interimBuffer.trim();
      if (trimmed) {
        this.interimBuffer = "";
        this.cbs.onFinal?.(trimmed);
      }
    }, this.silenceMs);
  }

  private safeStart() {
    try {
      if (!this.recognition || this.active) return;
      this.recognition.start();
    } catch (e) {
      // Chrome sometimes throws if start() is spammed — ignore & retry later
      setTimeout(() => this.safeStart(), 200);
    }
  }

  /** Public API */

  on(callbacks: SpeechCallbacks) {
    this.cbs = callbacks;
  }

  setSilenceTimeout(ms: number) {
    this.silenceMs = Math.max(800, ms); // don't allow absurdly small timeouts
  }

  setAutoRestart(enabled: boolean) {
    this.autoRestart = enabled;
  }

  isSupported() {
    return !!this.recognition;
  }

  isActive() {
    return this.active;
  }

  start() {
    if (!this.recognition) return;
    this.autoRestart = true;
    this.safeStart();
  }

  stop() {
    if (!this.recognition) return;
    this.autoRestart = false;
    if (this.silenceTimer) {
      window.clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    try {
      this.recognition.stop();
    } catch {}
    this.active = false;
  }
}
