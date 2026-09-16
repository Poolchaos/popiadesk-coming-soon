export const plans = {
    trial: {
        tier: "trial",
        name: "Free Trial",
        priceMonthly: 0,
        priceAnnual: 0,
        priceDisplay: "Free",
        priceAnnualDisplay: "Free",
        maxUsers: 3,
        maxDocuments: 5,
        features: {
            dsrManagement: true,
            gapAnalysis: true,
            teamInvites: true,
            supplierManagement: false,
            dataMap: false,
            auditTrail: false,
            websiteScanning: false,
            complianceBadge: true,
        },
    },
    starter: {
        tier: "starter",
        name: "Starter",
        priceMonthly: 29900,
        priceAnnual: 287000,
        priceDisplay: "R299/mo",
        priceAnnualDisplay: "R2,870/yr",
        maxUsers: 1,
        maxDocuments: 5,
        features: {
            dsrManagement: true,
            gapAnalysis: false,
            teamInvites: false,
            supplierManagement: false,
            dataMap: false,
            auditTrail: false,
            websiteScanning: false,
            complianceBadge: true,
        },
    },
    professional: {
        tier: "professional",
        name: "Professional",
        priceMonthly: 59900,
        priceAnnual: 575000,
        priceDisplay: "R599/mo",
        priceAnnualDisplay: "R5,750/yr",
        maxUsers: 3,
        maxDocuments: -1,
        features: {
            dsrManagement: true,
            gapAnalysis: true,
            teamInvites: true,
            supplierManagement: false,
            dataMap: false,
            auditTrail: false,
            websiteScanning: true,
            complianceBadge: true,
        },
    },
    business: {
        tier: "business",
        name: "Business",
        priceMonthly: 99900,
        priceAnnual: 959000,
        priceDisplay: "R999/mo",
        priceAnnualDisplay: "R9,590/yr",
        maxUsers: 10,
        maxDocuments: -1,
        features: {
            dsrManagement: true,
            gapAnalysis: true,
            teamInvites: true,
            supplierManagement: true,
            dataMap: true,
            auditTrail: true,
            websiteScanning: true,
            complianceBadge: true,
        },
    },
};
export function getPlanPrice(tier, cycle) {
    const plan = plans[tier];
    return cycle === "annual" ? plan.priceAnnual : plan.priceMonthly;
}
export const TRIAL_DAYS = 14;
export function trialEndsFrom(start = new Date()) {
    const end = new Date(start);
    end.setDate(end.getDate() + TRIAL_DAYS);
    return end;
}
export function getTrialDaysRemaining(trialEndsAt) {
    if (!trialEndsAt)
        return null;
    const now = new Date();
    const diff = trialEndsAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
export function isTrialExpired(trialEndsAt) {
    if (!trialEndsAt)
        return false;
    return new Date() > trialEndsAt;
}
export function getTrialWarningLevel(daysRemaining) {
    if (daysRemaining === null)
        return "none";
    if (daysRemaining <= 0)
        return "critical";
    if (daysRemaining <= 2)
        return "warning";
    if (daysRemaining <= 7)
        return "info";
    return "none";
}
export function periodEndFrom(lastPaymentAt, cycle) {
    const end = new Date(lastPaymentAt.getTime());
    const day = end.getUTCDate();
    if (cycle === "annual") {
        end.setUTCFullYear(end.getUTCFullYear() + 1);
    }
    else {
        end.setUTCMonth(end.getUTCMonth() + 1);
    }
    if (end.getUTCDate() !== day)
        end.setUTCDate(0);
    return end;
}
export function resolvePeriodEnd(org, lastPaymentAt, runDate, now = new Date()) {
    if (org.status === "past_due" || org.status === "cancelled")
        return null;
    if (org.status === "trialing") {
        const trialEnd = org.trialEndsAt;
        return trialEnd && trialEnd.getTime() > now.getTime() ? trialEnd : null;
    }
    const computed = lastPaymentAt ? periodEndFrom(lastPaymentAt, org.billingCycle) : null;
    const future = [runDate, computed].filter((d) => d instanceof Date && d.getTime() > now.getTime());
    if (future.length === 0)
        return null;
    return future.reduce((a, b) => (a.getTime() >= b.getTime() ? a : b));
}
export const PAST_DUE_GRACE_DAYS = 7;
export const BILLING_COMING_SOON_MESSAGE = "Paid plans are launching soon. Checkout will open once payments go live.";
