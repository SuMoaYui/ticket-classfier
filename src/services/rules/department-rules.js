import logger from '../../utils/logger.js';

/**
 * Known departments and their escalation contacts.
 */
const DEPARTMENTS = {
  billing: { name: 'Billing', escalation: 'billing-lead@company.com' },
  engineering: { name: 'Engineering', escalation: 'eng-oncall@company.com' },
  sales: { name: 'Sales', escalation: 'sales-manager@company.com' },
  support: { name: 'Customer Support', escalation: 'support-lead@company.com' },
  hr: { name: 'Human Resources', escalation: 'hr-director@company.com' },
  general: { name: 'General', escalation: 'admin@company.com' },
};

/**
 * Priority weights for SLA ordering.
 */
const URGENCY_PRIORITY = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Apply business rules to the classification result.
 * Can escalate, override, or enrich the classification.
 *
 * @param {object} classification - LLM classification result
 * @param {object} ticket - Original ticket data (subject, body, customer_email)
 * @returns {object} Enriched classification with rules applied
 */
export function applyDepartmentRules(classification, ticket) {
  const result = { ...classification };
  const appliedRules = [];

  // ─── Rule 1: Validate department ─────────────────────────────────────────
  if (!DEPARTMENTS[result.department]) {
    logger.warn(`Unknown department "${result.department}", defaulting to general`);
    result.department = 'general';
    appliedRules.push('unknown-department-fallback');
  }

  // ─── Rule 2: Critical urgency + angry sentiment → auto-escalate ────────
  if (result.urgency === 'critical' && result.sentiment === 'angry') {
    result.escalated = true;
    result.escalationReason =
      'Ticket marked as critical urgency with angry customer sentiment — requires immediate attention.';
    appliedRules.push('critical-angry-escalation');
    logger.info('Ticket auto-escalated: critical + angry', {
      department: result.department,
    });
  }

  // ─── Rule 3: Critical urgency on engineering → notify on-call ──────────
  if (result.urgency === 'critical' && result.department === 'engineering') {
    result.notifyOncall = true;
    result.oncallEmail = DEPARTMENTS.engineering.escalation;
    appliedRules.push('engineering-oncall-notification');
  }

  // ─── Rule 4: Billing + angry → escalate to billing lead ────────────────
  if (result.department === 'billing' && result.sentiment === 'angry') {
    result.escalated = true;
    result.escalationReason =
      result.escalationReason ||
      'Angry customer on billing issue — escalate to billing lead.';
    result.escalationContact = DEPARTMENTS.billing.escalation;
    appliedRules.push('billing-angry-escalation');
  }

  // ─── Rule 5: Add SLA priority score ────────────────────────────────────
  const sentimentBoost = result.sentiment === 'angry' ? 1 : result.sentiment === 'frustrated' ? 0.5 : 0;
  result.priorityScore =
    (URGENCY_PRIORITY[result.urgency] || 2) + sentimentBoost;

  // ─── Rule 6: Set department metadata ───────────────────────────────────
  const dept = DEPARTMENTS[result.department];
  if (dept) {
    result.departmentName = dept.name;
    result.departmentEscalation = dept.escalation;
  }

  result.appliedRules = appliedRules;

  return result;
}

/**
 * Get the list of valid departments.
 */
export function getValidDepartments() {
  return Object.entries(DEPARTMENTS).map(([key, value]) => ({
    id: key,
    ...value,
  }));
}
