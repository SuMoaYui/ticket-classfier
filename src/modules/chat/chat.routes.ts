import { Router } from 'express';
import { ChatController } from './chat.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { chatMessageSchema } from './chat.schema.js';
import { container } from 'tsyringe';

const router = Router();
const controller = container.resolve(ChatController);

// Seguridad: El chatbot interactivo solo puede usarse si hay sesión.
router.use(authenticate);

// Endpoint único
router.post('/', validate(chatMessageSchema), controller.sendMessage.bind(controller));

export default router;
