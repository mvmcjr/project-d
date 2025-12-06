"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ParsedData } from "@/lib/types";

interface StatsSidebarProps {
    data: ParsedData;
    selectedSeries: string[]; // We will pass selected series from parent in the future or context
}

// Helper to calculate stats
function calculateStats(data: Record<string, number | string | null>[], key: string) {
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    let count = 0;

    for (const row of data) {
        const val = row[key];
        if (typeof val === 'number') {
            if (val < min) min = val;
            if (val > max) max = val;
            sum += val;
            count++;
        }
    }

    return {
        min: count > 0 ? min : 0,
        max: count > 0 ? max : 0,
        avg: count > 0 ? sum / count : 0,
    };
}

export function StatsSidebar({ data, selectedSeries }: StatsSidebarProps) {
    const stats = React.useMemo(() => {
        const res: Record<string, { min: number; max: number; avg: number }> = {};
        for (const s of selectedSeries) {
            res[s] = calculateStats(data.data, s);
        }
        return res;
    }, [data, selectedSeries]);

    if (selectedSeries.length === 0) {
        return (
            <div className="text-center text-muted-foreground p-4 text-sm">
                Select metrics to view statistics.
            </div>
        );
    }

    return (
        <ScrollArea className="h-full pr-4">
            <div className="space-y-4">
                {selectedSeries.map((series) => (
                    <Card key={series} className="overflow-hidden">
                        <CardHeader className="p-3 bg-muted/40">
                            <CardTitle className="text-xs font-semibold truncate" title={series}>{series}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 grid grid-cols-3 gap-2 text-center">
                            <div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Min</div>
                                <div className="font-mono text-sm">{stats[series].min.toFixed(2)}</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg</div>
                                <div className="font-mono text-sm">{stats[series].avg.toFixed(2)}</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Max</div>
                                <div className="font-mono text-sm">{stats[series].max.toFixed(2)}</div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </ScrollArea>
    );
}
