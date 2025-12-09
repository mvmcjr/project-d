export type DataPoint = Record<string, number | string | null>;

export interface ParsedData {
    fileName: string;
    headers: string[];
    data: DataPoint[];
    meta: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface ConversionSchema {
    originalHeader: string;
    originalUnit: string;
    targetUnit: string;
    isConverted: boolean;
    hasError: boolean;
}

