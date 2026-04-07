"use client";

import { useCallback, useRef, useState } from "react";
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
      source.onended = () => playNext();
      source.start(startAt);
    } catch {
      playNext();
    }
  }

  return {
    enqueue(buf: ArrayBuffer) {
      queue.push(buf);
      if (!isPlaying) playNext();
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
  // When true, incoming audio_chunk frames are discarded (text-input mode)
  const textModeRef = useRef(false);
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
        if (!textModeRef.current) {
          audioPlayerRef.current?.enqueue(base64ToBuffer(msg.data));
          setStatus("speaking");
        }
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
  }, [onMessage]);

  const disconnect = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
  }, []);

  // ── Mic recording ───────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (!sessionReadyRef.current) return;
    // Switch back to voice mode — audio responses should play
    textModeRef.current = false;
    // Reset bubble tracker for this new voice turn
    hasUserBubbleRef.current = false;
    try {
      const captureCtx = new AudioContext({ sampleRate: 16000 });
      captureCtxRef.current = captureCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      // Buffer ~512 ms of audio (8192 samples at 16 kHz) before sending so
      // whole spoken phrases stay in one chunk and brief pauses don't trigger
      // premature end-of-utterance detection on the server.
      // A 'flush' message drains whatever remains when the mic is stopped.
      const processorCode = [
        "class PCMProcessor extends AudioWorkletProcessor {",
        "  constructor() {",
        "    super();",
        "    this._buf = []; this._len = 0;",
        "    this.port.onmessage = (e) => {",
        "      if (e.data === 'flush' && this._len > 0) {",
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
        "      if (this._len >= 8192) {",
        "        const out = new Int16Array(this._len);",
        "        let off = 0;",
        "        for (const c of this._buf) { out.set(c, off); off += c.length; }",
        "        this.port.postMessage(out.buffer, [out.buffer]);",
        "        this._buf = []; this._len = 0;",
        "      }",
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
      setStatus("recording");
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "Error desconocido";
      setError("No se pudo acceder al microfono: " + errMsg);
      setStatus("error");
    }
  }, []);

  const stopRecording = useCallback(async () => {
    // Flush any buffered audio that hasn't reached the chunk threshold yet
    if (workletRef.current) {
      workletRef.current.port.postMessage("flush");
      // Give the worklet one render quantum (~3 ms) to emit the flush
      await new Promise((r) => setTimeout(r, 50));
      workletRef.current.disconnect();
      workletRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    await captureCtxRef.current?.close();
    captureCtxRef.current = null;
    socketRef.current?.send(JSON.stringify({ type: "stop_audio" }));
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

  const sendText = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !sessionReadyRef.current) return;
    textModeRef.current = true;
    onMessage({ role: "user", content: trimmed });
    socketRef.current?.send(JSON.stringify({ type: "text_message", text: trimmed }));
  }, [onMessage]);

  return { status, error, connect, disconnect, toggleMic, endSession, sendText, sessionReady: sessionReadyRef };
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
