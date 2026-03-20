import { describe, it, expect } from 'vitest';
import { classifyWithMock } from '../../src/services/llm/mock-classifier.js';

describe('Mock Classifier', () => {
  describe('Urgency Detection', () => {
    it('should classify critical urgency for system-down keywords', async () => {
      const result = await classifyWithMock(
        'URGENTE: Sistema caído',
        'El sistema de producción está completamente caído desde hace 2 horas.'
      );
      expect(result.urgency).toBe('critical');
    });

    it('should classify high urgency for priority keywords', async () => {
      const result = await classifyWithMock(
        'Problema importante',
        'Necesitamos resolver esto pronto, es una prioridad para el equipo.'
      );
      expect(result.urgency).toBe('high');
    });

    it('should classify low urgency for informational queries', async () => {
      const result = await classifyWithMock(
        'Consulta sobre el servicio',
        'Hola, tengo una pregunta sobre la información de sus planes. Sin prisa.'
      );
      expect(result.urgency).toBe('low');
    });

    it('should default to medium urgency with no keywords', async () => {
      const result = await classifyWithMock(
        'Asunto general',
        'Me gustaría comentar algo sobre el producto.'
      );
      expect(result.urgency).toBe('medium');
    });
  });

  describe('Sentiment Detection', () => {
    it('should detect angry sentiment', async () => {
      const result = await classifyWithMock(
        'Inaceptable',
        'Estoy furioso con su servicio, es un pésimo servicio. Voy a contactar a mi abogado.'
      );
      expect(result.sentiment).toBe('angry');
    });

    it('should detect frustrated sentiment', async () => {
      const result = await classifyWithMock(
        'Otra vez el mismo problema',
        'Estoy frustrado porque llevo días intentando y nunca funciona correctamente.'
      );
      expect(result.sentiment).toBe('frustrated');
    });

    it('should detect satisfied sentiment', async () => {
      const result = await classifyWithMock(
        'Excelente servicio',
        'Gracias por la ayuda, estoy encantado con el resultado. Buen servicio.'
      );
      expect(result.sentiment).toBe('satisfied');
    });

    it('should default to neutral sentiment', async () => {
      const result = await classifyWithMock(
        'Actualización de datos',
        'Necesito actualizar mi dirección de envío en el sistema.'
      );
      expect(result.sentiment).toBe('neutral');
    });
  });

  describe('Department Routing', () => {
    it('should route billing tickets correctly', async () => {
      const result = await classifyWithMock(
        'Problema con factura',
        'He recibido un cobro duplicado en mi tarjeta. Necesito un reembolso.'
      );
      expect(result.department).toBe('billing');
    });

    it('should route engineering tickets correctly', async () => {
      const result = await classifyWithMock(
        'Bug en la aplicación',
        'La API devuelve un error 500 y el servidor está muy lento.'
      );
      expect(result.department).toBe('engineering');
    });

    it('should route support tickets correctly', async () => {
      const result = await classifyWithMock(
        'Ayuda con configuración',
        'No puedo iniciar sesión en mi cuenta. He olvidado mi contraseña.'
      );
      expect(result.department).toBe('support');
    });

    it('should route sales tickets correctly', async () => {
      const result = await classifyWithMock(
        'Cotización enterprise',
        'Queremos comprar una licencia enterprise para 500 usuarios. ¿Pueden enviar una demo?'
      );
      expect(result.department).toBe('sales');
    });

    it('should default to general department', async () => {
      const result = await classifyWithMock(
        'Comentario',
        'Solo quería dejar un comentario sobre algo.'
      );
      expect(result.department).toBe('general');
    });
  });

  describe('Confidence and Reasoning', () => {
    it('should return higher confidence for more keyword matches', async () => {
      const highKeywords = await classifyWithMock(
        'URGENTE: Factura con cobro erróneo',
        'Estoy furioso. He recibido un cobro duplicado en mi tarjeta de crédito. Necesito un reembolso inmediatamente. Es inaceptable.'
      );

      const lowKeywords = await classifyWithMock(
        'Comentario',
        'Un pequeño detalle sobre el producto.'
      );

      expect(highKeywords.confidence).toBeGreaterThan(lowKeywords.confidence);
    });

    it('should always include reasoning string', async () => {
      const result = await classifyWithMock(
        'Test subject',
        'Test body text'
      );
      expect(typeof result.reasoning).toBe('string');
      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });
});
