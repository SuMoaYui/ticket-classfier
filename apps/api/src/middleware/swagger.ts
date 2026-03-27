import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'KIN Smart Ticketing API',
      version: '1.0.0',
      description:
        'Intelligent Ticket Classification API powered by Anthropic Claude LLM. ' +
        'Supports async classification with sentiment analysis, urgency detection, ' +
        'and department routing via DDD architecture.',
      contact: {
        name: 'Keydiem',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      { url: '/api/v1', description: 'API v1' },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for authentication. Pass via the X-API-Key header.',
        },
      },
      schemas: {
        Ticket: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            subject: { type: 'string', example: 'Cannot login to my account' },
            body: { type: 'string', example: 'I have been trying to login for the past hour...' },
            customer_email: { type: 'string', format: 'email', example: 'user@example.com' },
            urgency: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            sentiment: { type: 'string', enum: ['angry', 'frustrated', 'neutral', 'satisfied'] },
            department: { type: 'string', enum: ['billing', 'technical', 'sales', 'general'] },
            status: { type: 'string', enum: ['pending', 'open', 'classified', 'escalated', 'resolved'] },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            reasoning: { type: 'string' },
            metadata: { type: 'object' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        CreateTicketInput: {
          type: 'object',
          required: ['subject', 'body', 'customer_email'],
          properties: {
            subject: { type: 'string', minLength: 3, maxLength: 200, example: 'Billing issue with last invoice' },
            body: { type: 'string', minLength: 10, maxLength: 5000, example: 'I was charged twice for my subscription this month. Please help.' },
            customer_email: { type: 'string', format: 'email', example: 'john@example.com' },
            metadata: { type: 'object', example: { source: 'web' } },
          },
        },
        ChatInput: {
          type: 'object',
          required: ['message'],
          properties: {
            message: { type: 'string', minLength: 1, maxLength: 2000, example: 'What is the API key?' },
            contextPage: { type: 'string', example: 'dashboard' },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Invalid request body' },
              },
            },
          },
        },
      },
    },
    security: [{ ApiKeyAuth: [] }],
  },
  apis: [], // We define paths inline below
};

// ─── Inline path definitions ────────────────────────────────────────────────
const paths = {
  '/tickets': {
    get: {
      tags: ['Tickets'],
      summary: 'List all tickets',
      description: 'Retrieve a paginated list of tickets with optional filters for status, urgency, and department.',
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'open', 'classified', 'escalated', 'resolved'] } },
        { name: 'urgency', in: 'query', schema: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] } },
        { name: 'department', in: 'query', schema: { type: 'string', enum: ['billing', 'technical', 'sales', 'general'] } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        { name: 'sort', in: 'query', schema: { type: 'string', enum: ['created_at', 'urgency', 'updated_at'], default: 'created_at' } },
        { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
      ],
      responses: {
        '200': { description: 'List of tickets', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
        '401': { description: 'Unauthorized — missing API key' },
      },
    },
    post: {
      tags: ['Tickets'],
      summary: 'Create a new ticket',
      description: 'Submit a new support ticket. The ticket is immediately persisted with status "pending" and enqueued for async LLM classification.',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateTicketInput' } } },
      },
      responses: {
        '201': { description: 'Ticket created and enqueued for classification', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } } },
        '400': { description: 'Validation error' },
        '401': { description: 'Unauthorized' },
      },
    },
  },
  '/tickets/{id}': {
    get: {
      tags: ['Tickets'],
      summary: 'Get a ticket by ID',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      responses: {
        '200': { description: 'Ticket details', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ticket' } } } },
        '404': { description: 'Ticket not found' },
      },
    },
    patch: {
      tags: ['Tickets'],
      summary: 'Update a ticket',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
      requestBody: {
        content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' }, urgency: { type: 'string' } } } } },
      },
      responses: { '200': { description: 'Updated ticket' }, '404': { description: 'Ticket not found' } },
    },
  },
  '/tickets/stats': {
    get: {
      tags: ['Tickets'],
      summary: 'Get ticket statistics',
      description: 'Returns aggregated counts by urgency, sentiment, department, status, and average confidence.',
      responses: { '200': { description: 'Ticket statistics' } },
    },
  },
  '/chat': {
    post: {
      tags: ['Chat (KIN Assistant)'],
      summary: 'Send a message to KIN chatbot',
      description: 'Send a message to the KIN AI assistant. Uses Anthropic Claude in production mode or a keyword-based simulator in mock mode.',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ChatInput' } } },
      },
      responses: {
        '200': { description: 'Chat response from KIN', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { reply: { type: 'string' } } } } } } } },
        '400': { description: 'Validation error' },
      },
    },
  },
  '/health': {
    get: {
      tags: ['System'],
      summary: 'Health check',
      description: 'Returns API health status, database connectivity, LLM mode, and uptime.',
      security: [],
      responses: {
        '200': { description: 'API is healthy' },
        '503': { description: 'Database connection failed' },
      },
    },
  },
};

/**
 * Mount Swagger UI at /api/docs
 */
export function setupSwagger(app: Express): void {
  const spec = swaggerJsdoc(options) as Record<string, unknown>;
  // Merge inline paths
  spec.paths = paths;

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'KIN API Documentation',
  }));
}
