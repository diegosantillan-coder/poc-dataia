import { DatiaLogo } from "./icons";

interface MobileHeaderProps {
    onMenuOpen: () => void;
}

export function MobileHeader({ onMenuOpen }: MobileHeaderProps) {
    return (
        <header
            className="flex items-center justify-between px-4 py-3 flex-shrink-0 lg:hidden"
            style={{ borderBottom: "1px solid rgba(100, 41, 205, 0.4)" }}
        >
            <DatiaLogo size="small" />
            <button
                type="button"
                onClick={onMenuOpen}
                aria-label="Abrir menú"
                className="flex flex-col justify-center gap-[5px] p-2"
            >
                <span className="block w-5 h-[2px] rounded bg-white/70" />
                <span className="block w-5 h-[2px] rounded bg-white/70" />
                <span className="block w-5 h-[2px] rounded bg-white/70" />
            </button>
        </header>
    );
}
