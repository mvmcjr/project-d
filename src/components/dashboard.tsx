"use client";

import * as React from "react";
import { FileUpload } from "@/components/file-upload";
import { ParsedData } from "@/lib/types";
import { ChartView } from "@/components/chart-view";
import { useSearchParams } from "next/navigation";
import Papa from "papaparse";
import { toast } from "sonner";
import { detectUnit, convertValue } from "@/lib/conversions";
import { useLogProcessor, DEFAULT_PREFERENCES } from "@/hooks/use-log-processor";
import { DashboardHeader } from "@/components/dashboard/header";
import { useChartState } from "@/hooks/use-chart-state";
import { useRecentLogs, getRecentCsv } from "@/hooks/use-recent-logs";
import { RecentLogs } from "@/components/recent-logs";
import { RecentLog } from "@/lib/types";

export function Dashboard() {
    const [data, setData] = React.useState<ParsedData | null>(null);
    const searchParams = useSearchParams();

    const { recentLogs, addRecentLog, removeRecentLog, clearRecentLogs } = useRecentLogs();

    // Custom hook for processing data and managing unit preferences
    const {
        preferences,
        setPreferences,
        setUnit,
        processedData,
        conversionMetadata
    } = useLogProcessor(data);

    // Initialize Chart State using processedData
    const chartState = useChartState(processedData, conversionMetadata);

    const lastFetchedUrl = React.useRef<string | null>(null);

    /** Parse a CSV string and load it as the active dataset. Returns the parsed data or null on failure. */
    const loadFromCsv = React.useCallback((csvText: string, fileName: string): Promise<ParsedData | null> => {
        return new Promise((resolve) => {
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
                complete: (results) => {
                    const headers = results.meta.fields || [];
                    const rows = results.data as Record<string, number | string | null>[];

                    if (headers.length === 0 || rows.length === 0) {
                        resolve(null);
                        return;
                    }

                    const newPreferences = { ...DEFAULT_PREFERENCES };
                    headers.forEach(header => {
                        const detected = detectUnit(header);
                        if (detected && detected.type !== "unknown") {
                            newPreferences[detected.type] = detected.unit;
                        }
                    });
                    setPreferences(newPreferences);

                    const parsed: ParsedData = { fileName, headers, data: rows, meta: results.meta };
                    setData(parsed);
                    resolve(parsed);
                },
                error: () => resolve(null),
            });
        });
    }, [setPreferences]);

    /** Fetch a Bootmod3 URL via proxy and load it. */
    const loadFromUrl = React.useCallback(async (url: string, toastId?: string | number) => {
        const id = toastId ?? toast.loading("Fetching data from Bootmod3...");
        try {
            const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
            if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);

            const logName = response.headers.get("X-Log-Name");
            const csvText = await response.text();
            const parsed = await loadFromCsv(csvText, logName || "Bootmod3 Log");

            if (!parsed) {
                toast.error("CSV file from URL appears to be empty.", { id });
                return;
            }

            toast.success("Log imported successfully", { id });
            return { csvText, fileName: parsed.fileName, rowCount: parsed.data.length };
        } catch (error) {
            console.error("Fetch error:", error);
            toast.error("Failed to import from URL", { id });
        }
    }, [loadFromCsv]);

    React.useEffect(() => {
        const url = searchParams.get("url");
        if (url && url !== lastFetchedUrl.current) {
            lastFetchedUrl.current = url;
            loadFromUrl(url).then((result) => {
                if (result) {
                    addRecentLog({ type: "url", name: result.fileName, rowCount: result.rowCount, csvText: result.csvText, url });
                }
            });
        }
    }, [searchParams, loadFromUrl, addRecentLog]);

    const handleOpenRecent = React.useCallback(async (log: RecentLog) => {
        const toastId = toast.loading(`Opening ${log.name}…`);
        try {
            if (log.type === "url" && log.url) {
                await loadFromUrl(log.url, toastId);
                return;
            }
            // File recent — load from IndexedDB
            const csvText = await getRecentCsv(log.id);
            if (!csvText) {
                toast.error("Stored data not found. Please re-upload the file.", { id: toastId });
                return;
            }
            const parsed = await loadFromCsv(csvText, log.name);
            if (!parsed) {
                toast.error("Failed to load stored data.", { id: toastId });
                return;
            }
            toast.success(`${log.name} loaded`, { id: toastId });
        } catch {
            toast.error("Failed to open recent log.", { id: toastId });
        }
    }, [loadFromUrl, loadFromCsv]);

    const handleReset = () => {
        setData(null);
    };

    const handleCalculatePower = (rpmHeader: string, torqueHeader: string, targetUnit: string) => {
        if (!data) return;

        const newData = data.data.map(row => {
            const rpm = row[rpmHeader];
            const torque = row[torqueHeader];

            if (typeof rpm === 'number' && typeof torque === 'number') {
                const torqueUnitInfo = detectUnit(torqueHeader);

                let torqueNm = torque;
                if (torqueUnitInfo && torqueUnitInfo.type === 'torque') {
                    torqueNm = convertValue(torque, 'torque', torqueUnitInfo.unit, 'Nm');
                }

                const powerKw = (torqueNm * rpm) / 9549;
                const finalPower = convertValue(powerKw, 'power', 'kW', targetUnit);

                return { ...row, [`Power [${targetUnit}]`]: finalPower };
            }
            return row;
        });

        setData({
            ...data,
            headers: [...data.headers, `Power [${targetUnit}]`],
            data: newData
        });
    };

    if (!processedData || !data) {
        return (
            <div className="container mx-auto max-w-2xl py-20 px-4">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent italic">
                        Project D
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Vehicle Data Analysis & Visualization
                    </p>
                </div>
                <FileUpload
                    onDataParsed={setData}
                    onAddRecent={addRecentLog}
                />
                <RecentLogs
                    logs={recentLogs}
                    onOpen={handleOpenRecent}
                    onRemove={removeRecentLog}
                    onClearAll={() => clearRecentLogs(recentLogs)}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
            <DashboardHeader
                fileName={processedData.fileName}
                preferences={preferences}
                setUnit={setUnit}
                onReset={handleReset}
                dataHeaders={data.headers}
                onCalculatePower={handleCalculatePower}

                // Chart Controls
                showDataTable={chartState.showDataTable}
                setShowDataTable={chartState.setShowDataTable}
                exportToCSV={chartState.exportToCSV}
                isZoomed={chartState.left !== null || chartState.right !== null}
                onResetZoom={chartState.zoomOut}
                compareChannels={data.headers}
                isCompareMode={chartState.isCompareMode}
                onEnableCompare={chartState.handleEnableCompare}
                onDisableCompare={chartState.handleDisableCompare}
            />

            <main className="flex-1 overflow-hidden p-4 bg-muted/20">
                <ChartView
                    chartState={chartState}
                    conversionMetadata={conversionMetadata}
                />
            </main>
        </div>
    );
}
