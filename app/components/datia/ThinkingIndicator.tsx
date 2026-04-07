export function ThinkingIndicator() {
    return (
        <>
            <style>{`
        @keyframes datia-thinking-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
          30% { transform: translateY(-7px); opacity: 1; }
        }
        @keyframes datia-thinking-glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .datia-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: rgba(168, 85, 247, 0.9);
          animation: datia-thinking-bounce 1.4s ease-in-out infinite;
        }
        .datia-dot:nth-child(2) { animation-delay: 0.18s; }
        .datia-dot:nth-child(3) { animation-delay: 0.36s; }
      `}</style>
            <div className="flex items-center gap-3">
                <span
                    className="text-sm sm:text-base lg:text-[18px] font-normal"
                    style={{
                        color: "rgba(168, 85, 247, 0.8)",
                        animation: "datia-thinking-glow 1.8s ease-in-out infinite",
                    }}
                >
                    Pensando
                </span>
                <div className="flex items-center gap-[5px] pb-[2px]">
                    <div className="datia-dot" />
                    <div className="datia-dot" />
                    <div className="datia-dot" />
                </div>
            </div>
        </>
    );
}
