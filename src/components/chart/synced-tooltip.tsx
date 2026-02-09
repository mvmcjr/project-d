"use client";

import * as React from "react";
import { ChartTooltipContent } from "@/components/ui/chart";

interface SyncedTooltipProps {
    viewBox?: { x: number; y: number; width: number; height: number };
    syncedTime: number | null | undefined;
    chartData: Record<string, number | string | null>[];
    selectedSeries: string[];
    chartConfig: Record<string, { label?: React.ReactNode; color?: string }>;
}

export function SyncedTooltip({
    viewBox,
    syncedTime,
    chartData,
    selectedSeries,
    chartConfig,
}: SyncedTooltipProps) {
    if (syncedTime === null || syncedTime === undefined || !viewBox) {
        return null;
    }

    const { x, y } = viewBox;

    // Find the data point
    const dataPoint = React.useMemo(() => {
        return chartData.find(d => d.Time === syncedTime) ||
            chartData.reduce((closest, d) => {
                if (typeof d.Time !== 'number') return closest;
                const diff = Math.abs(d.Time - syncedTime);
                const closestDiff = closest && typeof closest.Time === 'number'
                    ? Math.abs(closest.Time - syncedTime)
                    : Infinity;
                return diff < closestDiff ? d : closest;
            }, null as Record<string, number | string | null> | null);
    }, [chartData, syncedTime]);

    if (!dataPoint) return null;

    // Construct payload for ChartTooltipContent
    // We map selected series to the format Recharts expects
    const payload = selectedSeries.map(key => ({
        name: key,
        value: dataPoint[key],
        payload: {
            ...dataPoint,
            fill: chartConfig[key]?.color // Add fill color for indicator
        },
        dataKey: key,
        type: undefined,
        color: chartConfig[key]?.color // Add color property directly
    })).filter(p => p.value !== null && p.value !== undefined);

    if (payload.length === 0) return null;

    return (
        <foreignObject
            x={x + 10} // Offset slightly to right
            y={y}
            width={250}
            height={300} // Approximate height
            style={{ overflow: 'visible', pointerEvents: 'none' }}
        >
            <div className="relative">
                <ChartTooltipContent
                    active={true}
                    payload={payload}
                    label={typeof dataPoint.Time === 'number' ? dataPoint.Time.toFixed(2) + "s" : dataPoint.Time}
                    indicator="dot"
                />
                <div className="absolute top-0 right-0 -mt-2 -mr-2 text-[10px] font-bold text-orange-500 bg-background border rounded px-1 shadow-sm">
                    SYNCED
                </div>
            </div>
        </foreignObject>
    );
}
