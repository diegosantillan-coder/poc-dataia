"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { HomeView } from "./HomeView";
import { ChatView } from "./ChatView";
import { Sidebar } from "./Sidebar";
import { useVoiceChat } from "./useVoiceChat";
import { useSessions } from "./useSessions";
import type { Message } from "./types";

export type { Message };

export function DatiaChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Stable ID for the current conversation
  const sessionIdRef = useRef<string | null>(null);

  const { sessions, saveSession, deleteSession } = useSessions();

  const addMessage = useCallback((msg: Message) => {
    if (msg.role === "assistant") setIsThinking(false);
    setMessages((prev) => [...prev, msg]);
  }, []);

  const updateLastUserMessage = useCallback((chunk: string) => {
    setMessages((prev) => {
      const idx = [...prev].reverse().findIndex((m) => m.role === "user");
      if (idx === -1) return prev;
      const realIdx = prev.length - 1 - idx;
      const next = [...prev];
      next[realIdx] = { role: "user", content: next[realIdx].content + " " + chunk };
      return next;
    });
  }, []);

  const { status: voiceStatus, connect: voiceConnect, toggleMic: voiceToggleRaw, sendText } =
    useVoiceChat({ onMessage: addMessage, onUpdateLastUserMessage: updateLastUserMessage });

  // Connect to WS on mount
  useEffect(() => {
    voiceConnect();
  }, [voiceConnect]);

  // Auto-save to localStorage whenever messages change
  useEffect(() => {
    if (messages.length === 0) return;
    if (!sessionIdRef.current) {
      sessionIdRef.current = crypto.randomUUID();
    }
    saveSession(sessionIdRef.current, messages);
  }, [messages, saveSession]);

  // When stopping the mic (was recording → idle) show thinking indicator
  const voiceToggle = useCallback(async () => {
    if (voiceStatus === "recording") setIsThinking(true);
    await voiceToggleRaw();
  }, [voiceStatus, voiceToggleRaw]);

  const handleSubmit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setIsThinking(true);
    sendText(trimmed);
    setInput("");
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    setIsThinking(false);
    setSidebarOpen(false);
    sessionIdRef.current = null;
  };

  const handleLoadSession = useCallback((id: string) => {
    const session = sessions.find((s) => s.id === id);
    if (!session) return;
    sessionIdRef.current = session.id;
    setMessages(session.messages);
    setIsThinking(false);
    setSidebarOpen(false);
  }, [sessions]);

  if (messages.length === 0) {
    return (
      <HomeView
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        sessions={sessions}
        onLoadSession={handleLoadSession}
        onDeleteSession={deleteSession}
      />
    );
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
      <Sidebar
        onNewChat={handleNewChat}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sessions={sessions}
        onLoadSession={handleLoadSession}
        onDeleteSession={deleteSession}
      />
      <ChatView
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        voiceStatus={voiceStatus}
        onVoiceToggle={voiceToggle}
        onVoiceConnect={voiceConnect}
        isThinking={isThinking}
        onMenuOpen={() => setSidebarOpen(true)}
      />
    </div>
  );
}
