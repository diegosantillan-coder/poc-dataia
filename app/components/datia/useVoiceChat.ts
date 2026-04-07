"use client";

import { useRef, useCallback, useState } from "react";
import type { Message } from "./types";

const WS_URL = "ws://localhost:8080/ws";

export type VoiceStatus =
  | "disconnected"
  | "connecting"
  | "idle"
  | "recording"
  | "speaking"
  | "error";

interface UseVoiceChatOptions {
  onMessage: (msg: Message) => void;
}

// ── Audio player — imperative, outside React render ───────────────
function makeAudioPlayer(playbackCtx: AudioContext, onIdle: () => void) {
  const queue: ArrayBuffer[] = [];
  let isPlaying = false;
  let nextPlayTime = 0;

  function playNext() {
    if (queue.length === 0) { isPlaying = false; onIdle(); return; }
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
      source.onended = () => playNext();
      source.start(startAt);
    } catch { playNext(); }
  }

  return {
    enqueue(buf: ArrayBuffer) {
      queue.push(buf);
      if (!isPlaying) playNext();
    },
  };
}

// ── SpeechRecognition type shim (not in TS lib by default) ────────
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionCtor = new () => ISpeechRecognition;
function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w["SpeechRecognition"] as SpeechRecognitionCtor) ??
    (w["webkitSpeechRecognition"] as SpeechRecognitionCtor) ??
    null;
}

export function useVoiceChat({ onMessage }: UseVoiceChatOptions) {
  const [status, setStatus] = useState<VoiceStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);
  // Live "ghost" transcript of what the user is currently saying
  const [interimTranscript, setInterimTranscript] = useState("");

  const socketRef = useRef<WebSocket | null>(null);
  const captureCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const audioPlayerRef = useRef<ReturnType<typeof makeAudioPlayer> | null>(null);
  const sessionReadyRef = useRef(false);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  // Accumulates final (confirmed) segments from SpeechRecognition
  const finalTextRef = useRef("");

  // ── WebSocket connect ─────────────────────────────────────────────
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
        onMessage({ role: msg.role as "user" | "assistant", content: msg.text });
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
  }, [onMessage]);

  const disconnect = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
  }, []);

  // ── Mic recording ─────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (!sessionReadyRef.current) return;
    finalTextRef.current = "";
    setInterimTranscript("");

    try {
      // ── 1. AudioWorklet (raw PCM for real backend) ──────────────
      const captureCtx = new AudioContext({ sampleRate: 16000 });
      captureCtxRef.current = captureCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const processorCode = [
        "class PCMProcessor extends AudioWorkletProcessor {",
        "  process(inputs) {",
        "    const ch = inputs[0] && inputs[0][0];",
        "    if (ch) {",
        "      const i16 = new Int16Array(ch.length);",
        "      for (let i = 0; i < ch.length; i++)",
        "        i16[i] = Math.max(-32768, Math.min(32767, ch[i] * 32768));",
        "      this.port.postMessage(i16.buffer, [i16.buffer]);",
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

      worklet.port.onmessage = (e) => {
        const ws = socketRef.current;
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "audio_chunk", data: bufferToBase64(e.data) }));
        }
      };

      source.connect(worklet);
      worklet.connect(captureCtx.destination);
      socketRef.current?.send(JSON.stringify({ type: "start_audio" }));

      // ── 2. SpeechRecognition (browser STT, shows real words) ────
      const SpeechRecognitionAPI = getSpeechRecognition();
      if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI();
        recognition.lang = "es-ES";
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const t = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTextRef.current += t + " ";
            } else {
              interim += t;
            }
          }
          // Show live: confirmed text + current interim
          setInterimTranscript((finalTextRef.current + interim).trim());
        };

        recognition.onerror = () => { /* ignore, AudioWorklet still running */ };
        recognition.onend = () => {
          // Auto-restart while we are still recording (recognition stops on silence)
          if (streamRef.current) {
            try { recognition.start(); } catch { /* already stopped */ }
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

      setStatus("recording");
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "Error desconocido";
      setError("No se pudo acceder al microfono: " + errMsg);
      setStatus("error");
    }
  }, []);

  const stopRecording = useCallback(async () => {
    // Stop SpeechRecognition
    recognitionRef.current?.stop();
    recognitionRef.current = null;

    // Send what the user actually said to the server
    const spokenText = finalTextRef.current.trim();
    finalTextRef.current = "";
    setInterimTranscript("");

    if (spokenText) {
      // Use text_message so mock server echoes real transcript + generates response
      socketRef.current?.send(JSON.stringify({ type: "text_message", text: spokenText }));
    } else {
      // Fallback: tell server audio ended so it can still respond
      socketRef.current?.send(JSON.stringify({ type: "stop_audio" }));
    }

    // Cleanup AudioWorklet
    workletRef.current?.disconnect();
    workletRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    await captureCtxRef.current?.close();
    captureCtxRef.current = null;

    setStatus("idle");
  }, []);

  const toggleMic = useCallback(async () => {
    if (status === "recording") await stopRecording();
    else await startRecording();
  }, [status, startRecording, stopRecording]);

  const endSession = useCallback(() => {
    socketRef.current?.send(JSON.stringify({ type: "end_session" }));
    if (status === "recording") stopRecording();
    disconnect();
  }, [status, stopRecording, disconnect]);

  return {
    status,
    error,
    interimTranscript,
    connect,
    disconnect,
    toggleMic,
    endSession,
    sessionReady: sessionReadyRef,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────
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
