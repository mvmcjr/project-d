"use client";

import * as React from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Legend,
    ReferenceArea,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RotateCcw, Search } from "lucide-react";
import { ParsedData } from "@/lib/types";
import { calculateStats } from "@/lib/stats";
import { generateColors } from "@/lib/utils";
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegendContent
} from "@/components/ui/chart";

interface ChartViewProps {
    data: ParsedData;
}



interface CustomDotProps {
    cx: number;
    cy: number;
    stroke: string;
    payload: { Time: number };
    dataKey: string;
    stats: Record<string, { minPoint: Record<string, number | string | null> | null; maxPoint: Record<string, number | string | null> | null }>;
}

// Custom Dot Component for Min/Max
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomDot = (props: any) => {
    // Casting to exact type related to Recharts internals is tricky, using safe interface
    const { cx, cy, stroke, payload, dataKey, stats } = props as CustomDotProps;
    const s = stats[dataKey];
    if (!s || !s.minPoint || !s.maxPoint) return null;

    const isMin = payload.Time === s.minPoint.Time;
    const isMax = payload.Time === s.maxPoint.Time;

    if (isMin || isMax) {
        return (
            <circle cx={cx} cy={cy} r={4} fill={stroke} stroke="white" strokeWidth={2} />
        );
    }
    return null;
};

// Helper to sanitize keys for CSS variables
const sanitizeKey = (key: string) => key.replace(/[^a-zA-Z0-9]/g, "_");

