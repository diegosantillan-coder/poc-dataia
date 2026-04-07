import { useEffect, useRef } from "react";
import { ChatInput } from "./ChatInput";
import type { Message } from "./types";
import type { VoiceStatus } from "./useVoiceChat";

function ThinkingIndicator() {
  return (
    <>
      <style>{`
        @keyframes datia-thinking-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
          30% { transform: translateY(-7px); opacity: 1; }
        }
        @keyframes datia-thinking-glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .datia-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: rgba(168, 85, 247, 0.9);
          animation: datia-thinking-bounce 1.4s ease-in-out infinite;
        }
        .datia-dot:nth-child(2) { animation-delay: 0.18s; }
        .datia-dot:nth-child(3) { animation-delay: 0.36s; }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Pulsing label */}
        <span
          style={{
            fontFamily: "var(--font-poppins), sans-serif",
            fontSize: "18px",
            fontWeight: 400,
            color: "rgba(168, 85, 247, 0.8)",
            animation: "datia-thinking-glow 1.8s ease-in-out infinite",
          }}
        >
          Pensando
        </span>
        {/* Bouncing dots */}
        <div style={{ display: "flex", alignItems: "center", gap: "5px", paddingBottom: "2px" }}>
          <div className="datia-dot" />
          <div className="datia-dot" />
          <div className="datia-dot" />
        </div>
      </div>
    </>
  );
}

interface ChatViewProps {
  messages: Message[];
  input: string;
  onInputChange: (v: string) => void;
  onSubmit: (text: string) => void;
  voiceStatus?: VoiceStatus;
  onVoiceToggle?: () => void;
  onVoiceConnect?: () => void;
  isThinking?: boolean;
}

export function ChatView({ messages, input, onInputChange, onSubmit, voiceStatus, onVoiceToggle, onVoiceConnect, isThinking }: ChatViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div
      className="flex flex-col flex-1 h-full overflow-hidden"
      style={{ paddingLeft: "127px", paddingRight: "100px", paddingTop: "44px", paddingBottom: "32px", gap: "24px" }}
    >
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-6 pr-2">
        {messages.map((msg, i) =>
          msg.role === "user" ? (
            /* User bubble — right-aligned, width:709, bg rgba(255,255,255,0.25), radius 32px */
            <div key={i} className="flex justify-end">
              <div
                className="text-white"
                style={{
                  background: "rgba(255, 255, 255, 0.25)",
                  borderRadius: "32px",
                  padding: "24px",
                  maxWidth: "709px",
                  fontFamily: "var(--font-poppins), sans-serif",
                  fontSize: "26px",
                  fontWeight: 400,
                  lineHeight: "1.2",
                }}
              >
                {msg.content}
              </div>
            </div>
          ) : (
            /* Assistant response — left-aligned, max-width:714 */
            <div
              key={i}
              className="text-white"
              style={{
                maxWidth: "714px",
                fontFamily: "var(--font-poppins), sans-serif",
                fontSize: "26px",
                fontWeight: 400,
                lineHeight: "1.2",
                whiteSpace: "pre-line",
              }}
            >
              {msg.content}
            </div>
          )
        )}
        {isThinking && <ThinkingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input bar — width:819 matching Figma layout_AWSYR7 */}
      <div style={{ width: "819px", paddingBottom: "8px" }}>
        <ChatInput
          value={input}
          onChange={onInputChange}
          onSubmit={onSubmit}
          voiceStatus={voiceStatus}
          onVoiceToggle={onVoiceToggle}
          onVoiceConnect={onVoiceConnect}
        />
      </div>
    </div>
  );
}
