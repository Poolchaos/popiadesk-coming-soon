export const TEMPLATE_REVISIONS = {
    privacy_policy: 6,
    paia_manual: 6,
    consent_form: 4,
    dpa: 6,
    breach_notification: 5,
    io_appointment: 3,
    marketing_consent: 4,
    employee_privacy: 3,
    cookie_policy: 2,
    retention_schedule: 2,
};
export function templateRevision(type) {
    return TEMPLATE_REVISIONS[type];
}
