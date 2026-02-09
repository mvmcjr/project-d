import { useEffect, useRef, useCallback } from 'react';

type SyncMessage =
    | { type: 'HOVER'; time: number | null }
    | { type: 'ZOOM'; left: number | null; right: number | null }
    | { type: 'SELECTION'; selection: string[] };

interface UseBroadcastSyncProps {
    channelName: string;
    enabled: boolean;
    onHover?: (time: number | null) => void;
    onZoom?: (left: number | null, right: number | null) => void;
    onSelection?: (selection: string[]) => void;
}

export function useBroadcastSync({ channelName, enabled, onHover, onZoom, onSelection }: UseBroadcastSyncProps) {
    const channelRef = useRef<BroadcastChannel | null>(null);
    const isInternalUpdate = useRef(false);

    useEffect(() => {
        if (!enabled) {
            if (channelRef.current) {
                channelRef.current.close();
                channelRef.current = null;
            }
            return;
        }

        const channel = new BroadcastChannel(channelName);
        channelRef.current = channel;

        channel.onmessage = (event) => {
            const msg = event.data as SyncMessage;
            isInternalUpdate.current = true;

            if (msg.type === 'HOVER') {
                onHover?.(msg.time);
            } else if (msg.type === 'ZOOM') {
                onZoom?.(msg.left, msg.right);
            } else if (msg.type === 'SELECTION') {
                onSelection?.(msg.selection);
            }

            // Reset flag after a short delay to allow React state updates to settle
            // preventing echo loops if the parent component triggers an update immediately
            setTimeout(() => {
                isInternalUpdate.current = false;
            }, 50);
        };

        return () => {
            channel.close();
            channelRef.current = null;
        };
    }, [channelName, enabled, onHover, onZoom, onSelection]);

    const broadcastHover = useCallback((time: number | null) => {
        if (!enabled || !channelRef.current || isInternalUpdate.current) return;
        channelRef.current.postMessage({ type: 'HOVER', time });
    }, [enabled]);

    const broadcastZoom = useCallback((left: number | null, right: number | null) => {
        if (!enabled || !channelRef.current || isInternalUpdate.current) return;
        channelRef.current.postMessage({ type: 'ZOOM', left, right });
    }, [enabled]);

    const broadcastSelection = useCallback((selection: string[]) => {
        if (!enabled || !channelRef.current || isInternalUpdate.current) return;
        channelRef.current.postMessage({ type: 'SELECTION', selection });
    }, [enabled]);

    return {
        broadcastHover,
        broadcastZoom,
        broadcastSelection
    };
}
