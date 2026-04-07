import { useEffect, useRef } from "react";
import { ChatInput } from "./ChatInput";
import { UserBubble } from "./UserBubble";
import { AssistantMessage } from "./AssistantMessage";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { MobileHeader } from "./MobileHeader";
import type { Message } from "./types";
import type { VoiceStatus } from "./useVoiceChat";

interface ChatViewProps {
  messages: Message[];
  input: string;
  onInputChange: (v: string) => void;
  onSubmit: (text: string) => void;
  voiceStatus?: VoiceStatus;
  onVoiceToggle?: () => void;
  onVoiceConnect?: () => void;
  onStopAudio?: () => void;
  isThinking?: boolean;
  onMenuOpen?: () => void;
}

export function ChatView({ messages, input, onInputChange, onSubmit, voiceStatus, onVoiceToggle, onVoiceConnect, onStopAudio, isThinking, onMenuOpen }: ChatViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      {/* Mobile-only top bar */}
      {onMenuOpen && <MobileHeader onMenuOpen={onMenuOpen} />}

      {/* Messages + input */}
      <div
        className="flex flex-col flex-1 overflow-hidden px-4 pt-4 pb-4 sm:px-8 sm:pt-6 lg:px-[127px] lg:pt-11 lg:pb-8"
        style={{ gap: "24px" }}
      >
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 sm:gap-6 pr-1">
          {messages.map((msg, i) =>
            msg.role === "user"
              ? <UserBubble key={i} content={msg.content} />
              : <AssistantMessage key={i} content={msg.content} />
          )}
          {isThinking && <ThinkingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="w-full lg:max-w-[819px] pb-2">
          <ChatInput
            value={input}
            onChange={onInputChange}
            onSubmit={onSubmit}
            voiceStatus={voiceStatus}
            onVoiceToggle={onVoiceToggle}
            onVoiceConnect={onVoiceConnect}
            onStopAudio={onStopAudio}
          />
        </div>
      </div>
    </div>
  );
}
