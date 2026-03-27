import { create } from 'zustand';
import * as ticketService from '@/services/ticketService';
import type { TicketStats, TicketListParams, CreateTicketData } from '@/services/ticketService';

export interface Ticket {
  id: string;
  subject: string;
  body: string;
  customer_email: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  sentiment: 'angry' | 'frustrated' | 'neutral' | 'satisfied';
  department: 'billing' | 'technical' | 'sales' | 'general';
  status: 'pending' | 'classified' | 'escalated' | 'resolved';
  confidence: number;
  reasoning?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface TicketFilters {
  search: string;
  urgency: string;
  department: string;
  status: string;
}

interface TicketState {
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  filters: TicketFilters;
  isLoading: boolean;
  error: string | null;
  total: number;
  offset: number;
  limit: number;
  stats: TicketStats | null;
  statsLoading: boolean;

  // Sync actions
  setSelectedTicket: (ticket: Ticket | null) => void;
  setFilters: (filters: Partial<TicketFilters>) => void;
  clearFilters: () => void;

  // Async API actions
  fetchTickets: (params?: TicketListParams) => Promise<void>;
  fetchTicketById: (id: string) => Promise<Ticket | null>;
  createTicket: (data: CreateTicketData) => Promise<Ticket | null>;
  fetchStats: () => Promise<void>;
}

const defaultFilters: TicketFilters = {
  search: '',
  urgency: '',
  department: '',
  status: '',
};

export const useTicketStore = create<TicketState>((set, get) => ({
  tickets: [],
  selectedTicket: null,
  filters: { ...defaultFilters },
  isLoading: false,
  error: null,
  total: 0,
  offset: 0,
  limit: 20,
  stats: null,
  statsLoading: false,

  setSelectedTicket: (selectedTicket) => set({ selectedTicket }),

  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      offset: 0,
    })),

  clearFilters: () => set({ filters: { ...defaultFilters }, offset: 0 }),

  fetchTickets: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const { filters, limit, offset } = get();
      const query: TicketListParams = {
        limit,
        offset,
        ...params,
      };

      // Apply active filters
      if (filters.urgency) query.urgency = filters.urgency;
      if (filters.department) query.department = filters.department;
      if (filters.status) query.status = filters.status;

      const result = await ticketService.fetchTickets(query);
      set({
        tickets: result.tickets,
        total: result.pagination.total,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: (error as Error).message,
      });
    }
  },

  fetchTicketById: async (id) => {
    try {
      const ticket = await ticketService.fetchTicketById(id);
      set({ selectedTicket: ticket });
      return ticket;
    } catch (error) {
      set({ error: (error as Error).message });
      return null;
    }
  },

  createTicket: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const ticket = await ticketService.createTicket(data);
      set({ isLoading: false });
      return ticket;
    } catch (error) {
      set({
        isLoading: false,
        error: (error as Error).message,
      });
      return null;
    }
  },

  fetchStats: async () => {
    set({ statsLoading: true });
    try {
      const stats = await ticketService.fetchStats();
      set({ stats, statsLoading: false });
    } catch (error) {
      set({
        statsLoading: false,
        error: (error as Error).message,
      });
    }
  },
}));
