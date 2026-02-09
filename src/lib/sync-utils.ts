import { DataPoint } from "./types";

/**
 * Finds the timestamp where the pull starts.
 * 
 * Logic:
 * 1. Identify segments where `pedal` > 95%.
 * 2. Select the longest segment (main pull).
 * 3. Within that segment, find the timestamp of the minimum RPM.
 * 4. Return this timestamp as the `offset`.
 */
export function findPullStart(data: DataPoint[], pedalKey: string, rpmKey: string): { offset: number | null, maxPedal: number } {
    if (!data || data.length === 0) return { offset: null, maxPedal: 0 };

    // 1. Identify segments where pedal > 95%
    const threshold = 95;
    const segments: { start: number; end: number; startIndex: number; endIndex: number; duration: number }[] = [];
    let currentStart: number | null = null;
    let currentStartIndex: number = -1;
    let maxPedal = 0;

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const pedal = Number(row[pedalKey]);
        const time = Number(row.Time);

        if (isNaN(pedal) || isNaN(time)) continue;

        if (pedal > maxPedal) maxPedal = pedal;

        if (pedal >= threshold) {
            if (currentStart === null) {
                currentStart = time;
                currentStartIndex = i;
            }
        } else {
            if (currentStart !== null) {
                const endTime = Number(data[i - 1].Time);
                segments.push({
                    start: currentStart,
                    end: endTime,
                    startIndex: currentStartIndex,
                    endIndex: i - 1,
                    duration: endTime - currentStart
                });
                currentStart = null;
                currentStartIndex = -1;
            }
        }
    }

    // Close last segment
    if (currentStart !== null && currentStartIndex !== -1) {
        const endTime = Number(data[data.length - 1].Time);
        segments.push({
            start: currentStart,
            end: endTime,
            startIndex: currentStartIndex,
            endIndex: data.length - 1,
            duration: endTime - currentStart
        });
    }

    if (segments.length === 0) return { offset: null, maxPedal };

    // 2. Select the longest segment (main pull)
    // Sort by duration descending
    segments.sort((a, b) => b.duration - a.duration);
    const mainPull = segments[0];

    // 3. Within that segment, find the timestamp of the minimum RPM
    // We look at the data within the identified segment
    let minRpm = Infinity;
    let minRpmTime = mainPull.start;

    for (let i = mainPull.startIndex; i <= mainPull.endIndex; i++) {
        const row = data[i];
        const rpm = Number(row[rpmKey]);
        const time = Number(row.Time);

        if (!isNaN(rpm) && rpm < minRpm) {
            minRpm = rpm;
            minRpmTime = time;
        }
    }

    return { offset: minRpmTime, maxPedal };
}

/**
 * Returns a new array where `row.Time = row.Time - offset`.
 */
export function applyTimeOffset(data: DataPoint[], offset: number): DataPoint[] {
    return data.map(row => {
        const originalTime = Number(row.Time);
        if (isNaN(originalTime)) return row;

        return {
            ...row,
            Time: originalTime - offset
        };
    });
}
