import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { AnthropicChatService } from '../../services/llm/anthropic-chat.service.js';
import logger from '../../utils/logger.js';

@injectable()
export class ChatController {
  constructor(
    @inject(AnthropicChatService) private readonly chatService: AnthropicChatService
  ) {}

  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { message, contextPage } = req.body;
      logger.info('Procesando mensaje del chatbot KIN', { contextPage });

      const reply = await this.chatService.generateReply(message, contextPage);

      res.status(200).json({
        success: true,
        data: { reply },
      });
    } catch (error) {
      next(error);
    }
  }
}
