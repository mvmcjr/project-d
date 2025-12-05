export type UnitType = "pressure" | "speed" | "temperature" | "afr" | "torque" | "unknown";

export const UNITS = {
    pressure: {
        psig: { label: "psig", toBase: (v: number) => v }, // Base is psig
        bar: { label: "bar", toBase: (v: number) => v * 14.5038, fromBase: (v: number) => v * 0.0689476 },
        kPa: { label: "kPa", toBase: (v: number) => v * 0.145038, fromBase: (v: number) => v * 6.89476 },
    },
    speed: {
        mph: { label: "mph", toBase: (v: number) => v }, // Base is mph
        kmh: { label: "km/h", toBase: (v: number) => v * 0.621371, fromBase: (v: number) => v * 1.60934 },
    },
    temperature: {
        F: { label: "°F", toBase: (v: number) => v }, // Base is F
        C: { label: "°C", toBase: (v: number) => (v * 9 / 5) + 32, fromBase: (v: number) => (v - 32) * 5 / 9 },
    },
    afr: {
        AFR: { label: "AFR", toBase: (v: number) => v },
        lambda: { label: "λ", toBase: (v: number) => v * 14.7, fromBase: (v: number) => v / 14.7 }, // Assuming gas
    },
    torque: {
        Nm: { label: "Nm", toBase: (v: number) => v },
        kgfm: { label: "kgfm", toBase: (v: number) => v * 9.80665, fromBase: (v: number) => v * 0.1019716 },
    }
};

export function detectUnit(header: string): { name: string; unit: string; type: UnitType } | null {
    const match = header.match(/(.*)\[(.*)\]/);
    if (!match) return null;

    const name = match[1].trim();
    const unit = match[2].trim();

    let type: UnitType = "unknown";
    if (["psig", "psi"].includes(unit)) type = "pressure";
    else if (["mph", "km/h"].includes(unit)) type = "speed";
    else if (["F", "C", "°F", "°C"].includes(unit)) type = "temperature";
    else if (["AFR", "Lambda", "λ"].includes(unit)) type = "afr";
    else if (["Nm", "kgfm"].includes(unit)) type = "torque";

    return { name, unit, type };
}

export function convertValue(value: number, type: UnitType, fromUnit: string, toUnit: string): number {
    if (type === "unknown" || fromUnit === toUnit) return value;

    // specific logic can go here, or use the map above if fully populated.
    // For simplicity and robustness with the specific requirements:

    if (type === "pressure") {
        if (fromUnit === "psig" && toUnit === "bar") return value * 0.0689476;
        if (fromUnit === "bar" && toUnit === "psig") return value * 14.5038;
    }

    if (type === "speed") {
        if (fromUnit === "mph" && toUnit === "km/h") return value * 1.60934;
        if (fromUnit === "km/h" && toUnit === "mph") return value * 0.621371;
    }

    if (type === "temperature") {
        const from = fromUnit.replace("°", "");
        const to = toUnit.replace("°", "");

        if (from === "F" && to === "C") return (value - 32) * 5 / 9;
        if (from === "C" && to === "F") return (value * 9 / 5) + 32;
    }

    if (type === "torque") {
        if (fromUnit === "Nm" && toUnit === "kgfm") return value * 0.1019716;
        if (fromUnit === "kgfm" && toUnit === "Nm") return value * 9.80665;
    }

    if (type === "afr") {
        const isLambda = (u: string) => ["Lambda", "λ", "lambda"].includes(u);
        const isAFR = (u: string) => ["AFR", "afr"].includes(u);

        if (isLambda(fromUnit) && isAFR(toUnit)) return value * 14.7;
        if (isAFR(fromUnit) && isLambda(toUnit)) return value / 14.7;
    }

    return value;
}
