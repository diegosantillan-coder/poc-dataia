import { DatiaLogo } from "./icons";
import { ChatInput } from "./ChatInput";
import type { Session } from "./types";

const QUICK_ACTIONS = ["Aprender algo nuevo", "Realizar un assessment", "Crear una estrategia"];

interface HomeViewProps {
  input: string;
  onInputChange: (v: string) => void;
  onSubmit: (text: string) => void;
  sessions?: Session[];
  onLoadSession?: (id: string) => void;
  onDeleteSession?: (id: string) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

export function HomeView({ input, onInputChange, onSubmit, sessions = [], onLoadSession, onDeleteSession }: HomeViewProps) {
  return (
    <div
      className="relative flex flex-col h-screen w-screen overflow-hidden"
      style={{
        backgroundImage: "url('/background-nova.svg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Logo — responsive position */}
      <div className="absolute" style={{ left: "clamp(20px, 8vw, 100px)", top: "clamp(20px, 4vh, 38px)" }}>
        <DatiaLogo />
      </div>

      {/* Vertically + horizontally centered content */}
      <div className="flex flex-1 items-center justify-center px-4 sm:px-8">
        <div className="flex flex-col items-center w-full max-w-[807px]" style={{ gap: "clamp(16px, 3vh, 32px)" }}>
          <h1
            className="w-full text-white text-center font-normal leading-snug text-[28px] sm:text-[36px] lg:text-[46px]"
          >
            Hola, ¿cómo puedo ayudarte hoy?
          </h1>

          {/* Input box */}
          <div className="w-full">
            <ChatInput value={input} onChange={onInputChange} onSubmit={onSubmit} />
          </div>

          {/* Quick action pills */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => onSubmit(action)}
                className="cursor-pointer transition-opacity hover:opacity-80 text-sm sm:text-base"
                style={{
                  background: "#F6F7FC",
                  color: "#330072",
                  fontWeight: 600,
                  lineHeight: "1",
                  borderRadius: "50px",
                  padding: "10px 18px",
                  border: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {action}
              </button>
            ))}
          </div>

          {/* Recent sessions — only shown when there are saved chats */}
          {sessions.length > 0 && (
            <div className="w-full flex flex-col gap-2">
              <p
                className="text-sm sm:text-base font-normal"
                style={{ color: "rgba(180, 150, 255, 0.85)" }}
              >
                Conversaciones recientes
              </p>
              <div className="flex flex-col gap-1">
                {sessions.slice(0, 5).map((session) => (
                  <div key={session.id} className="group flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onLoadSession?.(session.id)}
                      className="flex-1 flex items-center justify-between text-left transition-opacity hover:opacity-80 min-w-0 py-2 px-3 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      <span className="truncate text-white text-sm sm:text-base font-normal">
                        {session.title}
                      </span>
                      <span
                        className="flex-shrink-0 ml-3 text-xs font-normal"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        {formatDate(session.date)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSession?.(session.id)}
                      aria-label="Eliminar conversación"
                      className="flex-shrink-0 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity text-white text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
