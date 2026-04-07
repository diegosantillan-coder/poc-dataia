import { DatiaLogo } from "./icons";
import { ChatInput } from "./ChatInput";

const QUICK_ACTIONS = ["Aprender algo nuevo", "Realizar un assessment", "Crear una estrategia"];

interface HomeViewProps {
  input: string;
  onInputChange: (v: string) => void;
  onSubmit: (text: string) => void;
}

export function HomeView({ input, onInputChange, onSubmit }: HomeViewProps) {
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
        </div>
      </div>
    </div>
  );
}
