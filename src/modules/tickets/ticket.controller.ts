import type { Request, Response, NextFunction } from 'express';
import { TicketService } from './ticket.service.js';
import { listTicketsQuerySchema, type CreateTicketInput } from './ticket.schema.js';
import logger from '../../utils/logger.js';

import { injectable, inject } from 'tsyringe';

/**
 * Ticket Controller — HTTP handler layer.
 */
@injectable()
export class TicketController {
  constructor(
    @inject(TicketService) private service: TicketService
  ) {}
  /**
   * POST /tickets — Create and classify a new ticket.
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = await this.service.createTicket(req.validatedBody as CreateTicketInput);

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
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = listTicketsQuerySchema.parse(req.query);
      const result = this.service.listTickets(query);

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
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticketId = req.params.id as string;
      const ticket = this.service.getTicket(ticketId);

      if (!ticket) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `Ticket with ID "${ticketId}" not found.`,
          },
        });
        return;
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
  async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = this.service.getStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
