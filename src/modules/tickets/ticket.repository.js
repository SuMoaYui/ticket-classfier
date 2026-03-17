import { getDatabase } from '../../db/database.js';

/**
 * Ticket Repository — data access layer for the tickets table.
 */
export class TicketRepository {
  /**
   * Create a new ticket record.
   * @param {object} ticket - Ticket data to insert
   * @returns {object} The inserted ticket
   */
  create(ticket) {
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
      urgency: ticket.urgency || 'medium',
      sentiment: ticket.sentiment || 'neutral',
      department: ticket.department || 'general',
      status: ticket.status || 'open',
      confidence: ticket.confidence || 0,
      reasoning: ticket.reasoning || '',
      llm_raw_response: ticket.llm_raw_response || '',
      metadata: JSON.stringify(ticket.metadata || {}),
    });

    return this.findById(ticket.id);
  }

  /**
   * Find a ticket by its ID.
   * @param {string} id
   * @returns {object|null}
   */
  findById(id) {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
    return row ? this._deserialize(row) : null;
  }

  /**
   * List tickets with optional filters, pagination, and sorting.
   * @param {object} options - Query options
   * @returns {{ tickets: object[], total: number }}
   */
  findAll(options = {}) {
    const db = getDatabase();
    const {
      status, urgency, department,
      limit = 20, offset = 0,
      sort = 'created_at', order = 'desc',
    } = options;

    const conditions = [];
    const params = [];

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

    const total = db
      .prepare(`SELECT COUNT(*) as count FROM tickets ${where}`)
      .get(...params).count;

    const rows = db
      .prepare(
        `SELECT * FROM tickets ${where} ORDER BY ${safeSort} ${safeOrder} LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    return {
      tickets: rows.map((r) => this._deserialize(r)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Update a ticket by ID.
   * @param {string} id
   * @param {object} updates - Fields to update
   * @returns {object|null} Updated ticket
   */
  update(id, updates) {
    const db = getDatabase();
    const fields = [];
    const params = [];

    for (const [key, value] of Object.entries(updates)) {
      if (['subject', 'body', 'customer_email', 'urgency', 'sentiment',
           'department', 'status', 'confidence', 'reasoning'].includes(key)) {
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
   * @returns {object} Summary statistics
   */
  getStats() {
    const db = getDatabase();

    const total = db.prepare('SELECT COUNT(*) as count FROM tickets').get().count;

    const byUrgency = db
      .prepare(
        'SELECT urgency, COUNT(*) as count FROM tickets GROUP BY urgency'
      )
      .all();

    const bySentiment = db
      .prepare(
        'SELECT sentiment, COUNT(*) as count FROM tickets GROUP BY sentiment'
      )
      .all();

    const byDepartment = db
      .prepare(
        'SELECT department, COUNT(*) as count FROM tickets GROUP BY department'
      )
      .all();

    const byStatus = db
      .prepare(
        'SELECT status, COUNT(*) as count FROM tickets GROUP BY status'
      )
      .all();

    const avgConfidence = db
      .prepare('SELECT AVG(confidence) as avg FROM tickets')
      .get().avg;

    return {
      total,
      byUrgency: this._toMap(byUrgency),
      bySentiment: this._toMap(bySentiment),
      byDepartment: this._toMap(byDepartment),
      byStatus: this._toMap(byStatus),
      averageConfidence: avgConfidence
        ? Math.round(avgConfidence * 100) / 100
        : 0,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  _deserialize(row) {
    return {
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
    };
  }

  _toMap(rows) {
    const map = {};
    for (const row of rows) {
      const key = row.urgency || row.sentiment || row.department || row.status;
      map[key] = row.count;
    }
    return map;
  }
}
