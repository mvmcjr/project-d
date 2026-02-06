"use client";

import * as React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DataPoint } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DataTableProps {
    data: DataPoint[];
    selectedSafeSeries: string[];
    headerMap: Record<string, string>;
    hoveredTime: number | null;
}

export function DataTable({ data, selectedSafeSeries, headerMap, hoveredTime }: DataTableProps) {
    const rowRefs = React.useRef<Map<number, HTMLTableRowElement>>(new Map());
    const closestIdx = React.useMemo(() => {
        if (hoveredTime === null) return -1;
        let minDiff = Infinity;
        let index = -1;
        for (let i = 0; i < data.length; i++) {
            const diff = Math.abs(Number(data[i].Time) - hoveredTime);
            if (diff < minDiff) {
                minDiff = diff;
                index = i;
            }
        }
        return index;
    }, [hoveredTime, data]);

    React.useEffect(() => {
        if (closestIdx !== -1) {
            const row = data[closestIdx];
            const rowElement = rowRefs.current.get(Number(row.Time));
            if (rowElement) {
                rowElement.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                });
            }
        }
    }, [closestIdx, data]);

    const timeRange = React.useMemo(() => {
        if (data.length === 0) return { min: 0, max: 0 };
        const times = data.map(d => Number(d.Time));
        return { min: Math.min(...times), max: Math.max(...times) };
    }, [data]);

    return (
        <div className="flex flex-col h-full border rounded-md overflow-hidden bg-card">
            <div className="p-3 border-b bg-muted/30">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Data Table
                    </h3>
                    <div className="text-[10px] text-muted-foreground font-mono">
                        {data.length} points
                    </div>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="font-mono">
                        Time: {timeRange.min.toFixed(2)}s - {timeRange.max.toFixed(2)}s
                    </span>
                    <span className="opacity-50">•</span>
                    <span>
                        {selectedSafeSeries.length} series selected
                    </span>
                </div>
            </div>
            {/* Column Headers - Fixed */}
            <div className="border-b bg-muted/50">
                <div className="flex">
                    <div className="w-24 shrink-0 px-3 py-2 font-mono text-xs font-medium text-muted-foreground">
                        Time (s)
                    </div>
                    {selectedSafeSeries.map((safeKey) => (
                        <div key={safeKey} className="flex-1 px-3 py-2 font-mono text-xs font-medium text-muted-foreground truncate">
                            {headerMap[safeKey]}
                        </div>
                    ))}
                </div>
            </div>
            {/* Scrollable Data Rows */}
            <ScrollArea className="flex-1">
                <Table>
                    <TableBody>
                        {data.map((row, idx) => {
                            const time = Number(row.Time);
                            const isHighlighted = idx === closestIdx;

                            return (
                                <TableRow
                                    key={time}
                                    ref={(el) => {
                                        if (el) rowRefs.current.set(time, el);
                                        else rowRefs.current.delete(time);
                                    }}
                                    className={cn(
                                        "h-8 transition-colors",
                                        isHighlighted ? "bg-primary/20 hover:bg-primary/30" : "hover:bg-muted/50"
                                    )}
                                >
                                    <TableCell className="font-mono text-[10px] py-1 w-24 shrink-0">
                                        {time.toFixed(3)}
                                    </TableCell>
                                    {selectedSafeSeries.map((safeKey) => (
                                        <TableCell key={safeKey} className="font-mono text-[10px] py-1">
                                            {typeof row[safeKey] === 'number'
                                                ? (row[safeKey] as number).toFixed(2)
                                                : row[safeKey]}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    );
}
