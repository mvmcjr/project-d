export function calculateStats(data: any[], key: string) {
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    let count = 0;

    for (const row of data) {
        const val = row[key];
        if (typeof val === 'number') {
            if (val < min) min = val;
            if (val > max) max = val;
            sum += val;
            count++;
        }
    }

    return {
        min: count > 0 ? min : 0,
        max: count > 0 ? max : 0,
        avg: count > 0 ? sum / count : 0,
    };
}
