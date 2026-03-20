import { getDatabase } from '../../db/database.js';
import type { ListTicketsQuery } from './ticket.schema.js';

/** Represents a ticket row as stored in the database. */
export interface Ticket {
  id: string;
  subject: string;
  body: string;
  customer_email: string;
  urgency: string;
  sentiment: string;
  department: string;
  status: string;
  confidence: number;
  reasoning: string;
  llm_raw_response: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** Raw ticket row from SQLite (metadata is a JSON string). */
interface TicketRow {
  id: string;
  subject: string;
  body: string;
  customer_email: string;
  urgency: string;
  sentiment: string;
  department: string;
  status: string;
  confidence: number;
  reasoning: string;
  llm_raw_response: string;
  metadata: string;
  created_at: string;
  updated_at: string;
}

/** Input for creating a new ticket in the repository. */
export interface CreateTicketData {
  id: string;
  subject: string;
  body: string;
  customer_email: string;
  urgency?: string;
  sentiment?: string;
  department?: string;
  status?: string;
  confidence?: number;
  reasoning?: string;
  llm_raw_response?: string;
  metadata?: Record<string, unknown>;
}

/** Result from listing tickets. */
export interface FindAllResult {
  tickets: Ticket[];
  total: number;
  limit: number;
  offset: number;
}

/** Aggregated statistics. */
export interface TicketStats {
  total: number;
  byUrgency: Record<string, number>;
  bySentiment: Record<string, number>;
  byDepartment: Record<string, number>;
  byStatus: Record<string, number>;
  averageConfidence: number;
}

/** Fields that can be updated on a ticket. */
export interface TicketUpdates {
  subject?: string;
  body?: string;
  customer_email?: string;
  urgency?: string;
  sentiment?: string;
  department?: string;
  status?: string;
  confidence?: number;
  reasoning?: string;
  llm_raw_response?: string;
  [key: string]: unknown;
}

/**
 * Ticket Repository — data access layer for the tickets table.
 */
export class TicketRepository {
  /**
   * Create a new ticket record.
   */
  create(ticket: CreateTicketData): Ticket {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO tickets (id, subject, body, customer_email, urgency, sentiment,
        department, status, confidence, reasoning, llm_raw_response, metadata)
      VALUES (@id, @subject, @body, @customer_email, @urgency, @sentiment,
        @department, @status, @confidence, @reasoning, @llm_raw_response, @metadata)
    `);

    stmt.run({
      id: ticket.id,
      subject: ticket.subject,
      body: ticket.body,
      customer_email: ticket.customer_email,
      urgency: ticket.urgency ?? 'medium',
      sentiment: ticket.sentiment ?? 'neutral',
      department: ticket.department ?? 'general',
      status: ticket.status ?? 'open',
      confidence: ticket.confidence ?? 0,
      reasoning: ticket.reasoning ?? '',
      llm_raw_response: ticket.llm_raw_response ?? '',
      metadata: JSON.stringify(ticket.metadata ?? {}),
    });

    return this.findById(ticket.id)!;
  }

  /**
   * Find a ticket by its ID.
   */
  findById(id: string): Ticket | null {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id) as TicketRow | undefined;
    return row ? this._deserialize(row) : null;
  }

  /**
   * List tickets with optional filters, pagination, and sorting.
   */
  findAll(options: Partial<ListTicketsQuery> = {}): FindAllResult {
    const db = getDatabase();
    const {
      status, urgency, department,
      limit = 20, offset = 0,
      sort = 'created_at', order = 'desc',
    } = options;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (urgency) {
      conditions.push('urgency = ?');
      params.push(urgency);
    }
    if (department) {
      conditions.push('department = ?');
      params.push(department);
    }

    const where = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Validate sort column to prevent SQL injection
    const allowedSorts = ['created_at', 'urgency', 'updated_at'];
    const safeSort = allowedSorts.includes(sort) ? sort : 'created_at';
    const safeOrder = order === 'asc' ? 'ASC' : 'DESC';

    const total = (db
      .prepare(`SELECT COUNT(*) as count FROM tickets ${where}`)
      .get(...params) as { count: number }).count;

    const rows = db
      .prepare(
        `SELECT * FROM tickets ${where} ORDER BY ${safeSort} ${safeOrder} LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset) as TicketRow[];

    return {
      tickets: rows.map((r) => this._deserialize(r)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Update a ticket by ID.
   */
  update(id: string, updates: TicketUpdates): Ticket | null {
    const db = getDatabase();
    const fields: string[] = [];
    const params: unknown[] = [];

    const updatableFields = ['subject', 'body', 'customer_email', 'urgency', 'sentiment',
      'department', 'status', 'confidence', 'reasoning'];

    for (const [key, value] of Object.entries(updates)) {
      if (updatableFields.includes(key)) {
        fields.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (fields.length === 0) return this.findById(id);

    fields.push("updated_at = datetime('now')");
    params.push(id);

    db.prepare(`UPDATE tickets SET ${fields.join(', ')} WHERE id = ?`).run(
      ...params
    );

    return this.findById(id);
  }

  /**
   * Get aggregated statistics across all tickets.
   */
  getStats(): TicketStats {
    const db = getDatabase();

    const total = (db.prepare('SELECT COUNT(*) as count FROM tickets').get() as { count: number }).count;

    const byUrgency = db
      .prepare(
        'SELECT urgency, COUNT(*) as count FROM tickets GROUP BY urgency'
      )
      .all() as Array<{ urgency: string; count: number }>;

    const bySentiment = db
      .prepare(
        'SELECT sentiment, COUNT(*) as count FROM tickets GROUP BY sentiment'
      )
      .all() as Array<{ sentiment: string; count: number }>;

    const byDepartment = db
      .prepare(
        'SELECT department, COUNT(*) as count FROM tickets GROUP BY department'
      )
      .all() as Array<{ department: string; count: number }>;

    const byStatus = db
      .prepare(
        'SELECT status, COUNT(*) as count FROM tickets GROUP BY status'
      )
      .all() as Array<{ status: string; count: number }>;

    const avgConfidence = (db
      .prepare('SELECT AVG(confidence) as avg FROM tickets')
      .get() as { avg: number | null }).avg;

    return {
      total,
      byUrgency: this._toMap(byUrgency, 'urgency'),
      bySentiment: this._toMap(bySentiment, 'sentiment'),
      byDepartment: this._toMap(byDepartment, 'department'),
      byStatus: this._toMap(byStatus, 'status'),
      averageConfidence: avgConfidence
        ? Math.round(avgConfidence * 100) / 100
        : 0,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private _deserialize(row: TicketRow): Ticket {
    return {
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) as Record<string, unknown> : {},
    };
  }

  private _toMap(rows: Array<Record<string, unknown>>, keyField: string): Record<string, number> {
    const map: Record<string, number> = {};
    for (const row of rows) {
      const key = row[keyField] as string;
      map[key] = row.count as number;
    }
    return map;
  }
}
