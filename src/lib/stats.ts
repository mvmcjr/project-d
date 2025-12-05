export function calculateStats(data: any[], key: string) {
    let min = Infinity;
    let max = -Infinity;
    let sum = 0;
    let count = 0;
    let minPoint = null;
    let maxPoint = null;

    for (const row of data) {
        const val = row[key];
        if (typeof val === 'number') {
            if (val < min) {
                min = val;
                minPoint = row;
            }
            if (val > max) {
                max = val;
                maxPoint = row;
            }
            sum += val;
            count++;
        }
    }

    return {
        min: count > 0 ? min : 0,
        max: count > 0 ? max : 0,
        avg: count > 0 ? sum / count : 0,
        minPoint,
        maxPoint,
    };
}
