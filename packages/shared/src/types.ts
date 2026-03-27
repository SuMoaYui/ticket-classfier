/**
 * @kin/shared — Shared types across Backend API and Desktop Client
 *
 * These interfaces are the single source of truth for the data structures
 * exchanged between the API and the Desktop application.
 */

// ─── Ticket ────────────────────────────────────────────────────────────────────

export type Urgency = 'critical' | 'high' | 'medium' | 'low';
export type Sentiment = 'angry' | 'frustrated' | 'neutral' | 'satisfied';
export type Department = 'billing' | 'technical' | 'sales' | 'general';
export type TicketStatus = 'pending' | 'open' | 'classified' | 'escalated' | 'resolved';

export interface ITicket {
  id: string;
  subject: string;
  body: string;
  customer_email: string;
  urgency: Urgency;
  sentiment: Sentiment;
  department: Department;
  status: TicketStatus;
  confidence: number;
  reasoning: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ICreateTicketInput {
  subject: string;
  body: string;
  customer_email: string;
  metadata?: Record<string, unknown>;
}

export interface ITicketStats {
  total: number;
  byUrgency: Record<string, number>;
  bySentiment: Record<string, number>;
  byDepartment: Record<string, number>;
  byStatus: Record<string, number>;
  averageConfidence: number;
}

export interface ITicketListResult {
  tickets: ITicket[];
  total: number;
  limit: number;
  offset: number;
}

// ─── Chat ──────────────────────────────────────────────────────────────────────

export interface IChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface IChatRequest {
  message: string;
  contextPage?: string;
}

export interface IChatResponse {
  reply: string;
}

// ─── API Response ──────────────────────────────────────────────────────────────

export interface IApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// ─── Health ────────────────────────────────────────────────────────────────────

export interface IHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  database: 'connected' | 'disconnected';
  version: string;
  llmMode: string;
  uptime: number;
  timestamp: string;
}
