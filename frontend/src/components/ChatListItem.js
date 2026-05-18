import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diff < 604800000) {
    return d.toLocaleDateString([], { weekday: 'short' });
  }
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

const getReadIcon = (msg, currentUserId) => {
  if (!msg || msg.sender?._id !== currentUserId) return null;
  const readCount = msg.readBy?.length || 0;
  if (readCount > 0) return <Ionicons name="checkmark-done" size={14} color={Colors.primary} />;
  return <Ionicons name="checkmark" size={14} color={Colors.dark.muted} />;
};

export default function ChatListItem({ chat, currentUser, onPress }) {
  const otherUser = chat.isGroupChat
    ? null
    : chat.users?.find(u => u._id !== currentUser?._id);

  const name = chat.isGroupChat
    ? chat.chatName
    : (otherUser?.displayName || otherUser?.username || 'Unknown');

  const avatar = chat.isGroupChat ? chat.groupPicture : otherUser?.profilePicture;
  const isOnline = !chat.isGroupChat && otherUser?.isOnline;
  const isCameraActive = !chat.isGroupChat && otherUser?.isCameraActive;

  const lastMsg = chat.latestMessage;
  let lastMsgText = 'No messages yet';
  if (lastMsg) {
    if (lastMsg.deletedForEveryone) lastMsgText = '🚫 Message deleted';
    else if (lastMsg.mediaType === 'image') lastMsgText = '📷 Photo';
    else if (lastMsg.mediaType === 'video') lastMsgText = '🎥 Video';
    else if (lastMsg.mediaType === 'audio' || lastMsg.mediaType === 'voice') lastMsgText = '🎤 Voice message';
    else if (lastMsg.mediaType === 'document') lastMsgText = '📎 Document';
    else lastMsgText = lastMsg.content || '';
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarText}>
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {isOnline && !isCameraActive && <View style={styles.onlineDot} />}
        {isCameraActive && (
          <View style={[styles.onlineDot, { backgroundColor: Colors.camera }]}>
            <Ionicons name="videocam" size={8} color="#FFF" />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <View style={styles.timeRow}>
            {getReadIcon(lastMsg, currentUser?._id)}
            <Text style={styles.time}>{formatTime(lastMsg?.createdAt || chat.updatedAt)}</Text>
          </View>
        </View>
        <View style={styles.bottomRow}>
          <Text style={styles.lastMsg} numberOfLines={1}>{lastMsgText}</Text>
          {chat.isGroupChat && <Ionicons name="people" size={13} color={Colors.dark.muted} />}
        </View>
      </View>

      {/* Divider */}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
    borderBottomWidth: 0.5, borderBottomColor: Colors.dark.border,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  avatarFallback: {
    backgroundColor: Colors.primary + '40', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.primary + '60',
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: Colors.primary },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: Colors.accentGreen,
    borderWidth: 2, borderColor: Colors.dark.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  content: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '700', color: Colors.dark.text, flex: 1, marginRight: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  time: { fontSize: 12, color: Colors.dark.muted },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lastMsg: { fontSize: 13, color: Colors.dark.textSecondary, flex: 1, marginRight: 6 },
});
