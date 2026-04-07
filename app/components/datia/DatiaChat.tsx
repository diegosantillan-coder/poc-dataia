"use client";

import { useState, useCallback, useEffect } from "react";
import { HomeView } from "./HomeView";
import { ChatView } from "./ChatView";
import { Sidebar } from "./Sidebar";
import { useVoiceChat } from "./useVoiceChat";
import type { Message } from "./types";

export type { Message };

export function DatiaChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const { status: voiceStatus, connect: voiceConnect, toggleMic: voiceToggle, sendText } =
    useVoiceChat({ onMessage: addMessage });

  // Connect to WS on mount
  useEffect(() => {
    voiceConnect();
  }, [voiceConnect]);

  const handleSubmit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendText(trimmed);
    setInput("");
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
  };

  if (messages.length === 0) {
    return <HomeView input={input} onInputChange={setInput} onSubmit={handleSubmit} />;
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at 50% 50%, rgba(69, 24, 149, 1) 0%, rgba(37, 0, 82, 1) 76%)",
        boxShadow: "inset 0px 0px 60px 0px rgba(100, 41, 205, 0.6)",
      }}
    >
      <Sidebar onNewChat={handleNewChat} />
      <ChatView
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        voiceStatus={voiceStatus}
        onVoiceToggle={voiceToggle}
        onVoiceConnect={voiceConnect}
      />
    </div>
  );
}
