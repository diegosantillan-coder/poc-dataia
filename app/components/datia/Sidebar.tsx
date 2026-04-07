import { DatiaLogo, DrawIcon, SearchIcon, MoreVertIcon, LogoutIcon } from "./icons";
import type { Session } from "./types";

interface SidebarProps {
  onNewChat: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  sessions?: Session[];
  onLoadSession?: (id: string) => void;
  onDeleteSession?: (id: string) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

export function Sidebar({ onNewChat, isOpen = false, onClose, sessions = [], onLoadSession, onDeleteSession }: SidebarProps) {
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
      <div className="flex flex-col gap-4 flex-1 overflow-hidden">
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
          className="mt-2 text-base sm:text-lg lg:text-[20px] font-normal flex-shrink-0"
          style={{ color: "rgba(180, 150, 255, 0.85)" }}
        >
          Recientes
        </div>

        {/* Scrollable session list */}
        <div className="flex flex-col gap-1 overflow-y-auto flex-1 -mr-2 pr-2">
          {sessions.length === 0 && (
            <p className="text-sm font-normal" style={{ color: "rgba(255,255,255,0.3)" }}>
              Sin conversaciones guardadas
            </p>
          )}
          {sessions.map((session) => (
            <div key={session.id} className="group flex items-start gap-2 w-full">
              <button
                type="button"
                onClick={() => { onLoadSession?.(session.id); onClose?.(); }}
                className="flex items-start gap-3 text-white flex-1 text-left transition-opacity hover:opacity-80 min-w-0 py-1"
              >
                <span className="flex-shrink-0 mt-1"><MoreVertIcon /></span>
                <span className="flex flex-col min-w-0">
                  <span
                    className="truncate text-sm sm:text-base lg:text-[16px] font-normal leading-snug"
                  >
                    {session.title}
                  </span>
                  <span className="text-xs font-normal" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {formatDate(session.date)}
                  </span>
                </span>
              </button>
              {/* Delete button — visible on hover */}
              <button
                type="button"
                onClick={() => onDeleteSession?.(session.id)}
                aria-label="Eliminar conversación"
                className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Logout */}
      <button
        type="button"
        onClick={onNewChat}
        className="flex items-center gap-3 text-white transition-opacity hover:opacity-70 cursor-pointer text-sm sm:text-base font-normal mt-4 flex-shrink-0"
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
