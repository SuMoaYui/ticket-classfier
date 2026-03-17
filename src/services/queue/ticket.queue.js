import EventEmitter from 'events';
import logger from '../../utils/logger.js';

/**
 * In-memory Queue System (Simulates a Message Broker like BullMQ/Redis)
 * Used to decouple fast HTTP requests from slow LLM background tasks.
 */
class InMemoryQueue extends EventEmitter {
  constructor() {
    super();
    this.jobs = new Map();
  }

  /**
   * Add a new job to the queue.
   * @param {string} id - Job/Ticket ID
   * @param {object} payload - Job data
   */
  addConfiguredJob(id, payload) {
    logger.debug(`Job enqueued for ticket ${id}`);
    this.jobs.set(id, { id, payload, status: 'pending', createdAt: Date.now() });

    // Emit event asynchronously to unblock the caller (simulate broker delay)
    setImmediate(() => {
      this.emit('jobAdded', id);
    });
  }

  getJob(id) {
    return this.jobs.get(id);
  }

  completeJob(id) {
    const job = this.jobs.get(id);
    if (job) job.status = 'completed';
    this.jobs.delete(id); // Cleanup
    this.emit('jobCompleted', id);
  }
}

export const ticketQueue = new InMemoryQueue();
