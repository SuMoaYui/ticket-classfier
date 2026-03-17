import { v4 as uuidv4 } from 'uuid';
import { TicketRepository } from './ticket.repository.js';
import { ticketQueue } from '../../services/queue/ticket.queue.js';
import logger from '../../utils/logger.js';

const repo = new TicketRepository();

/**
 * Ticket Service — orchestrates classification, rule application, and persistence.
 */
export class TicketService {
  /**
   * Create and classify a new ticket.
   * Flow: receive → LLM classify → apply rules → persist → return enriched ticket.
   *
   * @param {object} data - Validated ticket input (subject, body, customer_email, metadata)
   * @returns {Promise<object>} Created and classified ticket
   */
  async createTicket(data) {
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
      metadata: data.metadata || {},
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
   * @param {string} id
   * @returns {object|null}
   */
  getTicket(id) {
    return repo.findById(id);
  }

  /**
   * List tickets with filters and pagination.
   * @param {object} query - Filter/pagination options
   * @returns {{ tickets: object[], total: number, limit: number, offset: number }}
   */
  listTickets(query = {}) {
    return repo.findAll(query);
  }

  /**
   * Update a ticket.
   * @param {string} id
   * @param {object} updates
   * @returns {object|null}
   */
  updateTicket(id, updates) {
    return repo.update(id, updates);
  }

  /**
   * Get summary statistics.
   * @returns {object}
   */
  getStats() {
    return repo.getStats();
  }
}
