import { z } from 'zod';

export const chatMessageSchema = z.object({
  message: z.string().min(1, 'No ingresaste ningún mensaje.'),
  contextPage: z.string().default('Panel General'),
});
