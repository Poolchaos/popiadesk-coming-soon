import { assessmentQuestions, LOW_RISK_FROM } from "./lib__assessments__assessment-shared.js";
export const subjectLabels = {
    q1: "Information Officer",
    q2: "Compliance framework",
    q3: "Data protection budget",
    q4: "Impact assessment",
    q5: "Breach response plan",
    q6: "Reason for using data",
    q7: "Collecting directly",
    q8: "Purpose explained",
    q9: "Only what you need",
    q10: "Keeping records accurate",
    q11: "Privacy policy",
    q12: "Telling people at the time",
    q13: "Access and correction",
    q14: "Security measures",
    q15: "Retention policy",
    q16: "Staff training",
    q17: "Who can see what",
    q18: "Supplier agreements",
    q19: "Checking your suppliers",
    q20: "Sending data abroad",
    q21: "Consent",
    q22: "Marketing opt-in",
    q23: "Sensitive information",
    q24: "Children's information",
    q25: "Records of processing",
};
export function subjectLabel(questionId) {
    return (subjectLabels[questionId] ??
        assessmentQuestions.find((q) => q.id === questionId)?.text ??
        questionId);
}
export function zeroDuties(answers) {
    return assessmentQuestions
        .filter((q) => answers[q.id] === 0 && q.popiaReference !== "General")
        .map((q) => q.id);
}
export function zeroDutiesSentence(answers) {
    const names = zeroDuties(answers).map(subjectLabel);
    if (names.length === 0)
        return null;
    if (names.length === 1) {
        return `${names[0]} scores 0. That gap comes first, whatever the total.`;
    }
    const list = `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
    return `${names.length} legal duties score 0: ${list}. Those gaps come first, whatever the total.`;
}
export const riskSentence = {
    low: "Low risk. The gaps left are the smaller ones.",
    medium: "Medium risk. The recommendations below are in the order worth doing them.",
    high: "High risk, and every item below is something you can start today.",
    critical: "Critical risk. That sounds worse than it is: most of it is documents that do not exist yet, and the list below is in priority order.",
};
export function riskSentenceFor(riskLevel, answers) {
    const zeros = zeroDuties(answers).length;
    if (riskLevel === "low" && zeros > 0) {
        return `The total alone would put you in the low-risk band (${LOW_RISK_FROM} or more). ${zeros === 1 ? "A zero on a legal duty is" : "Zeros on legal duties are"} not low risk: start there.`;
    }
    return riskSentence[riskLevel] ?? "";
}
export function unlabelledQuestionIds() {
    return assessmentQuestions.filter((q) => !subjectLabels[q.id]).map((q) => q.id);
}
