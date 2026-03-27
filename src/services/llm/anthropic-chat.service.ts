import Anthropic from '@anthropic-ai/sdk';
import { injectable } from 'tsyringe';
import config from '../../config/index.js';
import logger from '../../utils/logger.js';

@injectable()
export class AnthropicChatService {
  private client: Anthropic | null = null;

  constructor() {
    if (config.anthropic.apiKey) {
      this.client = new Anthropic({ apiKey: config.anthropic.apiKey });
    }
  }

  async generateReply(userMessage: string, contextPage: string): Promise<string> {
    // Si estamos en entorno sin API Key (Mock), simulamos la respuesta para no bloquear el desarrollo
    if (config.llmMode === 'mock' || !this.client) {
      await new Promise(r => setTimeout(r, 600)); // Retraso natural
      
      if (userMessage.startsWith('__PROACTIVE__')) {
         return `¡Hola! Soy KIN. Veo que estás explorando la pestaña de *${contextPage}*. ¿En qué te puedo asesorar?`;
      }
      return `¡Entendido! Soy KIN (Modo Simulación). Como sabes que estás en *${contextPage}*, registraré que dijiste: "${userMessage}".`;
    }

    const systemPrompt = `Eres KIN, el robot asistente conversacional exclusivo de KIN Smart Ticketing & Support. 
El usuario se encuentra visualmente en la pantalla: [${contextPage}]. 
Si te envían el texto oculto "__PROACTIVE__", significa que acaban de entrar a esa pantalla y debes saludarlos proactivamente ofreciendo ayuda relacionada con lo que pueden hacer ahí.
De lo contrario, responde amablemente a su duda usando el contexto de dónde están.
Tu personalidad es amable, altamente inteligente, robótica pero cálida, con respuestas muy concisas en español. Nunca uses formatos markdown complejos si no son necesarios.`;

    try {
      const response = await this.client.messages.create({
        model: config.anthropic.model,
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });
      return response.content[0]?.type === 'text' ? response.content[0].text : 'Sin respuesta procesable.';
    } catch (error) {
      logger.error('Error procesando respuesta del Chatbot AI', { error: (error as Error).message });
      throw new Error('Lo siento, mis circuitos de lenguaje están saturados (Fallo de API).');
    }
  }
}
