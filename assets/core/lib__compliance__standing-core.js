export const STANDING_TIERS = ["bronze", "silver", "gold", "platinum"];
export const standingLabels = {
    unranked: "Not yet ranked",
    bronze: "Bronze",
    silver: "Silver",
    gold: "Gold",
    platinum: "Platinum",
};
export const TIER_SCORE_THRESHOLDS = {
    bronze: 0,
    silver: 51,
    gold: 76,
    platinum: 90,
};
export const TIER_DOCUMENTS = {
    bronze: [],
    silver: ["privacy_policy", "paia_manual", "consent_form"],
    gold: [
        "privacy_policy",
        "paia_manual",
        "consent_form",
        "io_appointment",
        "breach_notification",
        "dpa",
        "retention_schedule",
    ],
    platinum: [
        "privacy_policy",
        "paia_manual",
        "consent_form",
        "dpa",
        "breach_notification",
        "io_appointment",
        "marketing_consent",
        "employee_privacy",
        "cookie_policy",
        "retention_schedule",
    ],
};
export const documentLabels = {
    privacy_policy: "Privacy Policy",
    paia_manual: "PAIA Manual",
    consent_form: "Consent Form",
    dpa: "Data Processing Agreement",
    breach_notification: "Breach Notification Template",
    io_appointment: "Information Officer Appointment",
    marketing_consent: "Marketing Consent Form",
    employee_privacy: "Employee Privacy Notice",
    cookie_policy: "Cookie Policy",
    retention_schedule: "Retention Schedule",
};
export const FRESHNESS_DAYS = 365;
export const FRESHNESS_WARNING_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;
export function getFreshness(lastDate, now) {
    const expiresAt = new Date(lastDate.getTime() + FRESHNESS_DAYS * DAY_MS);
    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / DAY_MS);
    const status = daysLeft <= 0 ? "stale" : daysLeft <= FRESHNESS_WARNING_DAYS ? "expiring" : "fresh";
    return { status, expiresAt, daysLeft };
}
export const MILESTONE_IDS = ["breach_ready", "audit_ready", "regulator_ready"];
export const milestoneLabels = {
    breach_ready: "Breach-ready",
    audit_ready: "Audit-ready",
    regulator_ready: "Regulator-ready",
};
export const milestoneDescriptions = {
    breach_ready: "Breach notification template and Information Officer appointment in place, and your IO registered with the Information Regulator.",
    audit_ready: "Audit trail running and a complete data map - the evidence a regulator or auditor asks for first.",
    regulator_ready: "PAIA manual current, IO registered, and the annual PAIA report (section 83(4), for private bodies) filed within the last year.",
};
export function computeStanding(input) {
    const { now } = input;
    const score = input.overallScore ?? 0;
    const activeByType = new Map(input.activeDocuments.map((d) => [d.type, d]));
    const docFreshness = (type) => {
        const doc = activeByType.get(type);
        return doc ? getFreshness(doc.updatedAt, now) : null;
    };
    const assessmentCompletedAt = input.assessmentCompletedAt;
    let assessment;
    if (assessmentCompletedAt) {
        const freshness = getFreshness(assessmentCompletedAt, now);
        assessment = {
            status: freshness.status,
            completedAt: assessmentCompletedAt,
            expiresAt: freshness.expiresAt,
            daysLeft: freshness.daysLeft,
        };
    }
    else {
        assessment = {
            status: "missing",
            completedAt: null,
            expiresAt: null,
            daysLeft: null,
        };
    }
    const meetsBronze = input.setupComplete &&
        input.assessmentCompletedAt !== null &&
        input.activeDocuments.length >= 1;
    const meetsTier = (tier) => {
        if (tier === "bronze")
            return meetsBronze;
        if (!meetsBronze)
            return false;
        if (assessment.status === "missing" || assessment.status === "stale")
            return false;
        if (score < TIER_SCORE_THRESHOLDS[tier])
            return false;
        return TIER_DOCUMENTS[tier].every((type) => {
            const freshness = docFreshness(type);
            return freshness !== null && freshness.status !== "stale";
        });
    };
    let standing = "unranked";
    for (const tier of STANDING_TIERS) {
        if (meetsTier(tier))
            standing = tier;
        else
            break;
    }
    const nextTier = standing === "platinum"
        ? null
        : STANDING_TIERS[standing === "unranked" ? 0 : STANDING_TIERS.indexOf(standing) + 1];
    const tasks = nextTier ? tasksForTier(nextTier, input, assessment, score, now) : [];
    const remainingCount = tasks.filter((t) => !t.done).length;
    const documentWarnings = [];
    for (const doc of input.activeDocuments) {
        const freshness = getFreshness(doc.updatedAt, now);
        if (freshness.status === "fresh")
            continue;
        documentWarnings.push({
            type: doc.type,
            label: documentLabels[doc.type] ?? doc.type,
            status: freshness.status,
            updatedAt: doc.updatedAt,
            expiresAt: freshness.expiresAt,
        });
    }
    return {
        standing,
        score,
        nextTier,
        tasks,
        remainingCount,
        assessment,
        documentWarnings,
        milestones: computeMilestones(input, docFreshness),
    };
}
function tasksForTier(tier, input, assessment, score, now) {
    const tasks = [];
    const activeByType = new Map(input.activeDocuments.map((d) => [d.type, d]));
    if (tier === "bronze") {
        tasks.push({
            id: "setup",
            label: "Complete organisation setup",
            href: "/setup",
            done: input.setupComplete,
        });
        tasks.push({
            id: "assessment",
            label: "Complete the POPIA readiness assessment",
            href: "/assessments",
            done: input.assessmentCompletedAt !== null,
        });
        tasks.push({
            id: "first-document",
            label: "Generate your first compliance document",
            href: "/documents/generate",
            done: input.activeDocuments.length >= 1,
        });
        return tasks;
    }
    const assessmentCurrent = assessment.status === "fresh" || assessment.status === "expiring";
    tasks.push({
        id: "assessment-current",
        label: assessment.status === "stale"
            ? "Retake your readiness assessment (older than 12 months)"
            : "Keep a current readiness assessment (within 12 months)",
        href: "/assessments",
        done: assessmentCurrent,
    });
    const threshold = TIER_SCORE_THRESHOLDS[tier];
    tasks.push({
        id: "score",
        label: `Reach a compliance score of ${threshold}% (now ${score}%)`,
        href: "/compliance-report",
        done: score >= threshold,
    });
    for (const type of TIER_DOCUMENTS[tier]) {
        const label = documentLabels[type] ?? type;
        const doc = activeByType.get(type);
        if (!doc) {
            tasks.push({
                id: `generate-${type}`,
                label: `Generate your ${label}`,
                href: `/documents/generate/${type}`,
                done: false,
            });
            continue;
        }
        const freshness = getFreshness(doc.updatedAt, now);
        tasks.push({
            id: `current-${type}`,
            label: freshness.status === "stale"
                ? `Regenerate your ${label} (older than 12 months)`
                : `${label} in place and current`,
            href: `/documents`,
            done: freshness.status !== "stale",
        });
    }
    return tasks;
}
function computeMilestones(input, docFreshness) {
    const docCurrent = (type) => {
        const f = docFreshness(type);
        return f !== null && f.status !== "stale";
    };
    const docLabel = (type) => documentLabels[type] ?? type;
    const breachMissing = [];
    if (!docCurrent("breach_notification"))
        breachMissing.push(`${docLabel("breach_notification")} generated and current`);
    if (!docCurrent("io_appointment"))
        breachMissing.push(`${docLabel("io_appointment")} generated and current`);
    if (!input.ioRegisteredAt)
        breachMissing.push("Information Officer registered with the Regulator (self-declared)");
    const auditMissing = [];
    let auditUpgrade = false;
    if (!input.hasAuditTrail) {
        auditMissing.push("Audit trail (Business plan feature)");
        auditUpgrade = true;
    }
    if (!input.hasDataMap) {
        auditMissing.push("Data map (Business plan feature)");
        auditUpgrade = true;
    }
    else if (input.dataMapEntries === 0) {
        auditMissing.push("At least one data map entry");
    }
    else if ((input.dataMapCompleteness ?? 0) < 100) {
        auditMissing.push("Every data map entry complete (retention and security recorded)");
    }
    const regulatorMissing = [];
    if (!docCurrent("paia_manual"))
        regulatorMissing.push(`${docLabel("paia_manual")} generated and current`);
    if (!input.ioRegisteredAt)
        regulatorMissing.push("Information Officer registered with the Regulator (self-declared)");
    if (!input.paiaReportFiledAt ||
        getFreshness(input.paiaReportFiledAt, input.now).status === "stale")
        regulatorMissing.push("Annual PAIA report (section 83(4)) filed within the last year (self-declared)");
    return [
        {
            id: "breach_ready",
            earned: breachMissing.length === 0,
            missing: breachMissing,
            requiresUpgrade: false,
            usesSelfDeclaration: true,
        },
        {
            id: "audit_ready",
            earned: auditMissing.length === 0,
            missing: auditMissing,
            requiresUpgrade: auditUpgrade,
            usesSelfDeclaration: false,
        },
        {
            id: "regulator_ready",
            earned: regulatorMissing.length === 0,
            missing: regulatorMissing,
            requiresUpgrade: false,
            usesSelfDeclaration: true,
        },
    ];
}
export function newlyEarnedMilestones(computed, recorded) {
    return computed.filter((m) => m.earned && !recorded[m.id]).map((m) => m.id);
}
export function canPublishBadge(standing, orgSlug) {
    return standing !== "unranked" && orgSlug !== null && orgSlug.length > 0;
}
