"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Message, Session } from "./types";

const STORAGE_KEY = "datia_sessions";
const MAX_SESSIONS = 20;

// ── Module-level external store ──────────────────────────────────
// Cache avoids returning a new array reference on every render tick.
let _cachedJSON: string | null = null;
let _cachedSessions: Session[] = [];

function readStorage(): Session[] {
    const raw = localStorage.getItem(STORAGE_KEY) ?? "[]";
    if (raw !== _cachedJSON) {
        _cachedJSON = raw;
        try { _cachedSessions = JSON.parse(raw) as Session[]; }
        catch { _cachedSessions = []; }
    }
    return _cachedSessions;
}

const _subscribers = new Set<() => void>();

function subscribeStore(cb: () => void) {
    _subscribers.add(cb);
    return () => { _subscribers.delete(cb); };
}

function writeStore(sessions: Session[]) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)); }
    catch { /* quota exceeded — silently ignore for demo */ }
    _cachedJSON = null; // invalidate cache
    _subscribers.forEach((cb) => cb());
}

// Server render always returns [] to match initial client render (no hydration mismatch)
const SERVER_SNAPSHOT: Session[] = [];

// ── Helpers ──────────────────────────────────────────────────────
function titleFromMessages(messages: Message[]): string {
    const first = messages.find((m) => m.role === "user");
    if (!first) return "Nueva conversación";
    return first.content.length > 40
        ? first.content.slice(0, 40) + "..."
        : first.content;
}

export function useSessions() {
    const sessions = useSyncExternalStore(subscribeStore, readStorage, () => SERVER_SNAPSHOT);

    const saveSession = useCallback((id: string, messages: Message[]) => {
        if (messages.length === 0) return;
        const prev = readStorage();
        const existing = prev.find((s) => s.id === id);
        const updated: Session = {
            id,
            title: titleFromMessages(messages),
            date: existing?.date ?? new Date().toISOString(),
            messages,
        };
        const filtered = prev.filter((s) => s.id !== id);
        writeStore([updated, ...filtered].slice(0, MAX_SESSIONS));
    }, []);

    const deleteSession = useCallback((id: string) => {
        writeStore(readStorage().filter((s) => s.id !== id));
    }, []);

    return { sessions, saveSession, deleteSession };
}

