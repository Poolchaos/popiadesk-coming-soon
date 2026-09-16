import { assessmentQuestions } from "./lib__assessments__assessment-shared.js";
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
export function unlabelledQuestionIds() {
    return assessmentQuestions.filter((q) => !subjectLabels[q.id]).map((q) => q.id);
}
