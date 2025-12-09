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

export function Dashboard() {
    const [data, setData] = React.useState<ParsedData | null>(null);
    const searchParams = useSearchParams();

    // Custom hook for processing data and managing unit preferences
    const {
        preferences,
        setPreferences,
        setUnit,
        processedData,
        conversionMetadata
    } = useLogProcessor(data);

    const lastFetchedUrl = React.useRef<string | null>(null);

    React.useEffect(() => {
        const url = searchParams.get("url");
        if (url && url !== lastFetchedUrl.current) {
            lastFetchedUrl.current = url;
            const fetchData = async () => {
                const toastId = toast.loading("Fetching data from Bootmod3...");
                try {
                    const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch: ${response.statusText}`);
                    }
                    const csvText = await response.text();

                    Papa.parse(csvText, {
                        header: true,
                        skipEmptyLines: true,
                        dynamicTyping: true,
                        complete: (results) => {
                            if (results.errors.length > 0) {
                                console.warn("CSV Parsing errors:", results.errors);
                                if (results.data.length === 0) {
                                    toast.error("Failed to parse CSV from URL", { id: toastId });
                                    return;
                                }
                                toast.warning("CSV parsed with some warnings.", { id: toastId });
                            }

                            const headers = results.meta.fields || [];
                            const data = results.data as Record<string, number | string | null>[];

                            if (headers.length === 0 || data.length === 0) {
                                toast.error("CSV file from URL appears to be empty.", { id: toastId });
                                return;
                            }

                            // Update preferences based on file units
                            const newPreferences = { ...DEFAULT_PREFERENCES };
                            headers.forEach(header => {
                                const detected = detectUnit(header);
                                if (detected && detected.type !== "unknown") {
                                    newPreferences[detected.type] = detected.unit;
                                }
                            });
                            setPreferences(newPreferences);

                            setData({
                                fileName: "Bootmod3 Log",
                                headers,
                                data: data,
                                meta: results.meta,
                            });
                            toast.success("Log imported successfully", { id: toastId });
                        },
                        error: (err: Error) => {
                            toast.error(`Error parsing CSV: ${err.message}`, { id: toastId });
                        },
                    });
                } catch (error) {
                    console.error("Fetch error:", error);
                    toast.error("Failed to import from URL", { id: toastId });
                }
            };
            fetchData();
        }
    }, [searchParams, setPreferences]);

    const handleReset = () => {
        setData(null);
    };

    const handleCalculatePower = (rpmHeader: string, torqueHeader: string, targetUnit: string) => {
        if (!data) return;

        const newData = data.data.map(row => {
            const rpm = row[rpmHeader];
            const torque = row[torqueHeader];

            if (typeof rpm === 'number' && typeof torque === 'number') {
                // 1. Detect source units
                const torqueUnitInfo = detectUnit(torqueHeader);

                // 2. Normalize to Base Units (RPM is already base, Torque needs to be Nm)
                let torqueNm = torque;
                if (torqueUnitInfo && torqueUnitInfo.type === 'torque') {
                    // Convert to base (Nm)
                    torqueNm = convertValue(torque, 'torque', torqueUnitInfo.unit, 'Nm');
                }

                // 3. Calculate Power in kW (Base Unit)
                // Power (kW) = Torque (Nm) * RPM / 9549
                const powerKw = (torqueNm * rpm) / 9549;

                // 4. Convert kW to Target Unit
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
                <FileUpload onDataParsed={setData} />
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
            />

            <main className="flex-1 overflow-hidden p-4 bg-muted/20">
                <ChartView data={processedData} conversionMetadata={conversionMetadata} />
            </main>
        </div>
    );
}
