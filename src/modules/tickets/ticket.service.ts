import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';
import { TicketRepository, type FindAllResult, type TicketStats, type TicketUpdates } from './ticket.repository.js';
import { Ticket } from './ticket.entity.js';
import { ticketQueue } from '../../services/queue/ticket.queue.js';
import logger from '../../utils/logger.js';
import type { CreateTicketInput, ListTicketsQuery } from './ticket.schema.js';

/**
 * Ticket Service — orchestrates classification, rule application, and persistence.
 */
@injectable()
export class TicketService {
  constructor(
    @inject(TicketRepository) private repo: TicketRepository
  ) {}
  
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
    const ticket = this.repo.create({
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
    return this.repo.findById(id);
  }

  /**
   * List tickets with filters and pagination.
   */
  listTickets(query: Partial<ListTicketsQuery> = {}): FindAllResult {
    return this.repo.findAll(query);
  }

  /**
   * Update a ticket.
   */
  updateTicket(id: string, updates: TicketUpdates): Ticket | null {
    return this.repo.update(id, updates);
  }

  /**
   * Get summary statistics.
   */
  getStats(): TicketStats {
    return this.repo.getStats();
  }
}
