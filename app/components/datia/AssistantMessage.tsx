interface AssistantMessageProps {
    content: string;
}

export function AssistantMessage({ content }: AssistantMessageProps) {
    return (
        <div
            className="text-white text-base sm:text-xl lg:text-[26px] font-normal leading-snug whitespace-pre-line"
            style={{ maxWidth: "min(714px, 90vw)" }}
        >
            {content}
        </div>
    );
}
