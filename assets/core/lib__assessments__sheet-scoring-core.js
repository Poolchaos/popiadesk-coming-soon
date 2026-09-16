import { assessmentQuestions, } from "./lib__assessments__assessment-shared.js";
const MAX_OPTION_VALUE = 3;
const TOTAL_WEIGHT = assessmentQuestions.reduce((sum, q) => sum + q.weight, 0);
export function maxOf(question) {
    return (100 * question.weight) / TOTAL_WEIGHT;
}
export function earnedOf(question, value) {
    return (100 * value * question.weight) / (MAX_OPTION_VALUE * TOTAL_WEIGHT);
}
export function ceilingOf(answers) {
    return assessmentQuestions.reduce((sum, q) => sum + (answers[q.id] !== undefined ? earnedOf(q, answers[q.id]) : maxOf(q)), 0);
}
export function trimMark(value) {
    return (Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, "");
}
export function questionById(id) {
    const found = assessmentQuestions.find((q) => q.id === id);
    if (!found)
        throw new Error(`Unknown assessment question: ${id}`);
    return found;
}
export function answerLabel(question, value) {
    return question.options.find((o) => o.value === value)?.label ?? "";
}
