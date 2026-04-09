"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Message } from "./types";

const WS_URL = "wss://d2lgnf5ksfosob.cloudfront.net/ws";

export type VoiceStatus =
  | "disconnected"
  | "connecting"
  | "idle"
  | "recording"
  | "speaking"
  | "error";

interface UseVoiceChatOptions {
  onMessage: (msg: Message) => void;
  /** Called when a subsequent user voice transcript chunk arrives — appends to the last user bubble */
  onUpdateLastUserMessage?: (chunk: string) => void;
}

// ── Audio player — pure imperative, lives entirely outside React render ──
function makeAudioPlayer(
  playbackCtx: AudioContext,
  onIdle: () => void
) {
  const queue: ArrayBuffer[] = [];
  let isPlaying = false;
  let nextPlayTime = 0;
  let muted = false;
  const activeSources: AudioBufferSourceNode[] = [];

  function playNext() {
    if (queue.length === 0) {
      isPlaying = false;
      onIdle();
      return;
    }
    isPlaying = true;
    const pcmBuffer = queue.shift()!;
    try {
      const int16 = new Int16Array(pcmBuffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
      const audioBuffer = playbackCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);
      const source = playbackCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(playbackCtx.destination);
      const startAt = Math.max(playbackCtx.currentTime, nextPlayTime);
      nextPlayTime = startAt + audioBuffer.duration;
      source.onended = () => {
        const idx = activeSources.indexOf(source);
        if (idx !== -1) activeSources.splice(idx, 1);
        playNext();
      };
      activeSources.push(source);
      source.start(startAt);
    } catch {
      playNext();
    }
  }

  return {
    enqueue(buf: ArrayBuffer) {
      if (muted) return; // user stopped — discard incoming chunks
      queue.push(buf);
      if (!isPlaying) playNext();
    },
    stop() {
      muted = true;
      queue.length = 0;
      nextPlayTime = 0;
      for (const src of activeSources) {
        try { src.onended = null; src.stop(); } catch { /* already stopped */ }
      }
      activeSources.length = 0;
      isPlaying = false;
      onIdle();
    },
    unmute() {
      muted = false;
    },
  };
}

