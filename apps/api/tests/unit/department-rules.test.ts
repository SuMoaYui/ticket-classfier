import { describe, it, expect } from 'vitest';
import { applyDepartmentRules, getValidDepartments } from '../../src/services/rules/department-rules.js';

describe('Department Rules Engine', () => {
  describe('Department Validation', () => {
    it('should fallback unknown departments to general', () => {
      const result = applyDepartmentRules(
        { urgency: 'medium', sentiment: 'neutral', department: 'unknown_dept', confidence: 0.5, reasoning: 'test' },
        { subject: 'Test', body: 'Test body' }
      );
      expect(result.department).toBe('general');
      expect(result.appliedRules).toContain('unknown-department-fallback');
    });

    it('should keep valid departments unchanged', () => {
      const result = applyDepartmentRules(
        { urgency: 'medium', sentiment: 'neutral', department: 'billing', confidence: 0.7, reasoning: 'test' },
        { subject: 'Test', body: 'Test' }
      );
      expect(result.department).toBe('billing');
    });
  });

  describe('Escalation Rules', () => {
    it('should escalate critical + angry tickets', () => {
      const result = applyDepartmentRules(
        { urgency: 'critical', sentiment: 'angry', department: 'engineering', confidence: 0.9, reasoning: 'test' },
        { subject: 'System down', body: 'Everything is broken' }
      );
      expect(result.escalated).toBe(true);
      expect(result.escalationReason).toBeDefined();
      expect(result.appliedRules).toContain('critical-angry-escalation');
    });

    it('should NOT escalate medium + neutral tickets', () => {
      const result = applyDepartmentRules(
        { urgency: 'medium', sentiment: 'neutral', department: 'support', confidence: 0.5, reasoning: 'test' },
        { subject: 'Question', body: 'Simple question' }
      );
      expect(result.escalated).toBeUndefined();
    });

    it('should escalate angry billing tickets', () => {
      const result = applyDepartmentRules(
        { urgency: 'high', sentiment: 'angry', department: 'billing', confidence: 0.8, reasoning: 'test' },
        { subject: 'Wrong charge', body: 'Overcharged on my bill' }
      );
      expect(result.escalated).toBe(true);
      expect(result.appliedRules).toContain('billing-angry-escalation');
    });
  });

  describe('Engineering On-Call Notification', () => {
    it('should flag on-call notification for critical engineering tickets', () => {
      const result = applyDepartmentRules(
        { urgency: 'critical', sentiment: 'neutral', department: 'engineering', confidence: 0.9, reasoning: 'test' },
        { subject: 'Server down', body: 'Production outage' }
      );
      expect(result.notifyOncall).toBe(true);
      expect(result.oncallEmail).toBe('eng-oncall@company.com');
      expect(result.appliedRules).toContain('engineering-oncall-notification');
    });
  });

  describe('Priority Score', () => {
    it('should calculate higher priority for critical urgency', () => {
      const critical = applyDepartmentRules(
        { urgency: 'critical', sentiment: 'neutral', department: 'support', confidence: 0.5, reasoning: 'test' },
        {}
      );
      const low = applyDepartmentRules(
        { urgency: 'low', sentiment: 'neutral', department: 'support', confidence: 0.5, reasoning: 'test' },
        {}
      );
      expect(critical.priorityScore).toBeGreaterThan(low.priorityScore);
    });

    it('should boost priority for angry sentiment', () => {
      const angry = applyDepartmentRules(
        { urgency: 'medium', sentiment: 'angry', department: 'support', confidence: 0.5, reasoning: 'test' },
        {}
      );
      const neutral = applyDepartmentRules(
        { urgency: 'medium', sentiment: 'neutral', department: 'support', confidence: 0.5, reasoning: 'test' },
        {}
      );
      expect(angry.priorityScore).toBeGreaterThan(neutral.priorityScore);
    });
  });

  describe('getValidDepartments', () => {
    it('should return all known departments', () => {
      const departments = getValidDepartments();
      expect(departments.length).toBeGreaterThanOrEqual(5);
      const ids = departments.map((d) => d.id);
      expect(ids).toContain('billing');
      expect(ids).toContain('engineering');
      expect(ids).toContain('support');
    });
  });
});
