import { apiClient } from './apiClient';
import type { Ticket } from '@/stores/ticketStore';

// ─── Response Types ─────────────────────────────────────────────────────────

export interface TicketListResponse {
  tickets: Ticket[];
  total: number;
  limit: number;
  offset: number;
}

export interface TicketStats {
  total: number;
  byStatus: Record<string, number>;
  byUrgency: Record<string, number>;
  byDepartment: Record<string, number>;
  bySentiment: Record<string, number>;
}

export interface HealthResponse {
  status: string;
  database: string;
  version: string;
  llmMode: string;
  uptime: number;
  timestamp: string;
}

// ─── Query Types ────────────────────────────────────────────────────────────

export interface TicketListParams {
  status?: string;
  urgency?: string;
  department?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  order?: string;
}

export interface CreateTicketData {
  subject: string;
  body: string;
  customer_email: string;
  metadata?: Record<string, unknown>;
}

// ─── Service Functions ──────────────────────────────────────────────────────

/**
 * Fetch paginated ticket list with optional filters.
 */
export async function fetchTickets(params: TicketListParams = {}): Promise<{
  tickets: Ticket[];
  pagination: { total: number; limit: number; offset: number; hasMore: boolean };
}> {
  const response = await apiClient.get<Ticket[]>('/tickets', params as Record<string, string | number | undefined>);
  return {
    tickets: response.data,
    pagination: response.pagination || { total: 0, limit: 20, offset: 0, hasMore: false },
  };
}

/**
 * Fetch a single ticket by ID.
 */
export async function fetchTicketById(id: string): Promise<Ticket> {
  const response = await apiClient.get<Ticket>(`/tickets/${id}`);
  return response.data;
}

/**
 * Create a new ticket (queued for AI classification).
 */
export async function createTicket(data: CreateTicketData): Promise<Ticket> {
  const response = await apiClient.post<Ticket>('/tickets', data);
  return response.data;
}

/**
 * Fetch aggregate ticket statistics.
 */
export async function fetchStats(): Promise<TicketStats> {
  const response = await apiClient.get<TicketStats>('/tickets/stats/summary');
  return response.data;
}

/**
 * Check backend health status.
 */
export async function checkHealth(): Promise<HealthResponse> {
  const response = await apiClient.get<HealthResponse>('/health');
  return response.data;
}
