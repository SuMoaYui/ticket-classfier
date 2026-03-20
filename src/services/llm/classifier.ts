import config from '../../config/index.js';
import { classifyWithMock, type ClassificationResultWithMeta } from './mock-classifier.js';
import { classifyWithAnthropic } from './anthropic-classifier.js';
import logger from '../../utils/logger.js';

/**
 * Unified classifier facade.
 * Routes to mock or Anthropic based on LLM_MODE configuration.
 */
export async function classifyTicket(subject: string, body: string): Promise<ClassificationResultWithMeta> {
  const mode = config.llmMode;

  logger.info(`Classifying ticket with mode: ${mode}`, {
    subjectPreview: subject.substring(0, 60),
  });

  const startTime = Date.now();
  let result;

  switch (mode) {
    case 'anthropic':
      result = await classifyWithAnthropic(subject, body);
      break;
    case 'mock':
    default:
      result = await classifyWithMock(subject, body);
      break;
  }

  const elapsed = Date.now() - startTime;
  logger.info(`Classification complete in ${elapsed}ms`, {
    urgency: result.urgency,
    sentiment: result.sentiment,
    department: result.department,
    confidence: result.confidence,
    mode,
  });

  return {
    ...result,
    classifiedBy: mode,
    classificationTimeMs: elapsed,
  };
}
