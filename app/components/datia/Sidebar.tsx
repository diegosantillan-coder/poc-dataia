import { DatiaLogo, DrawIcon, SearchIcon, MoreVertIcon, LogoutIcon } from "./icons";

const RECENT_CHATS = [
  "Assessment gobier...",
  "Caso de estudio go...",
  "IA en frameworks d...",
];

interface SidebarProps {
  onNewChat: () => void;
}

export function Sidebar({ onNewChat }: SidebarProps) {
  return (
    <aside
      className="relative flex-shrink-0 flex flex-col h-full"
      style={{
        width: "394px",
        background: "rgba(100, 41, 205, 0.05)",
        borderRight: "1px solid #6429CD",
        boxShadow: "inset 0px 4px 80px 0px rgba(100, 41, 205, 0.25)",
        borderRadius: "0 25px 25px 0",
        padding: "38px 32px 32px",
      }}
    >
      {/* Logo */}
      <div className="mb-8">
        <DatiaLogo />
      </div>

      {/* Nav actions */}
      <div className="flex flex-col gap-4 flex-1">
        <button
          type="button"
          onClick={onNewChat}
          className="flex items-center gap-3 text-white w-full text-left transition-opacity hover:opacity-70 cursor-pointer"
          style={{
            fontFamily: "var(--font-poppins), sans-serif",
            fontSize: "20px",
            fontWeight: 400,
          }}
        >
          <DrawIcon />
          Nuevo chat
        </button>

        <button
          type="button"
          className="flex items-center gap-3 text-white w-full text-left transition-opacity hover:opacity-70 cursor-pointer"
          style={{
            fontFamily: "var(--font-poppins), sans-serif",
            fontSize: "20px",
            fontWeight: 400,
          }}
        >
          <SearchIcon />
          Buscar chat
        </button>

        {/* Recientes label */}
        <div
          className="mt-2"
          style={{
            fontFamily: "var(--font-poppins), sans-serif",
            fontSize: "20px",
            fontWeight: 400,
            color: "rgba(180, 150, 255, 0.85)",
          }}
        >
          Recientes
        </div>

        {/* Chat history */}
        {RECENT_CHATS.map((chat) => (
          <button
            key={chat}
            type="button"
            className="flex items-center gap-3 text-white w-full text-left transition-opacity hover:opacity-70"
            style={{
              fontFamily: "var(--font-poppins), sans-serif",
              fontSize: "20px",
              fontWeight: 400,
            }}
          >
            <MoreVertIcon />
            {chat}
          </button>
        ))}
      </div>

      {/* Logout */}
      <button
        type="button"
        onClick={onNewChat}
        className="flex items-center gap-3 text-white transition-opacity hover:opacity-70 cursor-pointer"
        style={{
          fontFamily: "var(--font-poppins), sans-serif",
          fontSize: "16px",
          fontWeight: 400,
        }}
      >
        <LogoutIcon />
        Cerrar sesión
      </button>
    </aside>
  );
}
