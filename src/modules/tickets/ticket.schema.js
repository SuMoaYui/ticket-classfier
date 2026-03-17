import { z } from 'zod';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

/**
 * Schema for creating a new support ticket.
 */
export const createTicketSchema = z.object({
  subject: z
    .string()
    .min(3, 'Subject must be at least 3 characters')
    .max(200, 'Subject must be at most 200 characters')
    .trim(),
  body: z
    .string()
    .min(10, 'Body must be at least 10 characters')
    .max(10000, 'Body must be at most 10,000 characters')
    .trim()
    .transform((val) => purify.sanitize(val)), // Mitigate XSS
  customer_email: z
    .string()
    .email('Invalid email address')
    .trim()
    .toLowerCase(),
  metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .default({}),
});

/**
 * Schema for query parameters when listing tickets.
 */
export const listTicketsQuerySchema = z.object({
  status: z.enum(['pending', 'open', 'in_progress', 'resolved', 'closed']).optional(),
  urgency: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  department: z
    .enum(['billing', 'engineering', 'sales', 'support', 'hr', 'general'])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  sort: z.enum(['created_at', 'urgency', 'priority_score']).optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});