export function ChartView({ data }: ChartViewProps) {
    // 1. Sanitize Data & Headers
    const { processedData, headerMap, safeHeaders } = React.useMemo(() => {
        const safeMap: Record<string, string> = { "Time": "Time" };
        const reverseMap: Record<string, string> = { "Time": "Time" };
        const numeric: string[] = [];
        const usedKeys = new Set<string>();
        usedKeys.add("Time");

        data.headers.forEach((h, index) => {
            if (h === "Time") return;

            // Generate stable key by stripping units (e.g. "Boost [psi]" -> "Boost")
            // This ensures selection persists when units change
            const base = h.replace(/\s*\[[^\]]*\]$/, '');
            let safe = sanitizeKey(base);

            // Handle duplicates (e.g. distinct sensors with same name but different units, or colliding names)
            if (usedKeys.has(safe)) {
                safe = `${safe}_${index}`;
            }
            usedKeys.add(safe);

            safeMap[h] = safe;
            reverseMap[safe] = h;

            const val = data.data[0]?.[h];
            if (typeof val === 'number') {
                numeric.push(safe);
            }
        });

        const newData = data.data.map(row => {
            const newRow: Record<string, number | string | null> = { Time: row.Time };
            Object.keys(row).forEach(k => {
                const sKey = safeMap[k];
                if (k !== "Time" && sKey) {
                    newRow[sKey] = row[k];
                }
            });
            return newRow;
        });

        return { processedData: newData, headerMap: reverseMap, safeHeaders: numeric };
    }, [data]);

    const [selectedSafeSeries, setSelectedSafeSeries] = React.useState<string[]>([]);

    // Zoom State
    const [left, setLeft] = React.useState<number | null>(null);
    const [right, setRight] = React.useState<number | null>(null);
    const [refAreaLeft, setRefAreaLeft] = React.useState<number | null>(null);
    const [refAreaRight, setRefAreaRight] = React.useState<number | null>(null);

    // Search State
    const [searchQuery, setSearchQuery] = React.useState("");

    // Track previous headers to detect new additions (like Virtual Dyno Power)
    const prevSafeHeadersRef = React.useRef<string[]>([]);

    // Auto-select logic
    React.useEffect(() => {
        const prev = prevSafeHeadersRef.current;
        const current = safeHeaders;

        // Check if this is an "Append" operation (superset of previous headers)
        // This detects when a new channel is added to existing data (e.g. Power)
        const isAppend = prev.length > 0 && prev.every(p => current.includes(p));

        if (isAppend && current.length > prev.length) {
            // Find newly added keys and select them
            const newKeys = current.filter(k => !prev.includes(k));
            if (newKeys.length > 0) {
                setSelectedSafeSeries(curr => [...curr, ...newKeys]);
            }
        }
        // Initial load or fresh file: select default first 3 if selection is empty
        else if (selectedSafeSeries.length === 0 && current.length > 0) {
            setSelectedSafeSeries(current.slice(0, 3));
        }

        prevSafeHeadersRef.current = current;
    }, [safeHeaders, selectedSafeSeries.length]);

    const toggleSeries = (safeKey: string) => {
        setSelectedSafeSeries(prev =>
            prev.includes(safeKey)
                ? prev.filter(s => s !== safeKey)
                : [...prev, safeKey]
        );
    };

    // Filter Headers based on Search
    const filteredHeaders = React.useMemo(() => {
        if (!searchQuery) return safeHeaders;
        return safeHeaders.filter(safeKey =>
            headerMap[safeKey].toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [safeHeaders, headerMap, searchQuery]);

    // Filter Data based on Zoom
    const viewData = React.useMemo(() => {
        if (left === null || right === null) return processedData;
        return processedData.filter(d => {
            const t = d.Time;
            if (typeof t !== 'number') return false;
            return t >= left && t <= right;
        });
    }, [processedData, left, right]);

    // Downsampling for performance (applied to viewData)
    const chartData = React.useMemo(() => {
        if (viewData.length < 2000) return viewData;
        const factor = Math.ceil(viewData.length / 2000);
        return viewData.filter((_, i) => i % factor === 0);
    }, [viewData]);

    const [isRelative, setIsRelative] = React.useState(true);

    // Calculate Stats & Config (applied to viewData so stats update on zoom)
    const { stats, chartConfig } = React.useMemo(() => {
        const statsObj: Record<string, { min: number; max: number; avg: number; minPoint: Record<string, number | string | null> | null; maxPoint: Record<string, number | string | null> | null }> = {};
        const config: ChartConfig = {};

        // Generate colors dynamically
        const dynamicColors = generateColors(safeHeaders.length);

        safeHeaders.forEach((safeKey, i) => {
            statsObj[safeKey] = calculateStats(viewData, safeKey);
            config[safeKey] = {
                label: headerMap[safeKey],
                color: dynamicColors[i],
            };
        });

        return { stats: statsObj, chartConfig: config };
    }, [viewData, safeHeaders, headerMap]);

    // Normalize Data for Relative Mode
    const displayData = React.useMemo(() => {
        if (!isRelative) return chartData;

        return chartData.map(row => {
            const newRow: Record<string, number | string | null> = { Time: row.Time };
            selectedSafeSeries.forEach(key => {
                const s = stats[key];
                const val = row[key];
                if (typeof val === 'number' && s && (s.max - s.min) !== 0) {
                    newRow[key] = ((val - s.min) / (s.max - s.min)) * 100;
                    // Store original for tooltip
                    newRow[`original_${key}`] = val;
                } else if (typeof val === 'number') {
                    newRow[key] = val; // Fallback if range is 0
                    newRow[`original_${key}`] = val;
                }
            });
            return newRow;
        });
    }, [chartData, isRelative, stats, selectedSafeSeries]);

    // Zoom Handlers
    const zoom = () => {
        if (refAreaLeft === refAreaRight || refAreaLeft === null || refAreaRight === null) {
            setRefAreaLeft(null);
            setRefAreaRight(null);
            return;
        }

        // Ensure correct order
        let newLeft = refAreaLeft;
        let newRight = refAreaRight;
        if (newLeft > newRight) [newLeft, newRight] = [newRight, newLeft];

        setLeft(newLeft);
        setRight(newRight);
        setRefAreaLeft(null);
        setRefAreaRight(null);
    };

    const zoomOut = () => {
        setLeft(null);
        setRight(null);
        setRefAreaLeft(null);
        setRefAreaRight(null);
    };



    return (
        <div className="flex flex-col md:flex-row h-full gap-4">
            {/* Chart Area */}
            <Card className="flex-1 flex flex-col h-full border-none shadow-none bg-transparent min-h-[400px]">
                <CardContent className="flex-1 p-0 relative group">
                    <div className="absolute top-2 right-2 z-20">
                        {(left !== null || right !== null) && (
                            <Button variant="outline" size="sm" onClick={zoomOut} className="gap-2 bg-background/80 backdrop-blur-sm">
                                <RotateCcw className="h-4 w-4" />
                                Reset Zoom
                            </Button>
                        )}
                    </div>
                    <ChartContainer config={chartConfig} className="aspect-auto h-full w-full select-none">
                        <LineChart
                            data={displayData}
                            margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                            onMouseDown={(e: unknown) => e && setRefAreaLeft((e as { activeLabel: number }).activeLabel)}
                            onMouseMove={(e: unknown) => refAreaLeft !== null && e && setRefAreaRight((e as { activeLabel: number }).activeLabel)}
                            onMouseUp={zoom}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="Time"
                                minTickGap={50}
                                tickFormatter={(val) => typeof val === 'number' ? val.toFixed(1) : val}
                                tickLine={false}
                                axisLine={false}
                                allowDataOverflow
                                domain={[left || 'dataMin', right || 'dataMax']}
                                type="number"
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                width={40}
                                tickFormatter={(val) => isRelative ? `${val.toFixed(0)}%` : val}
                                domain={isRelative ? [0, 100] : ['auto', 'auto']}
                            />
                            <ChartTooltip
                                content={
                                    <ChartTooltipContent
                                        className="w-[200px]"
                                        labelFormatter={(_, payload) => {
                                            if (payload && payload.length > 0) {
                                                const time = payload[0].payload.Time;
                                                return `Time: ${typeof time === 'number' ? time.toFixed(2) : time}s`;
                                            }
                                            return "";
                                        }}
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        formatter={(value, name, item, index, payload: any) => {
                                            const key = item.dataKey as string;

                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            let displayValue: any = value;

                                            if (isRelative && payload) {
                                                const p = payload;
                                                const originalVal = p[`original_${key}`];
                                                if (typeof originalVal === 'number') {
                                                    displayValue = originalVal;
                                                }
                                            }

                                            // Ensure displayValue is treated as a valid React child (string/number)
                                            if (displayValue === null) return "";

                                            return typeof displayValue === 'number'
                                                ? displayValue.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                                : displayValue;
                                        }}
                                    />
                                }
                            />
                            <Legend content={<ChartLegendContent />} verticalAlign="top" />
                            {selectedSafeSeries.map((s) => (
                                <Line
                                    key={s}
                                    type="monotone"
                                    dataKey={s}
                                    stroke={`var(--color-${s})`}
                                    strokeWidth={2}
                                    dot={<CustomDot stats={stats} />}
                                    activeDot={{ r: 6 }}
                                    isAnimationActive={false}
                                />
                            ))}
                            {refAreaLeft !== null && refAreaRight !== null && (
                                <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="hsl(var(--foreground))" fillOpacity={0.1} />
                            )}
                        </LineChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            {/* Sidebar Area */}
            <div className="w-full md:w-80 flex-shrink-0 flex flex-col h-[300px] md:h-full">
                <Card className="h-full flex flex-col border-none md:border shadow-sm">
                    <CardHeader className="py-4 px-4 sticky top-0 bg-card z-10 border-b space-y-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">Data Channels</CardTitle>
                            <div className="flex items-center space-x-2">
                                <Label htmlFor="relative-mode" className="text-xs text-muted-foreground whitespace-nowrap">
                                    Relative %
                                </Label>
                                <Switch
                                    id="relative-mode"
                                    checked={isRelative}
                                    onCheckedChange={setIsRelative}
                                    className="scale-75"
                                />
                            </div>
                        </div>
                        {(left !== null) && <div className="text-[10px] bg-muted px-2 py-1 rounded text-muted-foreground self-start">Zoomed</div>}

                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search channels..."
                                className="pl-8 h-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <CardDescription className="text-xs">
                            {selectedSafeSeries.length} selected
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden p-0">
                        <ScrollArea className="h-full">
                            <div className="divide-y text-card-foreground">
                                {filteredHeaders.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        No channels found.
                                    </div>
                                ) : (
                                    filteredHeaders.map((safeKey) => {
                                        const isSelected = selectedSafeSeries.includes(safeKey);
                                        const config = chartConfig[safeKey];
                                        const color = config?.color;
                                        const stat = stats[safeKey];

                                        return (
                                            <div key={safeKey} className={`p-3 transition-colors hover:bg-muted/50 ${isSelected ? "bg-muted/30" : ""}`}>
                                                <div className="flex items-start gap-3">
                                                    <Checkbox
                                                        id={safeKey}
                                                        checked={isSelected}
                                                        onCheckedChange={() => toggleSeries(safeKey)}
                                                        className="mt-1"
                                                    />
                                                    <div className="flex-1 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <Label
                                                                htmlFor={safeKey}
                                                                className={`text-sm font-medium leading-none cursor-pointer ${isSelected ? "" : "text-muted-foreground"}`}
                                                                style={{ color: isSelected ? color : undefined }}
                                                            >
                                                                {headerMap[safeKey]}
                                                            </Label>
                                                        </div>

                                                        {/* Stats Grid */}
                                                        <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] text-muted-foreground">
                                                            <div className="flex flex-col">
                                                                <span className="opacity-70">Min</span>
                                                                <span className="font-mono text-foreground">{stat.min.toFixed(1)}</span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="opacity-70">Avg</span>
                                                                <span className="font-mono text-foreground">{stat.avg.toFixed(1)}</span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="opacity-70">Max</span>
                                                                <span className="font-mono text-foreground">{stat.max.toFixed(1)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
