"use client";

import * as React from "react";
import { RecentLog } from "@/lib/types";

const STORAGE_KEY = "project-d:recent-logs";
const MAX_RECENTS = 5;
const IDB_NAME = "project-d";
const IDB_STORE = "csv-data";

// ---------------------------------------------------------------------------
// IndexedDB helpers for CSV text storage
// ---------------------------------------------------------------------------

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function saveCsv(id: string, csvText: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(csvText, id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function getRecentCsv(id: string): Promise<string | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readonly");
        const req = tx.objectStore(IDB_STORE).get(id);
        req.onsuccess = () => resolve((req.result as string) ?? null);
        req.onerror = () => reject(req.error);
    });
}

async function deleteCsv(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// ---------------------------------------------------------------------------
// localStorage helpers for the metadata list
// ---------------------------------------------------------------------------

function loadFromStorage(): RecentLog[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as RecentLog[]) : [];
    } catch {
        return [];
    }
}

function saveToStorage(logs: RecentLog[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch {
        // Quota exceeded or private browsing — fail silently
    }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface AddRecentPayload {
    type: "file" | "url";
    name: string;
    rowCount: number;
    csvText: string;
    url?: string;
}

export function useRecentLogs() {
    const [recentLogs, setRecentLogs] = React.useState<RecentLog[]>([]);
    const [isLoaded, setIsLoaded] = React.useState(false);

    React.useEffect(() => {
        setRecentLogs(loadFromStorage());
        setIsLoaded(true);
    }, []);

    const addRecentLog = React.useCallback(
        async ({ type, name, rowCount, csvText, url }: AddRecentPayload) => {
            const id = crypto.randomUUID();
            const entry: RecentLog = {
                id,
                type,
                name,
                addedAt: new Date().toISOString(),
                rowCount,
                url,
            };

            await saveCsv(id, csvText).catch(() => {});

            setRecentLogs((prev) => {
                // Deduplicate by URL (for url type) or name (for file type)
                const deduped = prev.filter((r) => {
                    if (type === "url" && url) return r.url !== url;
                    if (type === "file") return r.name !== name;
                    return true;
                });

                // Evict oldest entries beyond the limit, cleaning up their CSV data
                const evicted = deduped.slice(MAX_RECENTS - 1);
                evicted.forEach((r) => deleteCsv(r.id).catch(() => {}));

                const next = [entry, ...deduped].slice(0, MAX_RECENTS);
                saveToStorage(next);
                return next;
            });
        },
        []
    );

    const removeRecentLog = React.useCallback((id: string) => {
        deleteCsv(id).catch(() => {});
        setRecentLogs((prev) => {
            const next = prev.filter((r) => r.id !== id);
            saveToStorage(next);
            return next;
        });
    }, []);

    const clearRecentLogs = React.useCallback((logs: RecentLog[]) => {
        logs.forEach((l) => deleteCsv(l.id).catch(() => {}));
        setRecentLogs([]);
        saveToStorage([]);
    }, []);

    return { recentLogs, isLoaded, addRecentLog, removeRecentLog, clearRecentLogs };
}
