import { TicketService } from './ticket.service.js';
import { listTicketsQuerySchema } from './ticket.schema.js';
import logger from '../../utils/logger.js';

const service = new TicketService();

/**
 * Ticket Controller — HTTP handler layer.
 */
export class TicketController {
  /**
   * POST /tickets — Create and classify a new ticket.
   */
  async create(req, res, next) {
    try {
      const ticket = await service.createTicket(req.validatedBody);

      res.status(202).json({
        success: true,
        data: ticket,
        message: 'Ticket received and queued for intelligent classification.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /tickets — List tickets with optional filters.
   */
  async list(req, res, next) {
    try {
      const query = listTicketsQuerySchema.parse(req.query);
      const result = service.listTickets(query);

      res.json({
        success: true,
        data: result.tickets,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.offset + result.limit < result.total,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /tickets/:id — Get a single ticket by ID.
   */
  async getById(req, res, next) {
    try {
      const ticket = service.getTicket(req.params.id);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Ticket with ID "${req.params.id}" not found.`,
          },
        });
      }

      res.json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /tickets/stats/summary — Get aggregate statistics.
   */
  async getStats(req, res, next) {
    try {
      const stats = service.getStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
