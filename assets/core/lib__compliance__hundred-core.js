import { getFreshness, FRESHNESS_WARNING_DAYS } from "./lib__compliance__standing-core.js";
export const HUNDRED_BLOCKS = [
    { key: "assessment", label: "POPIA readiness assessment", marks: 30 },
    { key: "documents", label: "Document coverage", marks: 25 },
    { key: "dsr", label: "Data subject requests", marks: 15 },
    { key: "suppliers", label: "Supplier compliance", marks: 15 },
    { key: "dataMap", label: "Data map", marks: 15 },
];
export function marksFor(blockMarks, score) {
    if (score === null)
        return null;
    return Math.round((blockMarks * score) / 100);
}
export function buildHundred(scores, options = {}) {
    const { now, dates } = options;
    const blocks = HUNDRED_BLOCKS.map((b) => ({
        key: b.key,
        label: b.label,
        marks: b.marks,
        earned: marksFor(b.marks, scores[b.key]),
    }));
    const marks = [];
    let index = 0;
    for (const block of blocks) {
        const staleState = decayState(block.key, now, dates);
        for (let i = 0; i < block.marks; i++) {
            const isEarned = block.earned !== null && i < block.earned;
            marks.push({
                index,
                block: block.key,
                state: isEarned ? staleState : "unearned",
            });
            index++;
        }
    }
    return {
        blocks,
        marks,
        total: marks.filter((m) => m.state === "earned" || m.state === "expiring").length,
        measuredMarks: blocks.reduce((sum, b) => sum + (b.earned === null ? 0 : b.marks), 0),
    };
}
function decayState(key, now, dates) {
    const date = dates?.[key];
    if (!now || !date)
        return "earned";
    const freshness = getFreshness(date, now);
    if (freshness.status === "stale")
        return "lapsed";
    if (freshness.status === "expiring")
        return "expiring";
    return "earned";
}
export function blockLegend(block) {
    if (block.earned === null)
        return "not measured on this plan";
    return `${block.marks} marks`;
}
export function measurableMarks(features) {
    return HUNDRED_BLOCKS.reduce((sum, b) => {
        if (b.key === "dsr" && !features.dsrManagement)
            return sum;
        if (b.key === "suppliers" && !features.supplierManagement)
            return sum;
        if (b.key === "dataMap" && !features.dataMap)
            return sum;
        return sum + b.marks;
    }, 0);
}
export const WARNING_WINDOW_DAYS = FRESHNESS_WARNING_DAYS;
