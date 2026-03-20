import { v4 as uuidv4 } from 'uuid';
import { TicketRepository, type Ticket, type FindAllResult, type TicketStats, type TicketUpdates } from './ticket.repository.js';
import { ticketQueue } from '../../services/queue/ticket.queue.js';
import logger from '../../utils/logger.js';
import type { CreateTicketInput, ListTicketsQuery } from './ticket.schema.js';

const repo = new TicketRepository();

/**
 * Ticket Service — orchestrates classification, rule application, and persistence.
 */
export class TicketService {
  /**
   * Create and classify a new ticket.
   * Flow: receive → LLM classify → apply rules → persist → return enriched ticket.
   */
  async createTicket(data: CreateTicketInput): Promise<Ticket> {
    const ticketId = uuidv4();

    logger.info('Creating new ticket (Async Mode)', {
      id: ticketId,
      subject: data.subject.substring(0, 60),
      customer: data.customer_email,
    });

    // Step 1: Persist the ticket in 'pending' state
    const ticket = repo.create({
      id: ticketId,
      subject: data.subject,
      body: data.body,
      customer_email: data.customer_email,
      urgency: 'medium', // Default values until classified
      sentiment: 'neutral',
      department: 'general',
      status: 'pending',
      confidence: 0,
      metadata: (data.metadata as Record<string, unknown>) ?? {},
    });

    // Step 2: Enqueue the background job
    ticketQueue.addConfiguredJob(ticketId, data);

    logger.info('Ticket created and enqueued for background classification', {
      id: ticketId
    });

    return ticket;
  }

  /**
   * Get a ticket by ID.
   */
  getTicket(id: string): Ticket | null {
    return repo.findById(id);
  }

  /**
   * List tickets with filters and pagination.
   */
  listTickets(query: Partial<ListTicketsQuery> = {}): FindAllResult {
    return repo.findAll(query);
  }

  /**
   * Update a ticket.
   */
  updateTicket(id: string, updates: TicketUpdates): Ticket | null {
    return repo.update(id, updates);
  }

  /**
   * Get summary statistics.
   */
  getStats(): TicketStats {
    return repo.getStats();
  }
}
