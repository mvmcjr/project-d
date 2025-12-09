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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegendContent
} from "@/components/ui/chart";
import { CustomDot } from "./custom-dot";

interface ChartAreaProps {
    chartData: Record<string, number | string | null>[];
    chartConfig: ChartConfig;
    selectedSafeSeries: string[];
    activeUnits: Record<string, string>;
    uniqueUnits: string[];
    minMaxTimes: Set<number>;
    left: number | null;
    right: number | null;
    refAreaLeft: number | null;
    refAreaRight: number | null;
    zoom: () => void;
    zoomOut: () => void;
    handleMouseDown: (e: unknown) => void;
    handleMouseMove: (e: unknown) => void;
}

export function ChartArea({
    chartData,
    chartConfig,
    selectedSafeSeries,
    activeUnits,
    uniqueUnits,
    minMaxTimes,
    left,
    right,
    refAreaLeft,
    refAreaRight,
    zoom,
    zoomOut,
    handleMouseDown,
    handleMouseMove
}: ChartAreaProps) {
    return (
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
                        data={chartData}
                        margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
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

                        {/* Dynamically render Y-Axes based on active units */}
                        {uniqueUnits.map((unit, index) => (
                            <YAxis
                                key={unit}
                                yAxisId={unit}
                                orientation={index % 2 === 0 ? "left" : "right"}
                                tickLine={false}
                                axisLine={true}
                                width={40}
                                tickFormatter={(val) => typeof val === 'number' ?
                                    val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0) : val}
                                domain={['auto', 'auto']}
                                label={{
                                    value: unit,
                                    angle: -90,
                                    position: index % 2 === 0 ? 'insideLeft' : 'insideRight',
                                    style: { textAnchor: 'middle', fill: 'var(--muted-foreground)', fontSize: 10 }
                                }}
                            />
                        ))}

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
                                    formatter={(value) => {
                                        if (value === null) return "";
                                        return typeof value === 'number'
                                            ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                            : value;
                                    }}
                                />
                            }
                        />
                        <Legend content={<ChartLegendContent />} verticalAlign="top" />
                        {selectedSafeSeries.map((s) => (
                            <Line
                                key={s}
                                yAxisId={activeUnits[s]}
                                type="monotone"
                                dataKey={s}
                                stroke={`var(--color-${s})`}
                                strokeWidth={2}
                                dot={<CustomDot minMaxTimes={minMaxTimes} />}
                                activeDot={{ r: 6 }}
                                isAnimationActive={false}
                            />
                        ))}
                        {refAreaLeft !== null && refAreaRight !== null && (
                            <ReferenceArea yAxisId={uniqueUnits[0]} x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="hsl(var(--foreground))" fillOpacity={0.1} />
                        )}
                    </LineChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
