import { DatiaLogo, DrawIcon, SearchIcon, MoreVertIcon, LogoutIcon } from "./icons";

const RECENT_CHATS = [
  "Assessment gobier...",
  "Caso de estudio go...",
  "IA en frameworks d...",
];

interface SidebarProps {
  onNewChat: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ onNewChat, isOpen = false, onClose }: SidebarProps) {
  const sidebarContent = (
    <aside
      className="relative flex-shrink-0 flex flex-col h-full"
      style={{
        width: "clamp(280px, 85vw, 394px)",
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
          onClick={() => { onNewChat(); onClose?.(); }}
          className="flex items-center gap-3 text-white w-full text-left transition-opacity hover:opacity-70 cursor-pointer text-base sm:text-lg lg:text-[20px] font-normal"
        >
          <DrawIcon />
          Nuevo chat
        </button>

        <button
          type="button"
          className="flex items-center gap-3 text-white w-full text-left transition-opacity hover:opacity-70 cursor-pointer text-base sm:text-lg lg:text-[20px] font-normal"
        >
          <SearchIcon />
          Buscar chat
        </button>

        {/* Recientes label */}
        <div
          className="mt-2 text-base sm:text-lg lg:text-[20px] font-normal"
          style={{ color: "rgba(180, 150, 255, 0.85)" }}
        >
          Recientes
        </div>

        {/* Chat history */}
        {RECENT_CHATS.map((chat) => (
          <button
            key={chat}
            type="button"
            className="flex items-center gap-3 text-white w-full text-left transition-opacity hover:opacity-70 text-base sm:text-lg lg:text-[20px] font-normal"
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
        className="flex items-center gap-3 text-white transition-opacity hover:opacity-70 cursor-pointer text-sm sm:text-base font-normal"
      >
        <LogoutIcon />
        Cerrar sesión
      </button>
    </aside>
  );

  return (
    <>
      {/* Desktop: always visible */}
      <div className="hidden lg:flex h-full">
        {sidebarContent}
      </div>

      {/* Mobile: slide-in drawer overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={onClose}
            aria-hidden
          />
          {/* Drawer */}
          <div className="relative z-10 h-full" style={{ animation: "slideInLeft 0.25s ease" }}>
            {sidebarContent}
          </div>
          <style>{`
            @keyframes slideInLeft {
              from { transform: translateX(-100%); }
              to   { transform: translateX(0); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
