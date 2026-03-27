import { Router } from 'express';
import { TicketController } from './ticket.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createTicketSchema } from './ticket.schema.js';

import { container } from 'tsyringe';

const router = Router();
const controller = container.resolve(TicketController);

// All ticket routes require authentication
router.use(authenticate);

// Statistics route (must be before /:id to avoid conflict)
router.get('/stats/summary', controller.getStats.bind(controller));

// CRUD routes
router.post('/', validate(createTicketSchema), controller.create.bind(controller));
router.get('/', controller.list.bind(controller));
router.get('/:id', controller.getById.bind(controller));

export default router;
