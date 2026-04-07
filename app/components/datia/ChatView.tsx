import { useEffect, useRef } from "react";
import { ChatInput } from "./ChatInput";
import type { Message } from "./types";

interface ChatViewProps {
  messages: Message[];
  input: string;
  onInputChange: (v: string) => void;
  onSubmit: (text: string) => void;
}

export function ChatView({ messages, input, onInputChange, onSubmit }: ChatViewProps) {
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
        <div ref={bottomRef} />
      </div>

      {/* Input bar — width:819 matching Figma layout_AWSYR7 */}
      <div style={{ width: "819px" }}>
        <ChatInput value={input} onChange={onInputChange} onSubmit={onSubmit} />
      </div>
    </div>
  );
}
