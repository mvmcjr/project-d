import * as React from "react";
import { ParsedData, ConversionSchema } from "@/lib/types";
import { detectUnit, convertValue, UnitType } from "@/lib/conversions";

export type UnitPreferences = Record<UnitType, string>;

export const DEFAULT_PREFERENCES: UnitPreferences = {
    pressure: "psig",
    speed: "mph",
    temperature: "F",
    afr: "AFR",
    torque: "Nm",
    unknown: "",
    power: "hp",
    rpm: "rpm",
};

export function useLogProcessor(data: ParsedData | null) {
    const [preferences, setPreferences] = React.useState<UnitPreferences>(DEFAULT_PREFERENCES);

    const setUnit = React.useCallback((type: UnitType, unit: string) => {
        setPreferences((prev) => ({ ...prev, [type]: unit }));
    }, []);

    const { processedData, conversionMetadata } = React.useMemo(() => {
        if (!data) return { processedData: null, conversionMetadata: {} };

        const conversionMetadata: Record<string, ConversionSchema> = {};

        const newHeaders = data.headers.map(header => {
            const detected = detectUnit(header);
            if (detected && detected.type !== "unknown") {
                const targetUnit = preferences[detected.type];

                const isConverted = targetUnit && targetUnit !== detected.unit;

                // Construct new header name
                const newHeader = isConverted
                    ? header.replace(`[${detected.unit}]`, `[${targetUnit}]`)
                    : header;

                conversionMetadata[newHeader] = {
                    originalHeader: header,
                    originalUnit: detected.unit,
                    targetUnit: targetUnit || detected.unit,
                    isConverted: !!isConverted,
                    hasError: false
                };

                return newHeader;
            }

            conversionMetadata[header] = {
                originalHeader: header,
                originalUnit: "",
                targetUnit: "",
                isConverted: false,
                hasError: false
            };
            return header;
        });

        const newData = data.data.map(row => {
            const newRow: Record<string, number | string | null> = {};
            data.headers.forEach((header, index) => {
                const value = row[header];
                const newHeader = newHeaders[index];
                const meta = conversionMetadata[newHeader];
                const detected = detectUnit(header);

                if (meta.isConverted && detected && typeof value === 'number') {
                    const converted = convertValue(value, detected.type, detected.unit, meta.targetUnit);

                    // Robustness check
                    if (isNaN(converted) || !isFinite(converted)) {
                        meta.hasError = true;
                        newRow[newHeader] = value; // Fallback to original
                        newRow[`__original_${newHeader}`] = value;
                    } else {
                        newRow[newHeader] = converted;
                        newRow[`__original_${newHeader}`] = value;
                    }
                    return;
                }
                newRow[newHeader] = value;
            });
            return newRow;
        });

        return {
            processedData: {
                ...data,
                headers: newHeaders,
                data: newData,
            },
            conversionMetadata
        };
    }, [data, preferences]);

    return {
        preferences,
        setPreferences,
        setUnit,
        processedData,
        conversionMetadata
    };
}
