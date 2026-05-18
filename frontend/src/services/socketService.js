import { io } from 'socket.io-client';
import useChatStore from '../store/useChatStore';
import useAuthStore from '../store/useAuthStore';

const SOCKET_URL = process.env.SOCKET_URL || 'http://10.0.2.2:5000';

let socket = null;

const getSocket = () => socket;

const connectSocket = (userId) => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket.id);
    socket.emit('setup', userId);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Socket disconnected');
  });

  socket.on('connect_error', (err) => {
    console.log('Socket error:', err.message);
  });

  // ── Realtime events ─────────────────────────────────────────────
  socket.on('new_message', (message) => {
    const { selectedChat, addMessage, incrementUnread } = useChatStore.getState();
    const chatId = message.chat?._id || message.chat;

    addMessage(chatId, message);

    // Increment unread if not in that chat
    if (selectedChat?._id !== chatId) {
      incrementUnread(chatId);
    }
  });

  socket.on('typing', ({ chatId, userId }) => {
    useChatStore.getState().setTyping(chatId, userId, true);
  });

  socket.on('stop_typing', ({ chatId, userId }) => {
    useChatStore.getState().setTyping(chatId, userId, false);
  });

  socket.on('messages_read', ({ chatId, userId }) => {
    const messages = useChatStore.getState().messages[chatId] || [];
    messages.forEach(m => {
      if (!m.readBy?.includes(userId)) {
        useChatStore.getState().updateMessage(chatId, m._id, {
          readBy: [...(m.readBy || []), userId],
        });
      }
    });
  });

  socket.on('message_deleted', ({ messageId, chatId }) => {
    useChatStore.getState().removeMessage(chatId, messageId);
  });

  socket.on('reaction_updated', ({ messageId, reactions, chatId }) => {
    useChatStore.getState().updateMessage(chatId, messageId, { reactions });
  });

  socket.on('user_online', ({ userId }) => {
    const user = useAuthStore.getState().user;
    // Could update online status in a users store / per chat participant
  });

  socket.on('user_offline', ({ userId, lastSeen }) => {
    // Same as above
  });

  socket.on('camera_status_changed', ({ userId, isActive }) => {
    // Update in chat participant list if needed
  });

  return socket;
};

const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

const joinChat = (chatId) => socket?.emit('join_chat', chatId);
const leaveChat = (chatId) => socket?.emit('leave_chat', chatId);
const sendTyping = (chatId, userId, username) => socket?.emit('typing', { chatId, userId, username });
const stopTyping = (chatId, userId) => socket?.emit('stop_typing', { chatId, userId });
const markRead = (chatId, userId) => socket?.emit('mark_read', { chatId, userId });
const setCameraActive = (userId, isActive) => socket?.emit('camera_active', { userId, isActive });

export {
  getSocket, connectSocket, disconnectSocket,
  joinChat, leaveChat, sendTyping, stopTyping, markRead, setCameraActive,
};
