export function outQuart(t) {
    const clamped = Math.min(1, Math.max(0, t));
    return 1 - Math.pow(1 - clamped, 4);
}
export function countedValue(from, to, t) {
    return Math.round(from + (to - from) * outQuart(t));
}
export const COUNT_DURATION_MS = 600;
