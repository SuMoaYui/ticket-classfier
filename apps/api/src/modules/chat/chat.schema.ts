import { z } from 'zod';

// ─── Prompt Injection Patterns ──────────────────────────────────────────────
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?above/i,
  /you\s+are\s+now\s+/i,
  /system\s*:\s*/i,
  /\bact\s+as\b/i,
  /\bpretend\s+(you\s+are|to\s+be)\b/i,
  /\bdo\s+not\s+follow\b.*\binstructions\b/i,
  /\breset\b.*\bprompt\b/i,
  /\bnew\s+instructions\b/i,
];

function containsInjection(text: string): boolean {
  return INJECTION_PATTERNS.some(pattern => pattern.test(text));
}

export const chatMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty.')
    .max(2000, 'Message too long. Maximum 2000 characters.')
    .refine(
      (msg) => !containsInjection(msg),
      { message: 'Message contains disallowed patterns.' }
    ),
  contextPage: z.string().max(100).default('Panel General'),
});
