import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { getDatabase, closeDatabase } from '../../src/db/database.js';

const API_KEY = 'test-api-key-123';
const BASE = '/api/v1';

describe('Tickets API Integration', () => {
  let createdTicketId: string;

  beforeAll(() => {
    // Initialize the in-memory test database
    const db = getDatabase();
    // Ensure the test API key exists
    const existing = db.prepare('SELECT COUNT(*) as count FROM api_keys WHERE key = ?').get(API_KEY) as { count: number };
    if (existing.count === 0) {
      db.prepare('INSERT INTO api_keys (key, name) VALUES (?, ?)').run(API_KEY, 'Test Key');
    }
  });

  afterAll(() => {
    closeDatabase();
  });

  // Helper to wait for background jobs to finish by polling the API
  const waitForClassification = async (id: string, maxRetries = 10) => {
    for (let i = 0; i < maxRetries; i++) {
      const res = await request(app).get(`${BASE}/tickets/${id}`).set('X-API-Key', API_KEY);
      if (res.body.data && res.body.data.status !== 'pending') {
        return res.body.data;
      }
      await new Promise(r => setTimeout(r, 100)); // wait 100ms
    }
    throw new Error('Ticket classification timeout');
  };

  // ─── Health Check ─────────────────────────────────────────────────────────
  describe('GET /api/v1/health', () => {
    it('should return healthy status and database connection without auth', async () => {
      const res = await request(app).get(`${BASE}/health`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('healthy');
      expect(res.body.data.database).toBe('connected');
      expect(res.body.data.llmMode).toBe('mock');
    });
  });

  // ─── Authentication ───────────────────────────────────────────────────────
  describe('Authentication', () => {
    it('should reject requests without API key', async () => {
      const res = await request(app).get(`${BASE}/tickets`);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject requests with invalid API key', async () => {
      const res = await request(app)
        .get(`${BASE}/tickets`)
        .set('X-API-Key', 'invalid-key');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // ─── Create Ticket ────────────────────────────────────────────────────────
  describe('POST /api/v1/tickets', () => {
    it('should create and classify a critical billing ticket', async () => {
      const res = await request(app)
        .post(`${BASE}/tickets`)
        .set('X-API-Key', API_KEY)
        .send({
          subject: 'URGENTE: Cobro duplicado en factura',
          body: 'Estoy furioso porque me han realizado un cobro duplicado en mi tarjeta de crédito. Necesito un reembolso inmediatamente. Esto es inaceptable.',
          customer_email: 'cliente@ejemplo.com',
        });

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);

      const ticket = res.body.data;
      createdTicketId = ticket.id;

      expect(ticket.id).toBeDefined();
      expect(ticket.subject).toBe('URGENTE: Cobro duplicado en factura');
      expect(ticket.status).toBe('pending');

      // Wait for background worker
      const updatedTicket = await waitForClassification(createdTicketId);

      expect(updatedTicket.urgency).toBe('critical');
      expect(updatedTicket.sentiment).toBe('angry');
      expect(updatedTicket.department).toBe('billing');
      expect(updatedTicket.confidence).toBeGreaterThan(0);
      expect(updatedTicket.reasoning).toBeTruthy();
    });

    it('should create a low-urgency support ticket', async () => {
      const res = await request(app)
        .post(`${BASE}/tickets`)
        .set('X-API-Key', API_KEY)
        .send({
          subject: 'Consulta sobre contraseña',
          body: 'Hola, tengo una pregunta. ¿Cómo puedo cambiar mi contraseña de acceso a la cuenta? Sin prisa, gracias.',
          customer_email: 'usuario@test.com',
        });

      expect(res.status).toBe(202);
      const ticketId = res.body.data.id;

      const updatedTicket = await waitForClassification(ticketId);

      expect(updatedTicket.urgency).toBe('low');
      expect(updatedTicket.department).toBe('support');
    });

    it('should create an engineering ticket for bugs', async () => {
      const res = await request(app)
        .post(`${BASE}/tickets`)
        .set('X-API-Key', API_KEY)
        .send({
          subject: 'Bug crítico en API',
          body: 'La API devuelve error 500. El servidor está caído y el rendimiento es terrible. Esto está bloqueado en producción.',
          customer_email: 'dev@empresa.com',
        });

      expect(res.status).toBe(202);
      const ticketId = res.body.data.id;

      const updatedTicket = await waitForClassification(ticketId);

      expect(updatedTicket.urgency).toBe('critical');
      expect(updatedTicket.department).toBe('engineering');
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post(`${BASE}/tickets`)
        .set('X-API-Key', API_KEY)
        .send({ subject: 'No body' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.length).toBeGreaterThan(0);
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post(`${BASE}/tickets`)
        .set('X-API-Key', API_KEY)
        .send({
          subject: 'Test ticket',
          body: 'This is a test body with enough characters',
          customer_email: 'not-an-email',
        });

      expect(res.status).toBe(400);
    });
  });

  // ─── Get Ticket ───────────────────────────────────────────────────────────
  describe('GET /api/v1/tickets/:id', () => {
    it('should retrieve a ticket by ID', async () => {
      const res = await request(app)
        .get(`${BASE}/tickets/${createdTicketId}`)
        .set('X-API-Key', API_KEY);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdTicketId);
      expect(res.body.data.urgency).toBe('critical');
    });

    it('should return 404 for non-existent ticket', async () => {
      const res = await request(app)
        .get(`${BASE}/tickets/non-existent-id`)
        .set('X-API-Key', API_KEY);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ─── List Tickets ─────────────────────────────────────────────────────────
  describe('GET /api/v1/tickets', () => {
    it('should list all tickets', async () => {
      const res = await request(app)
        .get(`${BASE}/tickets`)
        .set('X-API-Key', API_KEY);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(3);
    });

    it('should filter tickets by urgency', async () => {
      const res = await request(app)
        .get(`${BASE}/tickets?urgency=critical`)
        .set('X-API-Key', API_KEY);

      expect(res.status).toBe(200);
      res.body.data.forEach((ticket: { urgency: string }) => {
        expect(ticket.urgency).toBe('critical');
      });
    });

    it('should filter tickets by department', async () => {
      const res = await request(app)
        .get(`${BASE}/tickets?department=billing`)
        .set('X-API-Key', API_KEY);

      expect(res.status).toBe(200);
      res.body.data.forEach((ticket: { department: string }) => {
        expect(ticket.department).toBe('billing');
      });
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get(`${BASE}/tickets?limit=1&offset=0`)
        .set('X-API-Key', API_KEY);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
      expect(res.body.pagination.hasMore).toBe(true);
    });
  });

  // ─── Statistics ───────────────────────────────────────────────────────────
  describe('GET /api/v1/tickets/stats/summary', () => {
    it('should return aggregate statistics', async () => {
      const res = await request(app)
        .get(`${BASE}/tickets/stats/summary`)
        .set('X-API-Key', API_KEY);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const stats = res.body.data;
      expect(stats.total).toBeGreaterThanOrEqual(3);
      expect(stats.byUrgency).toBeDefined();
      expect(stats.bySentiment).toBeDefined();
      expect(stats.byDepartment).toBeDefined();
      expect(stats.byStatus).toBeDefined();
      expect(typeof stats.averageConfidence).toBe('number');
    });
  });

  // ─── 404 Route ────────────────────────────────────────────────────────────
  describe('Unknown Routes', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/v1/unknown');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
