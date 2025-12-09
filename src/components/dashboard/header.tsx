"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Settings, Check, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { VirtualDynoDialog } from "@/components/virtual-dyno-dialog";
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
import { UnitPreferences } from "@/hooks/use-log-processor";
import { UnitType, UNITS } from "@/lib/conversions";

interface DashboardHeaderProps {
    fileName: string;
    preferences: UnitPreferences;
    setUnit: (type: UnitType, unit: string) => void;
    onReset: () => void;
    dataHeaders: string[];
    onCalculatePower: (rpmHeader: string, torqueHeader: string, targetUnit: string) => void;
}

export function DashboardHeader({
    fileName,
    preferences,
    setUnit,
    onReset,
    dataHeaders,
    onCalculatePower
}: DashboardHeaderProps) {
    const { setTheme, theme } = useTheme();

    return (
        <header className="border-b bg-background/95 backdrop-blur z-50">
            <div className="container flex h-14 items-center justify-between px-4">
                <div className="flex items-center gap-2 font-bold text-lg">
                    <span className="hidden sm:inline bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent italic">Project D</span>
                    <span className="font-normal text-muted-foreground text-sm border-l pl-2 ml-2 truncate max-w-[200px]">
                        {fileName}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <VirtualDynoDialog
                        channels={dataHeaders}
                        onCalculate={onCalculatePower}
                    />
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

                    <Button variant="ghost" size="sm" onClick={onReset}>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Reset
                    </Button>
                </div>
            </div>
        </header>
    );
}
