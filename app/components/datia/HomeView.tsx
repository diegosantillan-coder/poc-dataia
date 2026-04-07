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
      {/* Logo — top-left */}
      <div className="absolute" style={{ left: "100px", top: "38px" }}>
        <DatiaLogo />
      </div>

      {/* Vertically + horizontally centered content */}
      <div className="flex flex-1 items-center justify-center">
        <div
          className="flex flex-col items-center"
          style={{ width: "807px", gap: "32px" }}
        >
          <h1
            className="w-full text-white text-center"
            style={{
              fontFamily: "var(--font-poppins), sans-serif",
              fontSize: "46px",
              fontWeight: 400,
              lineHeight: "1.2",
            }}
          >
            Hola, ¿cómo puedo ayudarte hoy?
          </h1>

          {/* Input box — solo el campo, sin pills adentro */}
          <ChatInput value={input} onChange={onInputChange} onSubmit={onSubmit} />

          {/* Quick action pills — fuera del input, debajo */}
          <div className="flex flex-wrap justify-center gap-3">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => onSubmit(action)}
                className="cursor-pointer transition-opacity hover:opacity-80"
                style={{
                  background: "#F6F7FC",
                  color: "#330072",
                  fontFamily: "var(--font-poppins), sans-serif",
                  fontSize: "16px",
                  fontWeight: 600,
                  lineHeight: "1",
                  borderRadius: "50px",
                  padding: "12px 24px",
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
