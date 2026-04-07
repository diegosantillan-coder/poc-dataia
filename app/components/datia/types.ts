export type Message = {
    role: "user" | "assistant";
    content: string;
};

export type Session = {
    id: string;
    title: string;
    date: string; // ISO string
    messages: Message[];
};
