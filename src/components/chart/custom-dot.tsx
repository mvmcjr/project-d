"use client";

import * as React from "react";

export type DotType = 'global' | 'peak' | 'valley';

export interface CustomDotProps {
    cx: number;
    cy: number;
    stroke: string;
    payload: { Time: number };
    /** Times of global min/max points (from sidebar stats) */
    globalMinMaxTimes: Set<number>;
    /** Times of local peak points */
    peakTimes: Set<number>;
    /** Times of local valley points */
    valleyTimes: Set<number>;
    /** The data key this dot represents */
    dataKey: string;
}

/**
 * CustomDot renders visual markers for significant data points:
 * - Global Min/Max: Larger (r=5) with white stroke ring - matches sidebar stats
 * - Local Peaks: Medium (r=3) upward triangle indicator
 * - Local Valleys: Medium (r=3) downward triangle indicator
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CustomDot = (props: any) => {
    const { cx, cy, stroke, payload, globalMinMaxTimes, peakTimes, valleyTimes } = props as CustomDotProps;
    const time = payload?.Time;

    if (time === undefined) return null;

    // Priority: Global min/max takes precedence over local peaks/valleys
    const isGlobal = globalMinMaxTimes?.has(time);
    const isPeak = peakTimes?.has(time);
    const isValley = valleyTimes?.has(time);

    if (isGlobal) {
        // Global min/max: Larger circle with prominent white ring
        return (
            <circle
                cx={cx}
                cy={cy}
                r={5}
                fill={stroke}
                stroke="white"
                strokeWidth={2.5}
            />
        );
    }

    if (isPeak) {
        // Local peak: Small diamond shape pointing up
        return (
            <polygon
                points={`${cx},${cy - 4} ${cx + 3},${cy + 2} ${cx - 3},${cy + 2}`}
                fill={stroke}
                stroke="white"
                strokeWidth={1}
            />
        );
    }

    if (isValley) {
        // Local valley: Small diamond shape pointing down
        return (
            <polygon
                points={`${cx},${cy + 4} ${cx + 3},${cy - 2} ${cx - 3},${cy - 2}`}
                fill={stroke}
                stroke="white"
                strokeWidth={1}
            />
        );
    }

    return null;
};
