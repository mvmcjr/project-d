"use client";

import * as React from "react";
import { FileText, Globe, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecentLog } from "@/lib/types";

function timeAgoLabel(isoDate: string): string {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
}

interface RecentLogsProps {
    logs: RecentLog[];
    onOpen: (log: RecentLog) => void;
    onRemove: (id: string) => void;
    onClearAll: () => void;
}

export function RecentLogs({ logs, onOpen, onRemove, onClearAll }: RecentLogsProps) {
    if (logs.length === 0) return null;

    return (
        <div className="mt-6">
            <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Recent Logs
                </span>
                <button
                    onClick={onClearAll}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    Clear all
                </button>
            </div>

            <ul className="space-y-1">
                {logs.map((log) => (
                    <RecentLogItem
                        key={log.id}
                        log={log}
                        onOpen={onOpen}
                        onRemove={onRemove}
                    />
                ))}
            </ul>
        </div>
    );
}

interface RecentLogItemProps {
    log: RecentLog;
    onOpen: (log: RecentLog) => void;
    onRemove: (id: string) => void;
}

function RecentLogItem({ log, onOpen, onRemove }: RecentLogItemProps) {
    const [isLoading, setIsLoading] = React.useState(false);

    const handleOpen = async () => {
        setIsLoading(true);
        try {
            await onOpen(log);
        } finally {
            setIsLoading(false);
        }
    };

    const timeAgo = React.useMemo(
        () => timeAgoLabel(log.addedAt),
        [log.addedAt]
    );

    return (
        <li className="group flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/60 transition-colors cursor-pointer"
            onClick={handleOpen}
        >
            <div className="shrink-0 text-muted-foreground">
                {log.type === "url" ? (
                    <Globe className="w-4 h-4" />
                ) : (
                    <FileText className="w-4 h-4" />
                )}
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{log.name}</p>
                <p className="text-xs text-muted-foreground">
                    {log.rowCount.toLocaleString()} rows · {timeAgo}
                </p>
            </div>

            {isLoading ? (
                <RotateCcw className="w-3.5 h-3.5 text-muted-foreground animate-spin shrink-0" />
            ) : (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(log.id);
                    }}
                    aria-label={`Remove ${log.name} from recents`}
                >
                    <X className="w-3.5 h-3.5" />
                </Button>
            )}
        </li>
    );
}
