"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, AlertTriangle, ArrowRightLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChartConfig } from "@/components/ui/chart";
import { ConversionSchema } from "@/lib/types";

export interface ChartSidebarProps {
    filteredHeaders: string[];
    selectedSafeSeries: string[];
    chartConfig: ChartConfig;
    headerMap: Record<string, string>;
    stats: Record<string, { min: number; max: number; avg: number; minPoint: Record<string, number | string | null> | null; maxPoint: Record<string, number | string | null> | null }>;
    searchQuery: string;
    setSearchQuery: (value: string) => void;
    toggleSeries: (safeKey: string) => void;
    deselectAll: () => void;
    left: number | null;
    conversionMetadata: Record<string, ConversionSchema>;
}

export const ChartSidebar = React.memo(function ChartSidebar({
    filteredHeaders,
    selectedSafeSeries,
    chartConfig,
    headerMap,
    stats,
    searchQuery,
    setSearchQuery,
    toggleSeries,
    deselectAll,
    left,
    conversionMetadata,
}: ChartSidebarProps) {
    return (
        <div className="w-full md:w-80 flex-shrink-0 flex flex-col h-[300px] md:h-full">
            <Card className="h-full flex flex-col border-none md:border shadow-sm">
                <CardHeader className="py-4 px-4 sticky top-0 bg-card z-10 border-b space-y-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">Data Channels</CardTitle>

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

                    <div className="flex items-center justify-between">
                        <CardDescription className="text-xs">
                            {selectedSafeSeries.length} selected
                        </CardDescription>
                        {selectedSafeSeries.length > 0 && (
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-muted-foreground hover:text-destructive" onClick={deselectAll}>
                                Deselect All
                            </Button>
                        )}
                    </div>

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

                                    // Get conversion info using original full header name from map
                                    const currentHeader = headerMap[safeKey];
                                    const convInfo = conversionMetadata[currentHeader];

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
                                                            className={`text-sm font-medium leading-none cursor-pointer flex items-center gap-2 ${isSelected ? "" : "text-muted-foreground"}`}
                                                            style={{ color: isSelected ? color : undefined }}
                                                        >
                                                            {headerMap[safeKey]}
                                                            {convInfo?.hasError && (
                                                                <span title="Conversion Failed">
                                                                    <AlertTriangle className="h-3 w-3 text-destructive" />
                                                                </span>
                                                            )}
                                                            {convInfo?.isConverted && !convInfo.hasError && (
                                                                <span title={`Converted from ${convInfo.originalUnit}`}>
                                                                    <ArrowRightLeft className="h-3 w-3 text-muted-foreground opacity-70" />
                                                                </span>
                                                            )}
                                                        </Label>
                                                    </div>

                                                    {convInfo?.isConverted && (
                                                        <div className="text-[10px] text-muted-foreground pl-0.5">
                                                            Original: {convInfo.originalUnit} → {convInfo.targetUnit}
                                                        </div>
                                                    )}

                                                    {/* Stats Grid - Only show if stats are available for this series */}
                                                    {stat && (
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
                                                    )}
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
    );
});
