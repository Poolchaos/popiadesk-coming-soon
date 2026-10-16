import assessmentConfig from "./assessment-questions.js";
import gapAnalysisConfig from "./gap-analysis-questions.js";
export const assessmentQuestions = assessmentConfig.questions;
export const gapAnalysisQuestions = gapAnalysisConfig.questions;
export function getQuestionsForType(type) {
    return type === "gap_analysis" ? gapAnalysisQuestions : assessmentQuestions;
}
export const assessmentSections = [
    { id: "governance", label: "Who is responsible" },
    { id: "lawful_processing", label: "Why and how you use information" },
    { id: "transparency", label: "Telling people, and their rights" },
    { id: "security", label: "Keeping it safe, and for how long" },
    { id: "third_parties", label: "Suppliers, and information sent abroad" },
    { id: "consent", label: "Consent and marketing" },
    { id: "special_information", label: "Sensitive information and children" },
    { id: "documentation", label: "Keeping records" },
];
export function calculateAssessmentScore(answers, questions) {
    const qs = questions ?? assessmentQuestions;
    let weightedSum = 0;
    let maxWeightedSum = 0;
    for (const question of qs) {
        const answerValue = answers[question.id];
        const maxValue = Math.max(...question.options.map((o) => o.value));
        if (answerValue !== undefined) {
            weightedSum += answerValue * question.weight;
        }
        maxWeightedSum += maxValue * question.weight;
    }
    if (maxWeightedSum === 0)
        return 0;
    return Math.round((weightedSum / maxWeightedSum) * 100);
}
export const LOW_RISK_FROM = 76;
export function getRiskLevel(score) {
    if (score >= LOW_RISK_FROM)
        return "low";
    if (score >= 51)
        return "medium";
    if (score >= 26)
        return "high";
    return "critical";
}
export function generateRecommendations(answers, questions) {
    const qs = questions ?? assessmentQuestions;
    const recommendations = [];
    for (const question of qs) {
        const answerValue = answers[question.id];
        if (answerValue === undefined)
            continue;
        const maxValue = Math.max(...question.options.map((o) => o.value));
        const ratio = answerValue / maxValue;
        if (ratio >= 1)
            continue;
        const level = ratio < 0.5 ? "low" : "medium";
        const priority = level === "low" ? "high" : "medium";
        recommendations.push({
            questionId: question.id,
            section: question.section,
            text: question.recommendation[level],
            priority,
            popiaReference: question.popiaReference,
        });
    }
    const answered = (rec) => answers[rec.questionId] ?? 0;
    return recommendations.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority] || answered(a) - answered(b);
    });
}
