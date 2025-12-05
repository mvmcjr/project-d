export type DataPoint = Record<string, number | string | null>;

export interface ParsedData {
    fileName: string;
    headers: string[];
    data: DataPoint[];
    meta: any;
}
