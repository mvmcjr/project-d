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
    ReferenceLine,
} from "recharts";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Card, CardContent } from "@/components/ui/card";
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegendContent
} from "@/components/ui/chart";
import { CustomDot } from "./custom-dot";
import { GraphPin } from "./graph-pin";
import { SyncedTooltip } from "./synced-tooltip";

interface ChartAreaProps {
    chartData: Record<string, number | string | null>[];
    chartConfig: ChartConfig;
    selectedSafeSeries: string[];
    activeUnits: Record<string, string>;
    uniqueUnits: string[];
    /** Times of global min/max points (from sidebar stats) */
    globalMinMaxTimes: Set<number>;
    /** Per-channel peak times */
    peakTimesMap: Map<string, Set<number>>;
    /** Per-channel valley times */
    valleyTimesMap: Map<string, Set<number>>;
    left: number | null;
    right: number | null;
    refAreaLeft: number | null;
    refAreaRight: number | null;
    zoom: () => void;
    zoomOut: () => void;
    handleMouseDown: (e: unknown) => void;
    handleMouseMove: (e: unknown) => void;
    pins: number[];
    onAddPin: (time: number) => void;
    onRemovePin: (time: number) => void;
    onHoverTimeChange?: (time: number | null) => void;
    /** Synced hover time from another tab (for visual reference line) */
    syncedHoverTime?: number | null;
}

export function ChartArea({
    chartData,
    chartConfig,
    selectedSafeSeries,
    activeUnits,
    uniqueUnits,
    globalMinMaxTimes,
    peakTimesMap,
    valleyTimesMap,
    left,
    right,
    refAreaLeft,
    refAreaRight,
    zoom,
    zoomOut,
    handleMouseDown,
    handleMouseMove,
    pins,
    onAddPin,
    onRemovePin,
    onHoverTimeChange,
    syncedHoverTime
}: ChartAreaProps) {
    const lastActiveTimeRef = React.useRef<number | null>(null);

    const handleChartMouseMove = (e: any) => {
        handleMouseMove(e);
        if (e && e.activeLabel !== undefined) {
            lastActiveTimeRef.current = e.activeLabel;
            onHoverTimeChange?.(e.activeLabel);
        } else {
            onHoverTimeChange?.(null);
        }
    };

    const handleChartMouseDown = (e: any) => {
        console.log("MouseDown Event:", e);

        if (e && e.activeLabel !== undefined) {
            lastActiveTimeRef.current = e.activeLabel;
        }
        handleMouseDown(e);
    };

    return (
        <Card className="flex-1 flex flex-col h-full border-none shadow-none bg-transparent min-h-[400px]">
            <ContextMenu>
                <CardContent className="flex-1 p-0 relative group">
                    <div className="absolute top-2 right-2 z-20">
                    </div>

                    <ContextMenuTrigger className="h-full w-full block">
                        <ChartContainer config={chartConfig} className="aspect-auto h-full w-full select-none">
                            <LineChart
                                data={chartData}
                                margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                                onMouseDown={handleChartMouseDown}
                                onMouseMove={handleChartMouseMove}
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
                                        activeDot={{ r: 6 }}
                                        isAnimationActive={false}
                                        dot={(props: any) => {
                                            const { cx, cy, payload, value } = props;
                                            const time = payload?.Time;

                                            // 1. Render Pin if present (highest priority)
                                            if (pins.includes(time)) {
                                                const pinIndex = pins.indexOf(time);
                                                let prevValue: number | undefined;
                                                if (pinIndex > 0) {
                                                    const prevTime = pins[pinIndex - 1];
                                                    const prevPoint = chartData.find(d => d.Time === prevTime);
                                                    if (prevPoint) prevValue = Number(prevPoint[s]);
                                                }

                                                return (
                                                    <GraphPin
                                                        key={`${time}-${s}`}
                                                        cx={cx}
                                                        cy={cy}
                                                        value={value}
                                                        prevValue={prevValue}
                                                        color={`var(--color-${s})`}
                                                    />
                                                );
                                            }

                                            // 2. Check for any dot type (global, peak, or valley)
                                            const peakTimes = peakTimesMap.get(s) || new Set<number>();
                                            const valleyTimes = valleyTimesMap.get(s) || new Set<number>();
                                            const isGlobal = globalMinMaxTimes.has(time);
                                            const isPeak = peakTimes.has(time);
                                            const isValley = valleyTimes.has(time);

                                            if (isGlobal || isPeak || isValley) {
                                                return (
                                                    <CustomDot
                                                        {...props}
                                                        globalMinMaxTimes={globalMinMaxTimes}
                                                        peakTimes={peakTimes}
                                                        valleyTimes={valleyTimes}
                                                        dataKey={s}
                                                    />
                                                );
                                            }

                                            return null;
                                        }}
                                    />
                                ))}

                                {/* Render Pin Lines (Vertical References) */}
                                {pins.map((pinTime) => (
                                    <ReferenceArea
                                        key={`line-${pinTime}`}
                                        x1={pinTime}
                                        x2={pinTime}
                                        stroke="#3b82f6"
                                        strokeOpacity={1}
                                        yAxisId={uniqueUnits[0]}
                                        ifOverflow="extendDomain"
                                    />
                                ))}


                                {refAreaLeft !== null && refAreaRight !== null && (
                                    <ReferenceArea yAxisId={uniqueUnits[0]} x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="hsl(var(--foreground))" fillOpacity={0.1} />
                                )}

                                {/* Synced Hover Line with Tooltip from another tab */}
                                {syncedHoverTime !== null && syncedHoverTime !== undefined && (
                                    <ReferenceLine
                                        x={syncedHoverTime}
                                        yAxisId={uniqueUnits[0]}
                                        stroke="#f97316"
                                        strokeWidth={2}
                                        strokeDasharray="4 4"
                                        ifOverflow="extendDomain"
                                        label={
                                            <SyncedTooltip
                                                syncedTime={syncedHoverTime}
                                                chartData={chartData}
                                                selectedSeries={selectedSafeSeries}
                                                chartConfig={chartConfig}
                                            />
                                        }
                                    />
                                )}
                            </LineChart>
                        </ChartContainer>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                        {lastActiveTimeRef.current !== null && pins.includes(lastActiveTimeRef.current) ? (
                            <ContextMenuItem onClick={() => {
                                if (lastActiveTimeRef.current !== null) {
                                    onRemovePin(lastActiveTimeRef.current);
                                }
                            }}>
                                Remove Pin
                            </ContextMenuItem>
                        ) : (
                            <ContextMenuItem onClick={() => {
                                if (lastActiveTimeRef.current !== null) {
                                    onAddPin(lastActiveTimeRef.current);
                                }
                            }}>
                                Add Pin
                            </ContextMenuItem>
                        )}
                    </ContextMenuContent>
                </CardContent>
            </ContextMenu>
        </Card>
    );
}
