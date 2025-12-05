"use client";

import * as React from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ParsedData } from "@/lib/types";
import { calculateStats } from "@/lib/stats";
import { Badge } from "@/components/ui/badge";

interface ChartViewProps {
    data: ParsedData;
}

const COLORS = [
    "#2563eb", // blue-600
    "#dc2626", // red-600
    "#16a34a", // green-600
    "#d97706", // amber-600
    "#9333ea", // purple-600
    "#db2777", // pink-600
    "#0891b2", // cyan-600
    "#4f46e5", // indigo-600
];

export function ChartView({ data }: ChartViewProps) {
    // Default to first 3 numeric columns that aren't Time
    const numericHeaders = React.useMemo(() => {
        return data.headers.filter(h => {
            const val = data.data[0]?.[h];
            return typeof val === 'number' && h.toLowerCase() !== 'time';
        });
    }, [data]);

    const [selectedSeries, setSelectedSeries] = React.useState<string[]>([]);

    React.useEffect(() => {
        if (selectedSeries.length === 0 && numericHeaders.length > 0) {
            setSelectedSeries(numericHeaders.slice(0, 3));
        }
    }, [numericHeaders]);

    const toggleSeries = (series: string) => {
        setSelectedSeries(prev =>
            prev.includes(series)
                ? prev.filter(s => s !== series)
                : [...prev, series]
        );
    };

    // Basic downsampling for performance
    const chartData = React.useMemo(() => {
        if (data.data.length < 2000) return data.data;
        const factor = Math.ceil(data.data.length / 2000);
        return data.data.filter((_, i) => i % factor === 0);
    }, [data.data]);

    // Memoize stats for performance
    const stats = React.useMemo(() => {
        const res: Record<string, { min: number; max: number; avg: number }> = {};
        for (const h of numericHeaders) {
            res[h] = calculateStats(data.data, h);
        }
        return res;
    }, [data.data, numericHeaders]);

    // Create a stable color map based on the header index in the full list
    const colorMap = React.useMemo(() => {
        const map: Record<string, string> = {};
        numericHeaders.forEach((h, i) => {
            map[h] = COLORS[i % COLORS.length];
        });
        return map;
    }, [numericHeaders]);

    return (
        <div className="flex flex-col md:flex-row h-full gap-4">
            {/* Chart Area */}
            <Card className="flex-1 flex flex-col h-full border-none shadow-none bg-transparent min-h-[400px]">
                <CardContent className="flex-1 p-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={chartData}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} vertical={false} />
                            <XAxis
                                dataKey="Time"
                                minTickGap={50}
                                tickFormatter={(val) => typeof val === 'number' ? val.toFixed(1) : val}
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false} // clean look
                                axisLine={false}
                                width={40}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    borderColor: 'hsl(var(--border))',
                                    color: 'hsl(var(--foreground))',
                                    borderRadius: 'var(--radius)',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                }}
                                itemStyle={{ fontSize: '12px', padding: 0 }}
                                labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '0.25rem' }}
                                formatter={(value: any) => typeof value === 'number' ? value.toFixed(2) : value}
                            />
                            <Legend verticalAlign="top" height={36} iconType="circle" />
                            {selectedSeries.map((s) => (
                                <Line
                                    key={s}
                                    type="monotone"
                                    dataKey={s}
                                    stroke={colorMap[s]}
                                    dot={false}
                                    strokeWidth={2}
                                    activeDot={{ r: 4, strokeWidth: 0 }}
                                    isAnimationActive={false}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Sidebar Area */}
            <div className="w-full md:w-80 flex-shrink-0 flex flex-col h-[300px] md:h-full">
                <Card className="h-full flex flex-col border-none md:border shadow-sm">
                    <CardHeader className="py-4 px-4 sticky top-0 bg-card z-10 border-b">
                        <CardTitle className="text-sm font-medium">Metrics & Stats</CardTitle>
                        <CardDescription className="text-xs">
                            {selectedSeries.length} selected
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden p-0">
                        <ScrollArea className="h-full">
                            <div className="divide-y">
                                {numericHeaders.map((header, idx) => {
                                    const isSelected = selectedSeries.includes(header);
                                    const color = colorMap[header];

                                    return (
                                        <div key={header} className={`p-3 transition-colors hover:bg-muted/50 ${isSelected ? "bg-muted/30" : ""}`}>
                                            <div className="flex items-start gap-3">
                                                <Checkbox
                                                    id={header}
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleSeries(header)}
                                                    className="mt-1"
                                                />
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <Label
                                                            htmlFor={header}
                                                            className={`text-sm font-medium leading-none cursor-pointer ${isSelected ? "text-foreground" : "text-muted-foreground"}`}
                                                            style={{ color: isSelected ? color : undefined }}
                                                        >
                                                            {header}
                                                        </Label>
                                                    </div>

                                                    {/* Stats Grid */}
                                                    <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] text-muted-foreground">
                                                        <div className="flex flex-col">
                                                            <span className="opacity-70">Min</span>
                                                            <span className="font-mono text-foreground">{stats[header].min.toFixed(1)}</span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="opacity-70">Avg</span>
                                                            <span className="font-mono text-foreground">{stats[header].avg.toFixed(1)}</span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="opacity-70">Max</span>
                                                            <span className="font-mono text-foreground">{stats[header].max.toFixed(1)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
