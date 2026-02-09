/**
 * Peak and Valley Detection Utility
 * 
 * Detects local maxima (peaks) and minima (valleys) in time-series data.
 * Uses a threshold to filter out minor fluctuations.
 */

export interface PeakValleyResult {
    /** Times where local peaks occur (first occurrence of each peak value) */
    peakTimes: Set<number>;
    /** Times where local valleys occur (first occurrence of each valley value) */
    valleyTimes: Set<number>;
    /** Combined set of all peak and valley times */
    allTimes: Set<number>;
}

/**
 * Detects local peaks and valleys in a data series.
 * 
 * A peak is a point where the trend changes from increasing to decreasing.
 * A valley is a point where the trend changes from decreasing to increasing.
 * 
 * The algorithm tracks the EXTREME value during each trend (the actual high/low),
 * and only confirms a peak/valley when there's a significant reversal from that extreme.
 * This ensures we mark the true minimum/maximum, not just the point where we detected the reversal.
 * 
 * The threshold parameter filters out minor fluctuations - a reversal must
 * exceed this percentage of the total range to be counted.
 * 
 * @param data - Array of data points
 * @param key - The key/field to analyze
 * @param thresholdPercent - Minimum percentage of range for a reversal to count (default 5%)
 * @returns Object containing sets of peak and valley times
 */
export function detectPeaksAndValleys(
    data: Record<string, number | string | null>[],
    key: string,
    thresholdPercent: number = 5
): PeakValleyResult {
    const peakTimes = new Set<number>();
    const valleyTimes = new Set<number>();

    // Extract valid numeric values with their times
    const points: { time: number; value: number }[] = [];
    for (const row of data) {
        const time = row.Time;
        const value = row[key];
        if (typeof time === 'number' && typeof value === 'number') {
            points.push({ time, value });
        }
    }

    if (points.length < 3) {
        return { peakTimes, valleyTimes, allTimes: new Set() };
    }

    // Calculate range for threshold
    let min = Infinity;
    let max = -Infinity;
    for (const p of points) {
        if (p.value < min) min = p.value;
        if (p.value > max) max = p.value;
    }
    const range = max - min;
    const threshold = (range * thresholdPercent) / 100;

    if (range === 0 || threshold === 0) {
        return { peakTimes, valleyTimes, allTimes: new Set() };
    }

    // Track the current trend and extreme values during that trend
    type TrendDirection = 'up' | 'down' | 'none';

    let currentTrend: TrendDirection = 'none';
    let trendStartValue = points[0].value;

    // Track the extreme point during current trend (the actual peak/valley to mark)
    // For uptrend: track the highest point seen
    // For downtrend: track the lowest point seen
    let extremeValue = points[0].value;
    let extremeTime = points[0].time;

    // Track seen extreme values to avoid marking duplicates
    const seenPeakValues = new Set<number>();
    const seenValleyValues = new Set<number>();

    for (let i = 1; i < points.length; i++) {
        const current = points[i];
        const moveFromTrendStart = current.value - trendStartValue;

        if (currentTrend === 'none') {
            // Establishing initial trend direction
            if (moveFromTrendStart >= threshold) {
                // Significant upward move - start uptrend
                currentTrend = 'up';
                trendStartValue = extremeValue; // The low before the upturn
                extremeValue = current.value;
                extremeTime = current.time;
            } else if (moveFromTrendStart <= -threshold) {
                // Significant downward move - start downtrend
                currentTrend = 'down';
                trendStartValue = extremeValue; // The high before the downturn
                extremeValue = current.value;
                extremeTime = current.time;
            } else {
                // No significant move yet, but track potential starting extreme
                // Update extreme if this is a new high or low
                if (current.value > extremeValue || current.value < extremeValue) {
                    extremeValue = current.value;
                    extremeTime = current.time;
                }
            }
        } else if (currentTrend === 'up') {
            // Currently in uptrend - looking for a peak
            if (current.value > extremeValue) {
                // New high - update the potential peak location
                extremeValue = current.value;
                extremeTime = current.time;
            } else if (extremeValue - current.value >= threshold) {
                // Significant drop from the high - PEAK confirmed at extremeTime!
                if (!seenPeakValues.has(extremeValue)) {
                    peakTimes.add(extremeTime);
                    seenPeakValues.add(extremeValue);
                }
                // Start new downtrend from this peak
                currentTrend = 'down';
                trendStartValue = extremeValue;
                extremeValue = current.value;
                extremeTime = current.time;
            }
        } else if (currentTrend === 'down') {
            // Currently in downtrend - looking for a valley
            if (current.value < extremeValue) {
                // New low - update the potential valley location
                extremeValue = current.value;
                extremeTime = current.time;
            } else if (current.value - extremeValue >= threshold) {
                // Significant rise from the low - VALLEY confirmed at extremeTime!
                if (!seenValleyValues.has(extremeValue)) {
                    valleyTimes.add(extremeTime);
                    seenValleyValues.add(extremeValue);
                }
                // Start new uptrend from this valley
                currentTrend = 'up';
                trendStartValue = extremeValue;
                extremeValue = current.value;
                extremeTime = current.time;
            }
        }
    }

    const allTimes = new Set<number>([...peakTimes, ...valleyTimes]);
    return { peakTimes, valleyTimes, allTimes };
}

/**
 * Detects peaks and valleys for multiple series and combines the results.
 * 
 * @param data - Array of data points
 * @param keys - Array of keys/fields to analyze
 * @param thresholdPercent - Minimum percentage of range for a reversal to count
 * @returns Map of key -> PeakValleyResult
 */
export function detectPeaksAndValleysMultiple(
    data: Record<string, number | string | null>[],
    keys: string[],
    thresholdPercent: number = 5
): Map<string, PeakValleyResult> {
    const results = new Map<string, PeakValleyResult>();

    for (const key of keys) {
        results.set(key, detectPeaksAndValleys(data, key, thresholdPercent));
    }

    return results;
}
