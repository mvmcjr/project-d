"use client";

import * as React from "react";

export interface CustomDotProps {
    cx: number;
    cy: number;
    stroke: string;
    payload: { Time: number };
    minMaxTimes: Set<number>;
}

// OPTIMIZATION: Optimized CustomDot - uses pre-calculated Set for O(1) lookup
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CustomDot = (props: any) => {
    const { cx, cy, stroke, payload, minMaxTimes } = props as CustomDotProps;

    if (minMaxTimes && minMaxTimes.has(payload.Time)) {
        return (
            <circle cx={cx} cy={cy} r={4} fill={stroke} stroke="white" strokeWidth={2} />
        );
    }
    return null;
};
