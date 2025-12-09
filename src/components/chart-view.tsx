"use client";

import * as React from "react";
import { ParsedData, ConversionSchema } from "@/lib/types";
import { calculateStats } from "@/lib/stats";
import { generateColors } from "@/lib/utils";
import { detectUnit } from "@/lib/conversions";
import { ChartSidebar } from "./chart/chart-sidebar";
import { ChartArea } from "./chart/chart-area";
import { ChartConfig } from "@/components/ui/chart";

interface ChartViewProps {
    data: ParsedData;
    conversionMetadata?: Record<string, ConversionSchema>;
}

// Helper to sanitize keys for CSS variables
const sanitizeKey = (key: string) => key.replace(/[^a-zA-Z0-9]/g, "_");

export function ChartView({ data, conversionMetadata = {} }: ChartViewProps) {
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
                    // Also copy hidden original field if it exists
                    const origKey = `__original_${k}`;
                    if (row[origKey] !== undefined) {
                        newRow[`__original_${sKey}`] = row[origKey];
                    }
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

    // Track previous headers to detect new additions
    const prevSafeHeadersRef = React.useRef<string[]>([]);

    // Auto-select logic
    React.useEffect(() => {
        const prev = prevSafeHeadersRef.current;
        const current = safeHeaders;

        const isAppend = prev.length > 0 && prev.every(p => current.includes(p));

        if (isAppend && current.length > prev.length) {
            const newKeys = current.filter(k => !prev.includes(k));
            if (newKeys.length > 0) {
                setSelectedSafeSeries(curr => [...curr, ...newKeys]);
            }
        }
        else if (selectedSafeSeries.length === 0 && current.length > 0 && prev.length === 0) {
            setSelectedSafeSeries(current.slice(0, 3));
        }

        prevSafeHeadersRef.current = current;
    }, [safeHeaders, selectedSafeSeries.length]);

    const toggleSeries = React.useCallback((safeKey: string) => {
        setSelectedSafeSeries(prev =>
            prev.includes(safeKey)
                ? prev.filter(s => s !== safeKey)
                : [...prev, safeKey]
        );
    }, []);

    const deselectAll = React.useCallback(() => {
        setSelectedSafeSeries([]);
    }, []);

    const filteredHeaders = React.useMemo(() => {
        if (!searchQuery) return safeHeaders;
        return safeHeaders.filter(safeKey =>
            headerMap[safeKey].toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [safeHeaders, headerMap, searchQuery]);

    const viewData = React.useMemo(() => {
        if (left === null || right === null) return processedData;
        return processedData.filter(d => {
            const t = d.Time;
            if (typeof t !== 'number') return false;
            return t >= left && t <= right;
        });
    }, [processedData, left, right]);

    const chartData = React.useMemo(() => {
        if (viewData.length < 2000) return viewData;
        const factor = Math.ceil(viewData.length / 2000);
        return viewData.filter((_, i) => i % factor === 0);
    }, [viewData]);

    const { activeUnits, uniqueUnits } = React.useMemo(() => {
        const active: Record<string, string> = {};
        const unique = new Set<string>();

        selectedSafeSeries.forEach(safeKey => {
            const originalHeader = headerMap[safeKey];
            const detected = detectUnit(originalHeader);
            const unit = detected?.unit || "val";

            active[safeKey] = unit;
            unique.add(unit);
        });

        return {
            activeUnits: active,
            uniqueUnits: Array.from(unique).sort()
        };
    }, [selectedSafeSeries, headerMap]);

    const stableColors = React.useMemo(() => {
        return generateColors(safeHeaders.length);
    }, [safeHeaders.length]);

    const stats = React.useMemo(() => {
        const statsObj: Record<string, { min: number; max: number; avg: number; minPoint: Record<string, number | string | null> | null; maxPoint: Record<string, number | string | null> | null }> = {};

        selectedSafeSeries.forEach((safeKey) => {
            statsObj[safeKey] = calculateStats(viewData, safeKey);
        });

        return statsObj;
    }, [viewData, selectedSafeSeries]);

    const minMaxTimes = React.useMemo(() => {
        const times = new Set<number>();
        selectedSafeSeries.forEach((safeKey) => {
            const stat = stats[safeKey];
            if (stat?.minPoint?.Time && typeof stat.minPoint.Time === 'number') {
                times.add(stat.minPoint.Time);
            }
            if (stat?.maxPoint?.Time && typeof stat.maxPoint.Time === 'number') {
                times.add(stat.maxPoint.Time);
            }
        });
        return times;
    }, [stats, selectedSafeSeries]);

    const chartConfig = React.useMemo(() => {
        const config: ChartConfig = {};
        safeHeaders.forEach((safeKey, i) => {
            config[safeKey] = {
                label: headerMap[safeKey],
                color: stableColors[i],
            };
        });
        return config;
    }, [safeHeaders, headerMap, stableColors]);

    const zoom = React.useCallback(() => {
        if (refAreaLeft === refAreaRight || refAreaLeft === null || refAreaRight === null) {
            setRefAreaLeft(null);
            setRefAreaRight(null);
            return;
        }

        let newLeft = refAreaLeft;
        let newRight = refAreaRight;
        if (newLeft > newRight) [newLeft, newRight] = [newRight, newLeft];

        setLeft(newLeft);
        setRight(newRight);
        setRefAreaLeft(null);
        setRefAreaRight(null);
    }, [refAreaLeft, refAreaRight]);

    const zoomOut = React.useCallback(() => {
        setLeft(null);
        setRight(null);
        setRefAreaLeft(null);
        setRefAreaRight(null);
    }, []);

    const handleMouseDown = React.useCallback((e: unknown) => {
        if (e) setRefAreaLeft((e as { activeLabel: number }).activeLabel);
    }, []);

    const handleMouseMove = React.useCallback((e: unknown) => {
        if (refAreaLeft !== null && e) {
            setRefAreaRight((e as { activeLabel: number }).activeLabel);
        }
    }, [refAreaLeft]);

    return (
        <div className="flex flex-col md:flex-row h-full gap-4">
            <ChartArea
                chartData={chartData}
                chartConfig={chartConfig}
                selectedSafeSeries={selectedSafeSeries}
                activeUnits={activeUnits}
                uniqueUnits={uniqueUnits}
                minMaxTimes={minMaxTimes}
                left={left}
                right={right}
                refAreaLeft={refAreaLeft}
                refAreaRight={refAreaRight}
                zoom={zoom}
                zoomOut={zoomOut}
                handleMouseDown={handleMouseDown}
                handleMouseMove={handleMouseMove}
            />

            <ChartSidebar
                filteredHeaders={filteredHeaders}
                selectedSafeSeries={selectedSafeSeries}
                chartConfig={chartConfig}
                headerMap={headerMap}
                stats={stats}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                toggleSeries={toggleSeries}
                deselectAll={deselectAll}
                left={left}
                conversionMetadata={conversionMetadata}
            />
        </div>
    );
}

