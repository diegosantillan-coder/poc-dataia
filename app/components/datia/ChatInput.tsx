"use client";

import { useRef, useEffect } from "react";
import { PlusIcon } from "./icons";
import { VoiceMicButton } from "./VoiceMicButton";
import type { VoiceStatus } from "./useVoiceChat";

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (text: string) => void;
  voiceStatus?: VoiceStatus;
  onVoiceToggle?: () => void;
  onVoiceConnect?: () => void;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  voiceStatus = "disconnected",
  onVoiceToggle,
  onVoiceConnect,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(value);
    }
  };

  return (
    <div
      className="flex flex-col w-full"
      style={{
        background: "rgba(10, 9, 12, 0.6)",
        border: "1px solid #6429CD",
        borderRadius: "25px",
        padding: "32px",
        gap: "10px",
      }}
    >
      {/* Input row */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="flex-shrink-0 flex items-center justify-center rounded-full"
          style={{
            padding: "8px",
            background: "rgba(255, 255, 255, 0.08)",
          }}
          aria-label="Adjuntar archivo"
        >
          <PlusIcon />
        </button>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Haz una petición para Datia"
          rows={1}
          className="flex-1 bg-transparent resize-none outline-none text-white overflow-hidden"
          style={{
            fontFamily: "var(--font-poppins), sans-serif",
            fontSize: "26px",
            fontWeight: 400,
            lineHeight: "1.2",
            caretColor: "white",
          }}
        />

        {/* Mic button — right side, only rendered when voice handlers provided */}
        {onVoiceToggle && onVoiceConnect && (
          <div className="flex-shrink-0 mb-1">
            <VoiceMicButton
              status={voiceStatus}
              onToggle={onVoiceToggle}
              onConnect={onVoiceConnect}
            />
          </div>
        )}
      </div>
    </div>
  );
}
