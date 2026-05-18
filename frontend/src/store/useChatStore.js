import { create } from 'zustand';
import api from '../services/api';

const useChatStore = create((set, get) => ({
  chats: [],
  selectedChat: null,
  messages: {},       // { chatId: [messages] }
  typingUsers: {},    // { chatId: [userIds] }
  unreadCounts: {},   // { chatId: count }
  isLoadingChats: false,
  isLoadingMessages: false,

  fetchChats: async () => {
    set({ isLoadingChats: true });
    try {
      const { data } = await api.get('/chats');
      set({ chats: data.chats, isLoadingChats: false });
    } catch (e) {
      set({ isLoadingChats: false });
    }
  },

  selectChat: (chat) => set({ selectedChat: chat }),

  fetchMessages: async (chatId, page = 1) => {
    set({ isLoadingMessages: true });
    try {
      const { data } = await api.get(`/messages/${chatId}?page=${page}&limit=50`);
      const existing = get().messages[chatId] || [];
      const all = page === 1 ? data.messages : [...data.messages, ...existing];
      set({
        messages: { ...get().messages, [chatId]: all },
        isLoadingMessages: false,
      });
    } catch (e) {
      set({ isLoadingMessages: false });
    }
  },

  addMessage: (chatId, message) => {
    const current = get().messages[chatId] || [];
    set({ messages: { ...get().messages, [chatId]: [...current, message] } });
    // Update latest message in chat list
    const chats = get().chats.map(c =>
      c._id === chatId ? { ...c, latestMessage: message, updatedAt: message.createdAt } : c
    );
    // Sort by latest
    chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    set({ chats });
  },

  updateMessage: (chatId, messageId, updates) => {
    const current = get().messages[chatId] || [];
    const updated = current.map(m => m._id === messageId ? { ...m, ...updates } : m);
    set({ messages: { ...get().messages, [chatId]: updated } });
  },

  removeMessage: (chatId, messageId) => {
    const current = get().messages[chatId] || [];
    const updated = current.map(m =>
      m._id === messageId ? { ...m, deletedForEveryone: true, content: '' } : m
    );
    set({ messages: { ...get().messages, [chatId]: updated } });
  },

  setTyping: (chatId, userId, isTyping) => {
    const current = get().typingUsers[chatId] || [];
    const updated = isTyping
      ? [...new Set([...current, userId])]
      : current.filter(id => id !== userId);
    set({ typingUsers: { ...get().typingUsers, [chatId]: updated } });
  },

  incrementUnread: (chatId) => {
    const count = (get().unreadCounts[chatId] || 0) + 1;
    set({ unreadCounts: { ...get().unreadCounts, [chatId]: count } });
  },

  clearUnread: (chatId) => {
    set({ unreadCounts: { ...get().unreadCounts, [chatId]: 0 } });
  },

  addChat: (chat) => {
    const exists = get().chats.find(c => c._id === chat._id);
    if (!exists) set({ chats: [chat, ...get().chats] });
  },

  updateChatLatestMessage: (chatId, message) => {
    const chats = get().chats.map(c =>
      c._id === chatId ? { ...c, latestMessage: message, updatedAt: new Date().toISOString() } : c
    );
    chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    set({ chats });
  },
}));

export default useChatStore;
