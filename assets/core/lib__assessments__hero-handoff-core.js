import { assessmentQuestions } from "./lib__assessments__assessment-shared.js";
export const HERO_HANDOFF_KEY = "popiadesk-hero-answers";
export function sanitiseHeroAnswers(input) {
    if (!input || typeof input !== "object" || Array.isArray(input))
        return {};
    const out = {};
    for (const [id, value] of Object.entries(input)) {
        const question = assessmentQuestions.find((q) => q.id === id);
        if (!question)
            continue;
        if (typeof value !== "number" || !Number.isFinite(value))
            continue;
        if (!question.options.some((o) => o.value === value))
            continue;
        out[id] = value;
    }
    return out;
}
export function serialiseHeroAnswers(answers) {
    const clean = sanitiseHeroAnswers(answers);
    return Object.keys(clean).length === 0 ? null : JSON.stringify(clean);
}
export function parseHeroAnswers(raw) {
    if (!raw)
        return {};
    try {
        return sanitiseHeroAnswers(JSON.parse(raw));
    }
    catch {
        return {};
    }
}
export function firstUnansweredSection(answers, sectionIds) {
    for (let i = 0; i < sectionIds.length; i++) {
        const questions = assessmentQuestions.filter((q) => q.section === sectionIds[i]);
        if (questions.some((q) => answers[q.id] === undefined))
            return i;
    }
    return 0;
}
export function storeHeroAnswers(answers) {
    const payload = serialiseHeroAnswers(answers);
    try {
        if (payload)
            sessionStorage.setItem(HERO_HANDOFF_KEY, payload);
        else
            sessionStorage.removeItem(HERO_HANDOFF_KEY);
    }
    catch {
    }
}
export function takeHeroAnswers() {
    try {
        const raw = sessionStorage.getItem(HERO_HANDOFF_KEY);
        sessionStorage.removeItem(HERO_HANDOFF_KEY);
        return parseHeroAnswers(raw);
    }
    catch {
        return {};
    }
}
