interface UserBubbleProps {
    content: string;
}

export function UserBubble({ content }: UserBubbleProps) {
    return (
        <div className="flex justify-end">
            <div
                className="text-white text-base sm:text-xl lg:text-[26px] font-normal leading-snug"
                style={{
                    background: "rgba(255, 255, 255, 0.25)",
                    borderRadius: "32px",
                    padding: "clamp(12px, 2vw, 24px)",
                    maxWidth: "min(709px, 85vw)",
                }}
            >
                {content}
            </div>
        </div>
    );
}
