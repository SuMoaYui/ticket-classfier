import { create } from 'zustand';
import { apiClient } from '@/services/apiClient';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'kin';
  timestamp: number;
}

interface ChatState {
  isOpen: boolean;
  isTyping: boolean;
  messages: ChatMessage[];
  hasSeenProactiveGreeting: boolean;
  
  toggleChat: () => void;
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  sendMessage: (text: string, contextPage: string) => Promise<void>;
  markProactiveGreeted: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  isOpen: false,
  isTyping: false,
  messages: [],
  hasSeenProactiveGreeting: false,

  toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),
  
  addMessage: (msg) => {
    const newMessage: ChatMessage = {
      ...msg,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    set((state) => ({ messages: [...state.messages, newMessage] }));
  },

  markProactiveGreeted: () => set({ hasSeenProactiveGreeting: true }),

  sendMessage: async (text: string, contextPage: string) => {
    const { addMessage } = get();
    
    // Ocultar comando sistémico
    if (text !== '__PROACTIVE__') {
      addMessage({ text, sender: 'user' });
    }
    
    set({ isTyping: true });
    
    try {
      const response = await apiClient.post<{ reply: string }>('/chat', { message: text, contextPage });
      addMessage({ text: response.data.reply, sender: 'kin' });
    } catch (error) {
      addMessage({ text: 'Lo siento, mis circuitos fallaron al intentar conectarme con el servidor.', sender: 'kin' });
    } finally {
      set({ isTyping: false });
    }
  },
}));
