import React from "react";
import { MapPin } from "lucide-react";

interface GraphPinProps {
    cx?: number;
    cy?: number;
    value?: number | string;
    payload?: { Time: number;[key: string]: any };
    dataKey?: string;
    prevValue?: number;
    index?: number;
    color?: string;
}

export const GraphPin = ({ cx, cy, value, prevValue, color }: GraphPinProps) => {
    if (cx === undefined || cy === undefined || value === undefined) return null;

    const valNum = Number(value);
    const prevNum = prevValue !== undefined ? Number(prevValue) : undefined;

    let deltaStr = "";
    let deltaColor = "fill-muted-foreground";

    if (prevNum !== undefined && prevNum !== 0) {
        const delta = ((valNum - prevNum) / prevNum) * 100;
        const sign = delta > 0 ? "+" : "";
        deltaStr = `${sign}${delta.toFixed(1)}%`;
        deltaColor = delta > 0 ? "fill-green-500" : delta < 0 ? "fill-red-500" : "fill-muted-foreground";
    }

    return (
        <g>
            {/* White circle background to make icon pop */}
            <circle cx={cx} cy={cy} r={8} fill="white" stroke={color} strokeWidth={2} />

            {/* MapPin Icon centered */}
            <foreignObject x={cx - 6} y={cy - 6} width={12} height={12}>
                <MapPin size={12} color={color} fill={color} />
            </foreignObject>

            <text x={cx + 12} y={cy} dy={4} className="text-[12px] font-bold fill-foreground" style={{ textShadow: "0px 0px 4px rgba(255,255,255,0.8)" }}>
                {typeof value === 'number' ? value.toFixed(2) : value}
                {deltaStr && <tspan dx={5} className={deltaColor} fontWeight="bold">{deltaStr}</tspan>}
            </text>
        </g>
    );
};
