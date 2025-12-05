"use client";

import * as React from "react";
import { FileUpload } from "@/components/file-upload";
import { ParsedData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Settings, Check, Moon, Sun } from "lucide-react";
import { ChartView } from "@/components/chart-view";
import { useTheme } from "next-themes";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { UNITS, detectUnit, convertValue, UnitType } from "@/lib/conversions";

type UnitPreferences = Record<UnitType, string>;

const DEFAULT_PREFERENCES: UnitPreferences = {
    pressure: "psig",
    speed: "mph",
    temperature: "F",
    afr: "AFR",
    torque: "Nm",
    unknown: "",
};

export function Dashboard() {
    const [data, setData] = React.useState<ParsedData | null>(null);
    const [preferences, setPreferences] = React.useState<UnitPreferences>(DEFAULT_PREFERENCES);
    const { setTheme, theme } = useTheme();

    const handleReset = () => {
        setData(null);
    };

    const setUnit = (type: UnitType, unit: string) => {
        setPreferences((prev) => ({ ...prev, [type]: unit }));
    };

    // Process data with conversions
    const processedData = React.useMemo(() => {
        if (!data) return null;

        const newHeaders = data.headers.map(header => {
            const detected = detectUnit(header);
            if (detected && detected.type !== "unknown") {
                const targetUnit = preferences[detected.type];
                if (targetUnit && targetUnit !== detected.unit) {
                    return header.replace(`[${detected.unit}]`, `[${targetUnit}]`);
                }
            }
            return header;
        });

        const newData = data.data.map(row => {
            const newRow: Record<string, any> = {};
            data.headers.forEach((header, index) => {
                const value = row[header];
                const newHeader = newHeaders[index];
                const detected = detectUnit(header);

                if (detected && detected.type !== "unknown" && typeof value === 'number') {
                    const targetUnit = preferences[detected.type];
                    if (targetUnit) {
                        newRow[newHeader] = convertValue(value, detected.type, detected.unit, targetUnit);
                        return;
                    }
                }
                newRow[newHeader] = value;
            });
            return newRow;
        });

        return {
            ...data,
            headers: newHeaders,
            data: newData,
        };
    }, [data, preferences]);

    if (!processedData) {
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
            <header className="border-b bg-background/95 backdrop-blur z-50">
                <div className="container flex h-14 items-center justify-between px-4">
                    <div className="flex items-center gap-2 font-bold text-lg">
                        <span className="hidden sm:inline bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent italic">Project D</span>
                        <span className="font-normal text-muted-foreground text-sm border-l pl-2 ml-2 truncate max-w-[200px]">
                            {processedData.fileName}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Settings className="mr-2 h-4 w-4" />
                                    Units
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Unit Preferences</DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                        Pressure ({preferences.pressure})
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                        {Object.values(UNITS.pressure).map((u) => (
                                            <DropdownMenuItem key={u.label} onClick={() => setUnit("pressure", u.label)}>
                                                {u.label}
                                                {preferences.pressure === u.label && <Check className="ml-auto h-4 w-4" />}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>

                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                        Speed ({preferences.speed})
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                        {Object.values(UNITS.speed).map((u) => (
                                            <DropdownMenuItem key={u.label} onClick={() => setUnit("speed", u.label)}>
                                                {u.label}
                                                {preferences.speed === u.label && <Check className="ml-auto h-4 w-4" />}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>

                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                        Temperature ({preferences.temperature})
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                        {Object.values(UNITS.temperature).map((u) => (
                                            <DropdownMenuItem key={u.label} onClick={() => setUnit("temperature", u.label)}>
                                                {u.label}
                                                {preferences.temperature === u.label && <Check className="ml-auto h-4 w-4" />}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>

                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                        AFR ({preferences.afr})
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                        {Object.values(UNITS.afr).map((u) => (
                                            <DropdownMenuItem key={u.label} onClick={() => setUnit("afr", u.label)}>
                                                {u.label}
                                                {preferences.afr === u.label && <Check className="ml-auto h-4 w-4" />}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>

                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                        Torque ({preferences.torque})
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                        {Object.values(UNITS.torque).map((u) => (
                                            <DropdownMenuItem key={u.label} onClick={() => setUnit("torque", u.label)}>
                                                {u.label}
                                                {preferences.torque === u.label && <Check className="ml-auto h-4 w-4" />}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                            <span className="sr-only">Toggle theme</span>
                        </Button>

                        <Button variant="ghost" size="sm" onClick={handleReset}>
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Reset
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-hidden p-4 bg-muted/20">
                <ChartView data={processedData} />
            </main>
        </div>
    );
}
