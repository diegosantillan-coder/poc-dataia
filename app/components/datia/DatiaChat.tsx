"use client";

import { useState, useCallback } from "react";
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

  const { status: voiceStatus, connect: voiceConnect, toggleMic: voiceToggle } =
    useVoiceChat({ onMessage: addMessage });

  const handleSubmit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed },
      {
        role: "assistant",
        content:
          "Claro — te ayudo a estructurar un assessment de gobierno de datos sólido, accionable y adaptado a una organización como Pragma (consultoría/tecnología).\n\nLa idea es que puedas usarlo tanto para diagnóstico interno como para clientes.\nVoy a darte un framework completo: dimensiones, preguntas, niveles de madurez y entregables.",
      },
    ]);
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
