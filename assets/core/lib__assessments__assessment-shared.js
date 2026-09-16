import assessmentConfig from "./assessment-questions.js";
import gapAnalysisConfig from "./gap-analysis-questions.js";
export const assessmentQuestions = assessmentConfig.questions;
export const gapAnalysisQuestions = gapAnalysisConfig.questions;
export function getQuestionsForType(type) {
    return type === "gap_analysis" ? gapAnalysisQuestions : assessmentQuestions;
}
export const assessmentSections = [
    { id: "governance", label: "Governance & Accountability" },
    { id: "lawful_processing", label: "Lawful Processing (Conditions 1-5)" },
    { id: "transparency", label: "Transparency & Data Subject Rights" },
    { id: "security", label: "Security & Retention" },
    { id: "third_parties", label: "Third Parties & Cross-border" },
    { id: "consent", label: "Consent & Marketing" },
    { id: "special_information", label: "Special Personal Information" },
    { id: "documentation", label: "Documentation & Records" },
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
export function getRiskLevel(score) {
    if (score >= 76)
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
        let priority;
        if (ratio <= 0.33) {
            priority = "high";
        }
        else if (ratio <= 0.66) {
            priority = "medium";
        }
        else {
            priority = "low";
        }
        recommendations.push({
            questionId: question.id,
            section: question.section,
            text: question.recommendation[priority],
            priority,
            popiaReference: question.popiaReference,
        });
    }
    return recommendations.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
    });
}
