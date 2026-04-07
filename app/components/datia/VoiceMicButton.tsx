"use client";

import type { VoiceStatus } from "./useVoiceChat";

interface VoiceMicButtonProps {
  status: VoiceStatus;
  onToggle: () => void;
  onConnect: () => void;
  onStopAudio?: () => void;
}

export function VoiceMicButton({ status, onToggle, onConnect, onStopAudio }: VoiceMicButtonProps) {
  const isDisconnected = status === "disconnected" || status === "error";
  const isRecording = status === "recording";
  const isSpeaking = status === "speaking";
  const isConnecting = status === "connecting";

  const handleClick = () => {
    if (isDisconnected) onConnect();
    else onToggle();
  };

  // While speaking, show a dedicated stop-audio button instead of the mic
  if (isSpeaking) {
    return (
      <div className="relative flex flex-col items-center">
        <button
          type="button"
          onClick={onStopAudio}
          aria-label="Detener respuesta"
          className="flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-200"
          style={{
            width: "40px",
            height: "40px",
            background: "rgba(168, 85, 247, 0.2)",
            border: "1px solid rgba(168, 85, 247, 0.7)",
            animation: "speakingPulse 1.4s ease-in-out infinite",
            cursor: "pointer",
          }}
        >
          <StopIcon />
        </button>
        <span
          className="absolute -bottom-6 whitespace-nowrap text-center pointer-events-none"
          style={{ fontSize: "10px", color: "rgba(192, 132, 252, 0.9)" }}
        >
          Detener
        </span>
        <style>{`
          @keyframes speakingPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.4); }
            50%       { box-shadow: 0 0 0 8px rgba(168, 85, 247, 0); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center">
      <button
        type="button"
        onClick={handleClick}
        disabled={isConnecting}
        aria-label={
          isDisconnected ? "Activar voz" :
            isRecording ? "Detener grabación" :
              isSpeaking ? "Datia respondiendo..." :
                "Activar micrófono"
        }
        className="relative flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-200"
        style={{
          width: "40px",
          height: "40px",
          background: isRecording
            ? "rgba(220, 38, 38, 0.25)"
            : isSpeaking
              ? "rgba(168, 85, 247, 0.25)"
              : isDisconnected
                ? "rgba(255, 255, 255, 0.06)"
                : "rgba(255, 255, 255, 0.08)",
          border: isRecording
            ? "1px solid rgba(239, 68, 68, 0.6)"
            : isSpeaking
              ? "1px solid rgba(168, 85, 247, 0.6)"
              : "1px solid rgba(255, 255, 255, 0.2)",
          opacity: isConnecting ? 0.5 : 1,
          cursor: isConnecting ? "not-allowed" : "pointer",
          animation: isRecording ? "micPulse 1.2s ease-in-out infinite" : undefined,
        }}
      >
        {isRecording ? <MicOnIcon /> : isSpeaking ? <SpeakingBarsIcon /> : <MicOffIcon dimmed={isDisconnected} />}
      </button>

      {/* Tooltip label */}
      <span
        className="absolute -bottom-6 whitespace-nowrap text-center pointer-events-none"
        style={{
          fontSize: "10px",
          color: isRecording
            ? "rgba(252, 165, 165, 0.9)"
            : "rgba(255, 255, 255, 0.35)",
          fontFamily: "var(--font-poppins), sans-serif",
        }}
      >
        {isConnecting ? "Conectando..." :
          isDisconnected ? "Activar voz" :
            isRecording ? "Grabando..." :
              "Micrófono"}
      </span>

      <style>{`
        @keyframes micPulse {
          0%   { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.5); }
          70%  { box-shadow: 0 0 0 12px rgba(220, 38, 38, 0); }
          100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
        }
      `}</style>
    </div>
  );
}

function MicOffIcon({ dimmed }: { dimmed?: boolean }) {
  const stroke = dimmed ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.7)";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
      <line x1="2" y1="2" x2="22" y2="22" stroke="rgba(255,255,255,0.5)" />
    </svg>
  );
}

function MicOnIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function SpeakingBarsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <rect x="1" y="7" width="3" height="4" rx="1.5" fill="#c084fc">
        <animate attributeName="height" values="4;10;4" dur="0.8s" repeatCount="indefinite" />
        <animate attributeName="y" values="7;4;7" dur="0.8s" repeatCount="indefinite" />
      </rect>
      <rect x="6" y="5" width="3" height="8" rx="1.5" fill="#c084fc">
        <animate attributeName="height" values="8;14;8" dur="0.8s" begin="0.15s" repeatCount="indefinite" />
        <animate attributeName="y" values="5;2;5" dur="0.8s" begin="0.15s" repeatCount="indefinite" />
      </rect>
      <rect x="11" y="7" width="3" height="4" rx="1.5" fill="#c084fc">
        <animate attributeName="height" values="4;10;4" dur="0.8s" begin="0.3s" repeatCount="indefinite" />
        <animate attributeName="y" values="7;4;7" dur="0.8s" begin="0.3s" repeatCount="indefinite" />
      </rect>
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="1" y="1" width="12" height="12" rx="2" fill="#c084fc" />
    </svg>
  );
}
