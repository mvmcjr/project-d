"use client";

import * as React from "react";
import { ConversionSchema } from "@/lib/types";
import { ChartSidebar } from "./chart/chart-sidebar";
import { ChartArea } from "./chart/chart-area";
import { DataTable } from "./chart/data-table";
import { useChartState } from "@/hooks/use-chart-state";

interface ChartViewProps {
    chartState: ReturnType<typeof useChartState>;
    conversionMetadata?: Record<string, ConversionSchema>;
}

export function ChartView({ chartState, conversionMetadata = {} }: ChartViewProps) {
    const {
        headerMap,
        selectedSafeSeries,
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
        toggleSeries,
        deselectAll,
        selectAll,
        activeUnits,
        uniqueUnits,
        globalMinMaxTimes,
        peakTimesMap,
        valleyTimesMap,
        chartConfig,
        chartData,
        stats,
        broadcastHover,
        handleSmartZoom
    } = chartState;

    // Local state for drag selection (visual only)
    const [refAreaLeft, setRefAreaLeft] = React.useState<number | null>(null);
    const [refAreaRight, setRefAreaRight] = React.useState<number | null>(null);

    const handleZoom = React.useCallback(() => {
        if (refAreaLeft === refAreaRight || refAreaLeft === null || refAreaRight === null) {
            setRefAreaLeft(null);
            setRefAreaRight(null);
            return;
        }

        // Pass selection to global zoom handler
        zoom(refAreaLeft, refAreaRight);

        setRefAreaLeft(null);
        setRefAreaRight(null);
    }, [refAreaLeft, refAreaRight, zoom]);

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
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="flex-1 min-h-0 relative">
                    <ChartArea
                        chartData={chartData}
                        chartConfig={chartConfig}
                        selectedSafeSeries={selectedSafeSeries}
                        activeUnits={activeUnits}
                        uniqueUnits={uniqueUnits}
                        globalMinMaxTimes={globalMinMaxTimes}
                        peakTimesMap={peakTimesMap}
                        valleyTimesMap={valleyTimesMap}
                        left={left}
                        right={right}
                        refAreaLeft={refAreaLeft}
                        refAreaRight={refAreaRight}
                        zoom={handleZoom}
                        zoomOut={zoomOut}
                        handleMouseDown={handleMouseDown}
                        handleMouseMove={handleMouseMove}
                        pins={pins}
                        onAddPin={addPin}
                        onRemovePin={removePin}
                        onHoverTimeChange={(t) => {
                            setHoveredTime(t);
                            broadcastHover(t);
                        }}
                        syncedHoverTime={syncedHoverTime}
                    />
                </div>

                {showDataTable && (
                    <div className="h-1/3 min-h-[200px] border-t pt-4">
                        <DataTable
                            data={chartData}
                            selectedSafeSeries={selectedSafeSeries}
                            headerMap={headerMap}
                            hoveredTime={hoveredTime}
                        />
                    </div>
                )}
            </div>

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
                selectAll={selectAll}
                left={left}
                conversionMetadata={conversionMetadata}
                onSmartZoom={handleSmartZoom}
            />
        </div>
    );
}
