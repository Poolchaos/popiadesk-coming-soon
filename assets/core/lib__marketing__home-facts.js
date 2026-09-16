import { assessmentQuestions } from "./lib__assessments__assessment-shared.js";
import { TEMPLATE_REVISIONS } from "./lib__documents__template-revisions.js";
import { documentLabels, FRESHNESS_DAYS } from "./lib__compliance__standing-core.js";
import { HUNDRED_BLOCKS } from "./lib__compliance__hundred-core.js";
export const DOCUMENT_TYPES = Object.keys(TEMPLATE_REVISIONS);
export const DOCUMENT_NAMES = DOCUMENT_TYPES.map((type) => documentLabels[type] ?? type);
export const DOCUMENT_COUNT = DOCUMENT_TYPES.length;
export const QUESTION_COUNT = assessmentQuestions.length;
export const ASSESSMENT_TOTAL = 100;
export const SCORE_BLOCKS = HUNDRED_BLOCKS.map((block) => ({
    key: block.key,
    label: block.label,
    marks: block.marks,
}));
export const SCORE_TOTAL = SCORE_BLOCKS.reduce((sum, block) => sum + block.marks, 0);
export const FRESHNESS_MONTHS = Math.round(FRESHNESS_DAYS / 30.4375);
export const DSR_DEADLINE_DAYS = 30;
export { TRIAL_DAYS } from "./lib__billing__plans.js";
export const MAX_ADMINISTRATIVE_FINE = 10000000;
export const SCAN_CHECKS = [
    "A secure connection",
    "A reachable privacy notice",
    "Forms that collect personal information",
    "Third-party trackers",
    "Cookie consent",
    "Retention disclosure",
];