export function useVoiceChat({ onMessage, onUpdateLastUserMessage }: UseVoiceChatOptions) {
  const [status, setStatus] = useState<VoiceStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const captureCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const audioPlayerRef = useRef<ReturnType<typeof makeAudioPlayer> | null>(null);
  const sessionReadyRef = useRef(false);
  // PTT buffer: audio is captured locally and flushed to WS only on mic release
  const pttBufferRef = useRef<ArrayBuffer[]>([]);
  // VAD silence timer — auto-stops recording after sustained silence
  const vadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vadRafRef = useRef<number | null>(null);
  // Stable ref so startRecording can call stopRecording without circular deps
  const stopRecordingRef = useRef<(() => Promise<void>) | null>(null);
  // Tracks whether we already emitted the first user bubble for the current voice turn
  const hasUserBubbleRef = useRef(false);

  // ── WebSocket connect ───────────────────────────────────────────
  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;
    setStatus("connecting");
    setError(null);

    const ws = new WebSocket(WS_URL);
    socketRef.current = ws;

    ws.onopen = () => setStatus("connecting");

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data as string);

      if (msg.type === "session_ready") {
        sessionReadyRef.current = true;
        const pbCtx = new AudioContext({ sampleRate: 24000 });
        audioPlayerRef.current = makeAudioPlayer(pbCtx, () => setStatus("idle"));
        setStatus("idle");
      } else if (msg.type === "audio_chunk") {
        audioPlayerRef.current?.enqueue(base64ToBuffer(msg.data));
        setStatus("speaking");
      } else if (msg.type === "transcript") {
        const role = msg.role as "user" | "assistant";
        if (role === "user") {
          if (!hasUserBubbleRef.current) {
            hasUserBubbleRef.current = true;
            onMessage({ role: "user", content: msg.text });
          } else {
            // Subsequent chunks: append to the existing user bubble
            onUpdateLastUserMessage?.(msg.text);
          }
        } else {
          // Assistant message — do NOT reset hasUserBubbleRef here.
          // It resets only in startRecording() so late-arriving user chunks
          // still accumulate into the same bubble and never create a new one mid-turn.
          onMessage({ role: "assistant", content: msg.text });
        }
      } else if (msg.type === "session_reconnected") {
        setStatus("idle");
      } else if (msg.type === "error") {
        setError(msg.message);
        setStatus("error");
      }
    };

    ws.onclose = () => {
      sessionReadyRef.current = false;
      audioPlayerRef.current = null;
      setStatus("disconnected");
    };

    ws.onerror = () => {
      setError("Error de conexion con el servidor de voz");
      setStatus("error");
    };
  }, [onMessage, onUpdateLastUserMessage]);

  const disconnect = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
  }, []);

  // ── Mic recording ───────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (!sessionReadyRef.current) return;
    // Switch back to voice mode — audio responses should play
    // Reset bubble tracker for this new voice turn
    hasUserBubbleRef.current = false;
    // Unmute so the next response plays
    audioPlayerRef.current?.unmute();
    // Clear any leftover PTT buffer from a previous turn
    pttBufferRef.current = [];
    try {
      const captureCtx = new AudioContext({ sampleRate: 16000 });
      captureCtxRef.current = captureCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      // PTT mode: the worklet collects ALL audio into one growing buffer.
      // Nothing is sent to the WS while recording — we burst everything on mic release.
      // This gives the server the complete utterance and eliminates ASR hallucinations
      // caused by partial/incremental audio frames.
      const processorCode = [
        "class PCMProcessor extends AudioWorkletProcessor {",
        "  constructor() {",
        "    super();",
        "    this._buf = []; this._len = 0;",
        "    this.port.onmessage = (e) => {",
        "      if (e.data === 'flush') {",
        "        if (this._len === 0) return;",
        "        const out = new Int16Array(this._len);",
        "        let off = 0;",
        "        for (const c of this._buf) { out.set(c, off); off += c.length; }",
        "        this.port.postMessage(out.buffer, [out.buffer]);",
        "        this._buf = []; this._len = 0;",
        "      }",
        "    };",
        "  }",
        "  process(inputs) {",
        "    const ch = inputs[0] && inputs[0][0];",
        "    if (ch) {",
        "      const i16 = new Int16Array(ch.length);",
        "      for (let i = 0; i < ch.length; i++)",
        "        i16[i] = Math.max(-32768, Math.min(32767, ch[i] * 32768));",
        "      this._buf.push(i16); this._len += ch.length;",
        "    }",
        "    return true;",
        "  }",
        "}",
        'registerProcessor("pcm-processor", PCMProcessor);',
      ].join("\n");

      const blob = new Blob([processorCode], { type: "application/javascript" });
      await captureCtx.audioWorklet.addModule(URL.createObjectURL(blob));

      const source = captureCtx.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(captureCtx, "pcm-processor");
      workletRef.current = worklet;

      // Each message from the worklet is a complete flushed buffer — store locally
      worklet.port.onmessage = (e) => {
        pttBufferRef.current.push(e.data as ArrayBuffer);
      };

      source.connect(worklet);
      worklet.connect(captureCtx.destination);

      // ── VAD: AnalyserNode watches RMS — if silence > 1500 ms auto-stop ──
      const VAD_SILENCE_MS = 1500;   // ms of quiet before auto-send
      const VAD_THRESHOLD = 0.01;   // RMS threshold (0–1); tune up if noisy env
      const VAD_MIN_SPEECH_MS = 300;  // ignore presses shorter than this
      const analyser = captureCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const pcmData = new Float32Array(analyser.fftSize);
      let hasSpeech = false;

      const checkVAD = () => {
        if (!captureCtxRef.current) return; // recording stopped
        analyser.getFloatTimeDomainData(pcmData);
        const rms = Math.sqrt(pcmData.reduce((s, v) => s + v * v, 0) / pcmData.length);

        if (rms > VAD_THRESHOLD) {
          hasSpeech = true;
          // Voice detected — cancel any pending silence timer
          if (vadTimerRef.current) { clearTimeout(vadTimerRef.current); vadTimerRef.current = null; }
        } else if (hasSpeech) {
          // Silence after speech — start countdown if not already running
          if (!vadTimerRef.current) {
            vadTimerRef.current = setTimeout(() => {
              vadTimerRef.current = null;
              if (vadRafRef.current) { cancelAnimationFrame(vadRafRef.current); vadRafRef.current = null; }
              stopRecordingRef.current?.();
            }, VAD_SILENCE_MS);
          }
        }
        vadRafRef.current = requestAnimationFrame(checkVAD);
      };

      // Wait for minimum speech time before activating VAD
      setTimeout(() => { vadRafRef.current = requestAnimationFrame(checkVAD); }, VAD_MIN_SPEECH_MS);

      // NOTE: we do NOT send start_audio yet — that happens in stopRecording
      setStatus("recording");
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "Error desconocido";
      setError("No se pudo acceder al microfono: " + errMsg);
      setStatus("error");
    }
  }, []);

  const stopRecording = useCallback(async () => {
    // Cancel VAD timers
    if (vadTimerRef.current) { clearTimeout(vadTimerRef.current); vadTimerRef.current = null; }
    if (vadRafRef.current) { cancelAnimationFrame(vadRafRef.current); vadRafRef.current = null; }

    // 1. Flush whatever audio the worklet still has buffered
    if (workletRef.current) {
      workletRef.current.port.postMessage("flush");
      // Give the worklet one render quantum to emit the flush
      await new Promise((r) => setTimeout(r, 50));
      workletRef.current.disconnect();
      workletRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    await captureCtxRef.current?.close();
    captureCtxRef.current = null;

    // 2. Now burst the complete utterance to the WS in one go
    const ws = socketRef.current;
    if (ws?.readyState === WebSocket.OPEN && pttBufferRef.current.length > 0) {
      ws.send(JSON.stringify({ type: "start_audio" }));
      for (const buf of pttBufferRef.current) {
        ws.send(JSON.stringify({ type: "audio_chunk", data: bufferToBase64(buf) }));
      }
      ws.send(JSON.stringify({ type: "stop_audio" }));
    }
    pttBufferRef.current = [];

    setStatus("idle");
  }, []);

  // Keep ref in sync so startRecording's VAD closure can call stopRecording.
  // useEffect ensures this runs after render, not during.
  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  const toggleMic = useCallback(async () => {
    if (status === "recording") await stopRecording();
    else await startRecording();
  }, [status, startRecording, stopRecording]);

  const endSession = useCallback(() => {
    socketRef.current?.send(JSON.stringify({ type: "end_session" }));
    if (status === "recording") stopRecording();
    disconnect();
  }, [status, stopRecording, disconnect]);

  const sendText = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !sessionReadyRef.current) return;
    // Unmute in case user had stopped audio previously
    audioPlayerRef.current?.unmute();
    onMessage({ role: "user", content: trimmed });
    socketRef.current?.send(JSON.stringify({ type: "text_message", text: trimmed }));
  }, [onMessage]);

  const stopAudio = useCallback(() => {
    audioPlayerRef.current?.stop();
  }, []);

  return { status, error, connect, disconnect, toggleMic, endSession, sendText, stopAudio, sessionReady: sessionReadyRef };
}

// ── Helpers ───────────────────────────────────────────────────────
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let b = "";
  for (let i = 0; i < bytes.byteLength; i++) b += String.fromCharCode(bytes[i]);
  return btoa(b);
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
