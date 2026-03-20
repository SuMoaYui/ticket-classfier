import { ticketQueue } from '../services/queue/ticket.queue.js';
import { classifyTicket } from '../services/llm/classifier.js';
import { applyDepartmentRules } from '../services/rules/department-rules.js';
import { TicketRepository } from '../modules/tickets/ticket.repository.js';
import logger from '../utils/logger.js';

const repo = new TicketRepository();

/**
 * Background Worker for Ticket Classification
 * Listens to the queue, calls the LLM, and updates the database.
 */
export function startClassificationWorker(): void {
  logger.info('Background Classification Worker started.');

  ticketQueue.on('jobAdded', async (ticketId: string) => {
    logger.debug(`Worker picked up job for ticket ${ticketId}`);
    const job = ticketQueue.getJob(ticketId);
    
    if (!job) return;

    const { payload } = job;

    try {
      // 1. Heavy LLM processing
      const classification = await classifyTicket(
        payload.subject as string,
        payload.body as string
      );
      
      // 2. Apply business rules
      const enriched = applyDepartmentRules(classification, payload);

      // 3. Update the ticket in the database
      repo.update(ticketId, {
        urgency: enriched.urgency,
        sentiment: enriched.sentiment,
        department: enriched.department,
        status: enriched.escalated ? 'escalated' : 'open',
        confidence: enriched.confidence,
        reasoning: enriched.reasoning,
      });

      // Fetch newly updated row, manipulate metadata and update again (SQLite limitation workaround)
      const existingDbRow = repo.findById(ticketId);
      if (existingDbRow) {
          existingDbRow.metadata = {
            ...existingDbRow.metadata,
            classifiedBy: classification.classifiedBy,
            classificationTimeMs: classification.classificationTimeMs,
            priorityScore: enriched.priorityScore,
            escalated: enriched.escalated ?? false,
            escalationReason: enriched.escalationReason ?? null,
            appliedRules: enriched.appliedRules ?? [],
          };
          
          // Re-update the metadata column using a raw query bypassing repository limitations for simplicity
          const { getDatabase } = await import('../db/database.js');
          const db = getDatabase();
          db.prepare('UPDATE tickets SET metadata = ? WHERE id = ?').run(
              JSON.stringify(existingDbRow.metadata),
              ticketId
          );
      }

      logger.info(`Ticket ${ticketId} classification completed asynchronously.`, {
        urgency: enriched.urgency,
        department: enriched.department
      });

      ticketQueue.completeJob(ticketId);

    } catch (error) {
      const err = error as Error;
      logger.error(`Critical Error classifying ticket ${ticketId}`, { error: err.message });
      // Fallback: Mark ticket as failed/manual review needed
      repo.update(ticketId, {
        status: 'open',
        reasoning: 'Automated classification failed. Agent review required.',
        confidence: 0,
      });
      ticketQueue.completeJob(ticketId);
    }
  });
}
