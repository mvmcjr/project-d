import * as React from "react";
import { ParsedData, ConversionSchema } from "@/lib/types";
import { calculateStats } from "@/lib/stats";
import { detectPeaksAndValleys } from "@/lib/peaks";
import { generateColors } from "@/lib/utils";
import { detectUnit } from "@/lib/conversions";
import { findPullStart, applyTimeOffset } from "@/lib/sync-utils";
import { useBroadcastSync } from "@/hooks/use-broadcast-sync";
import { ChartConfig } from "@/components/ui/chart";
import { toast } from "sonner";
import { SmartZoomCriteria } from "@/components/chart/smart-zoom-dialog";

// Helper to sanitize keys for CSS variables
const sanitizeKey = (key: string) => key.replace(/[^a-zA-Z0-9]/g, "_");

export function useChartState(data: ParsedData | null, conversionMetadata: Record<string, ConversionSchema> = {}) {
    // 1. Sanitize Data & Headers
    const { processedData, headerMap, originalToSafe, safeHeaders } = React.useMemo(() => {
        if (!data) return { processedData: [], headerMap: {}, originalToSafe: {}, safeHeaders: [] };

        const safeMap: Record<string, string> = { "Time": "Time" };
        const reverseMap: Record<string, string> = { "Time": "Time" };
        const numeric: string[] = [];
        const usedKeys = new Set<string>();
        usedKeys.add("Time");

        data.headers.forEach((h, index) => {
            if (h === "Time") return;

            // Generate stable key by stripping units (e.g. "Boost [psi]" -> "Boost")
            const base = h.replace(/\s*\[[^\]]*\]$/, '');
            let safe = sanitizeKey(base);

            // Handle duplicates
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

        return { processedData: newData, headerMap: reverseMap, originalToSafe: safeMap, safeHeaders: numeric };
    }, [data]);

    const [selectedSafeSeries, setSelectedSafeSeries] = React.useState<string[]>([]);
    const [pins, setPins] = React.useState<number[]>([]);
    const [left, setLeft] = React.useState<number | null>(null);
    const [right, setRight] = React.useState<number | null>(null);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [hoveredTime, setHoveredTime] = React.useState<number | null>(null);
    const [syncedHoverTime, setSyncedHoverTime] = React.useState<number | null>(null);
    const [showDataTable, setShowDataTable] = React.useState(false);

    // Compare Mode State
    const [isCompareMode, setIsCompareMode] = React.useState(false);
    const [timeOffset, setTimeOffset] = React.useState(0);
    const [compareChannelName] = React.useState("project-d-sync");

    // Track previous headers to detect new additions
    const prevSafeHeadersRef = React.useRef<string[]>([]);

    const filteredHeaders = React.useMemo(() => {
        if (!searchQuery) return safeHeaders;
        return safeHeaders.filter(safeKey =>
            headerMap[safeKey].toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [safeHeaders, headerMap, searchQuery]);

    // Sync Hook
    const { broadcastHover, broadcastZoom, broadcastSelection } = useBroadcastSync({
        channelName: compareChannelName,
        enabled: isCompareMode,
        onHover: (time) => {
            setSyncedHoverTime(time);
        },
        onZoom: (l, r) => {
            setLeft(l);
            setRight(r);
        },
        onSelection: (selection) => {
            const validSelection = selection.filter(key => safeHeaders.includes(key));
            setSelectedSafeSeries(validSelection);
        }
    });

    // Broadcast selection changes
    React.useEffect(() => {
        if (isCompareMode) {
            broadcastSelection(selectedSafeSeries);
        }
    }, [selectedSafeSeries, isCompareMode, broadcastSelection]);

    const handleEnableCompare = (rpmKey: string, pedalKey: string) => {
        const safeRpmKey = originalToSafe[rpmKey];
        const safePedalKey = originalToSafe[pedalKey];

        if (!safeRpmKey || !safePedalKey) {
            toast.error(`Invalid channel selected. RPM: ${safeRpmKey ? 'OK' : 'Not found'}, Pedal: ${safePedalKey ? 'OK' : 'Not found'}`);
            return;
        }

        const { offset, maxPedal } = findPullStart(processedData, safePedalKey, safeRpmKey);
        if (offset !== null) {
            setTimeOffset(offset);
            setIsCompareMode(true);
            toast.success(`Compare Mode Enabled. Time offset: ${offset.toFixed(2)}s`);
            broadcastSelection(selectedSafeSeries);
        } else {
            toast.error(`Could not detect pull start (Pedal > 95%). Max detected: ${maxPedal.toFixed(1)}%`);
        }
    };

    const handleDisableCompare = () => {
        setIsCompareMode(false);
        setTimeOffset(0);
        toast.info("Compare Mode Disabled");
    };

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

    const selectAll = React.useCallback(() => {
        setSelectedSafeSeries(prev => {
            const newSelection = new Set([...prev, ...filteredHeaders]);
            return Array.from(newSelection);
        });
    }, [filteredHeaders]);

    const addPin = React.useCallback((time: number) => {
        setPins(prev => {
            if (prev.includes(time)) return prev;
            return [...prev, time].sort((a, b) => a - b);
        });
    }, []);

    const removePin = React.useCallback((time: number) => {
        setPins(prev => prev.filter(t => t !== time));
    }, []);

    const viewData = React.useMemo(() => {
        let dataToView = processedData;
        if (isCompareMode && timeOffset !== 0) {
            dataToView = applyTimeOffset(processedData, timeOffset);
        }
        if (left === null || right === null) return dataToView;

        return dataToView.filter(d => {
            const t = d.Time;
            if (typeof t !== 'number') return false;
            return t >= left && t <= right;
        });
    }, [processedData, left, right, isCompareMode, timeOffset]);

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
        return { activeUnits: active, uniqueUnits: Array.from(unique).sort() };
    }, [selectedSafeSeries, headerMap]);

    const stableColors = React.useMemo(() => {
        return generateColors(safeHeaders.length);
    }, [safeHeaders.length]);

    const stats = React.useMemo(() => {
        const statsObj: Record<string, any> = {};
        selectedSafeSeries.forEach((safeKey) => {
            statsObj[safeKey] = calculateStats(viewData, safeKey);
        });
        return statsObj;
    }, [viewData, selectedSafeSeries]);

    const globalMinMaxTimes = React.useMemo(() => {
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

    const { peakTimesMap, valleyTimesMap } = React.useMemo(() => {
        const peaks = new Map<string, Set<number>>();
        const valleys = new Map<string, Set<number>>();
        selectedSafeSeries.forEach((safeKey) => {
            const result = detectPeaksAndValleys(viewData, safeKey, 5);
            peaks.set(safeKey, result.peakTimes);
            valleys.set(safeKey, result.valleyTimes);
        });
        return { peakTimesMap: peaks, valleyTimesMap: valleys };
    }, [viewData, selectedSafeSeries]);

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

    const exportToCSV = React.useCallback(() => {
        if (!viewData.length) return;
        try {
            const headers = ["Time", ...selectedSafeSeries];
            const readableHeaders = ["Time (s)", ...selectedSafeSeries.map(s => headerMap[s])];
            const csvRows = [
                readableHeaders.join(","),
                ...viewData.map(row =>
                    headers.map(h => {
                        const val = row[h];
                        return typeof val === 'number' ? val.toFixed(4) : `"${val}"`;
                    }).join(",")
                )
            ];
            const csvContent = csvRows.join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `log_export_${new Date().getTime()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("CSV exported successfully");
        } catch (error) {
            console.error("Export failed:", error);
            toast.error("Failed to export CSV");
        }
    }, [viewData, selectedSafeSeries, headerMap]);

    const zoom = React.useCallback((newLeft: number, newRight: number) => {
        if (newLeft > newRight) [newLeft, newRight] = [newRight, newLeft];
        setLeft(newLeft);
        setRight(newRight);
        broadcastZoom(newLeft, newRight);
    }, [broadcastZoom]);

    const zoomOut = React.useCallback(() => {
        setLeft(null);
        setRight(null);
        broadcastZoom(null, null);
    }, [broadcastZoom]);

    const handleSmartZoom = React.useCallback((criteria: SmartZoomCriteria) => {
        const safeKey = Object.keys(headerMap).find(k => headerMap[k] === criteria.field);
        if (!safeKey) return;

        const segments: { start: number; end: number; duration: number }[] = [];
        let currentStart: number | null = null;
        let lastMatchIndex = -1;

        for (let i = 0; i < processedData.length; i++) {
            const row = processedData[i];
            const val = row[safeKey];
            const time = row.Time;
            if (typeof val !== 'number' || typeof time !== 'number') continue;
            let matches = false;
            switch (criteria.operator) {
                case '>': matches = val >= criteria.value; break;
                case '<': matches = val <= criteria.value; break;
                case '=': matches = Math.abs(val - criteria.value) < 0.001; break;
            }
            if (matches) {
                if (currentStart === null) currentStart = time;
                lastMatchIndex = i;
            } else {
                if (currentStart !== null) {
                    const endTime = Number(processedData[lastMatchIndex].Time);
                    segments.push({ start: currentStart, end: endTime, duration: endTime - currentStart });
                    currentStart = null;
                }
            }
        }
        if (currentStart !== null && lastMatchIndex !== -1) {
            const endTime = Number(processedData[lastMatchIndex].Time);
            segments.push({ start: currentStart, end: endTime, duration: endTime - currentStart });
        }

        if (segments.length > 0) {
            segments.sort((a, b) => b.duration - a.duration);
            const best = segments[0];
            const padding = Math.max(best.duration * 0.1, 0.5);
            setLeft(Math.max(0, best.start - padding));
            setRight(best.end + padding);
            if (!selectedSafeSeries.includes(safeKey)) {
                toggleSeries(safeKey);
            }
        }
    }, [processedData, headerMap, selectedSafeSeries, toggleSeries]);

    return {
        processedData,
        headerMap,
        originalToSafe,
        safeHeaders,
        selectedSafeSeries,
        setSelectedSafeSeries,
        filteredHeaders,
        pins,
        addPin,
        removePin,
        left,
        right,
        zoom,
        zoomOut,
        searchQuery,
        setSearchQuery,
        hoveredTime,
        setHoveredTime,
        syncedHoverTime,
        showDataTable,
        setShowDataTable,
        isCompareMode,
        timeOffset,
        handleEnableCompare,
        handleDisableCompare,
        toggleSeries,
        deselectAll,
        selectAll,
        viewData,
        chartData,
        activeUnits,
        uniqueUnits,
        stableColors,
        stats,
        globalMinMaxTimes,
        peakTimesMap,
        valleyTimesMap,
        chartConfig,
        exportToCSV,
        broadcastHover,
        handleSmartZoom
    };
}
