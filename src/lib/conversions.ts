export type UnitType = "pressure" | "speed" | "temperature" | "afr" | "torque" | "power" | "rpm" | "unknown";

export const UNITS = {
    // ... (rest of UNITS remains unchanged, I don't strictly need to add rpm to UNITS if I don't do conversions, but good for consistency)
    pressure: {
        psig: { label: "psig", toBase: (v: number) => v, fromBase: (v: number) => v }, // Base is psig
        bar: { label: "bar", toBase: (v: number) => v * 14.5038, fromBase: (v: number) => v * 0.0689476 },
        kPa: { label: "kPa", toBase: (v: number) => v * 0.145038, fromBase: (v: number) => v * 6.89476 },
        hPa: { label: "hPa", toBase: (v: number) => v * 0.0145038, fromBase: (v: number) => v * 68.9476 },
    },
    speed: {
        mph: { label: "mph", toBase: (v: number) => v, fromBase: (v: number) => v }, // Base is mph
        kmh: { label: "km/h", toBase: (v: number) => v * 0.621371, fromBase: (v: number) => v * 1.60934 },
    },
    temperature: {
        F: { label: "°F", toBase: (v: number) => v, fromBase: (v: number) => v }, // Base is F
        C: { label: "°C", toBase: (v: number) => (v * 9 / 5) + 32, fromBase: (v: number) => (v - 32) * 5 / 9 },
    },
    afr: {
        AFR: { label: "AFR", toBase: (v: number) => v, fromBase: (v: number) => v },
        lambda: { label: "λ", toBase: (v: number) => v * 14.7, fromBase: (v: number) => v / 14.7 }, // Assuming gas
    },
    torque: {
        Nm: { label: "Nm", toBase: (v: number) => v, fromBase: (v: number) => v },
        kgfm: { label: "kgfm", toBase: (v: number) => v * 9.80665, fromBase: (v: number) => v * 0.1019716 },
    },
    power: {
        kW: { label: "kW", toBase: (v: number) => v, fromBase: (v: number) => v }, // Base is kW
        hp: { label: "hp", toBase: (v: number) => v * 0.7457, fromBase: (v: number) => v / 0.7457 },
        cv: { label: "cv", toBase: (v: number) => v * 0.7355, fromBase: (v: number) => v / 0.7355 },
        whp: { label: "whp", toBase: (v: number) => v * 0.7457, fromBase: (v: number) => v / 0.7457 },
    },
    rpm: {
        rpm: { label: "rpm", toBase: (v: number) => v, fromBase: (v: number) => v },
    }
};

export function detectUnit(header: string): { name: string; unit: string; type: UnitType } | null {
    const match = header.match(/(.*)\[(.*)\]/);
    if (!match) return null;

    const name = match[1].trim();
    const unit = match[2].trim();

    let type: UnitType = "unknown";
    if (["psig", "psi", "hPa"].includes(unit)) type = "pressure";
    else if (["mph", "km/h"].includes(unit)) type = "speed";
    else if (["F", "C", "°F", "°C"].includes(unit)) type = "temperature";
    else if (["AFR", "Lambda", "λ"].includes(unit)) type = "afr";
    else if (["Nm", "kgfm"].includes(unit)) type = "torque";
    else if (["hp", "kW", "cv", "whp"].includes(unit)) type = "power";
    else if (["rpm", "RPM"].includes(unit)) type = "rpm";

    return { name, unit, type };
}

export function convertValue(value: number, type: UnitType, fromUnit: string, toUnit: string): number {
    if (type === "unknown" || fromUnit === toUnit) return value;

    // Generic conversion using base units if available
    // (This simplifies the manual if/else blocks below)
    const unitGroup = UNITS[type as keyof typeof UNITS] as Record<string, { label: string; toBase: (v: number) => number; fromBase: (v: number) => number }>;
    if (unitGroup) {
        const fromDef = Object.values(unitGroup).find((u) => u.label === fromUnit);
        const toDef = Object.values(unitGroup).find((u) => u.label === toUnit);

        if (fromDef && toDef) {
            const baseVal = fromDef.toBase(value);
            return toDef.fromBase(baseVal);
        }
    }

    return value;
}
