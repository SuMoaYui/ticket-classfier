import EventEmitter from 'events';
import logger from '../../utils/logger.js';
import { getDatabase } from '../../db/database.js';

/** Represents a job in the queue. */
export interface Job {
  id: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'completed';
  createdAt: number;
}

/**
 * SQLite-Backed Queue System (Persistent Jobs)
 * Jobs survive server restarts. Orphaned jobs are re-enqueued on startup.
 */
class PersistentQueue extends EventEmitter {
  private jobs: Map<string, Job>;

  constructor() {
    super();
    this.jobs = new Map();
  }

  /**
   * Add a new job to the queue and persist it to SQLite.
   */
  addConfiguredJob(id: string, payload: Record<string, unknown>): void {
    logger.debug(`Job enqueued for ticket ${id}`);
    const job: Job = { id, payload, status: 'pending', createdAt: Date.now() };
    this.jobs.set(id, job);

    // Persist to SQLite for crash recovery
    try {
      const db = getDatabase();
      db.prepare(
        'INSERT OR IGNORE INTO pending_jobs (ticket_id, payload, created_at) VALUES (?, ?, ?)'
      ).run(id, JSON.stringify(payload), new Date().toISOString());
    } catch (err) {
      logger.warn('Failed to persist job to SQLite', { error: (err as Error).message });
    }

    // Emit event asynchronously to unblock the caller
    setImmediate(() => {
      this.emit('jobAdded', id);
    });
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  completeJob(id: string): void {
    const job = this.jobs.get(id);
    if (job) job.status = 'completed';
    this.jobs.delete(id);

    // Remove from persistent store
    try {
      const db = getDatabase();
      db.prepare('DELETE FROM pending_jobs WHERE ticket_id = ?').run(id);
    } catch (err) {
      logger.warn('Failed to remove completed job from SQLite', { error: (err as Error).message });
    }

    this.emit('jobCompleted', id);
  }

  /**
   * Re-enqueue orphaned jobs from a previous server crash.
   * Called once at startup after the worker is ready.
   */
  recoverOrphanedJobs(): void {
    try {
      const db = getDatabase();
      const orphans = db.prepare('SELECT ticket_id, payload FROM pending_jobs').all() as Array<{
        ticket_id: string;
        payload: string;
      }>;

      if (orphans.length > 0) {
        logger.info(`Recovering ${orphans.length} orphaned classification job(s) from previous crash.`);
        for (const orphan of orphans) {
          const payload = JSON.parse(orphan.payload) as Record<string, unknown>;
          this.jobs.set(orphan.ticket_id, {
            id: orphan.ticket_id,
            payload,
            status: 'pending',
            createdAt: Date.now(),
          });
          setImmediate(() => this.emit('jobAdded', orphan.ticket_id));
        }
      }
    } catch (err) {
      logger.warn('Failed to recover orphaned jobs', { error: (err as Error).message });
    }
  }
}

export const ticketQueue = new PersistentQueue();
