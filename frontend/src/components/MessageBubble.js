import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet,
  Pressable, Modal, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../theme/colors';

const REACTIONS = ['❤️', '😂', '👍', '😮', '😢', '🔥'];

const formatTime = (d) =>
  new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function MessageBubble({ message, currentUser, onReply, onDelete, onReact }) {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const isMine = message.sender?._id === currentUser?._id;
  const isRead = message.readBy?.some(id => id !== currentUser?._id && id !== message.sender?._id);

  if (message.deletedForEveryone) {
    return (
      <View style={[styles.row, isMine && styles.rowMine]}>
        <View style={[styles.deletedBubble]}>
          <Ionicons name="ban-outline" size={14} color={Colors.dark.muted} />
          <Text style={styles.deletedText}>Message deleted</Text>
        </View>
      </View>
    );
  }

  if (message.isSystemMessage) {
    return (
      <View style={styles.systemRow}>
        <Text style={styles.systemText}>{message.content}</Text>
      </View>
    );
  }

  const renderMedia = () => {
    if (!message.mediaUrl) return null;
    if (message.mediaType === 'image') {
      return (
        <Image source={{ uri: message.mediaUrl }} style={styles.mediaImage} resizeMode="cover" />
      );
    }
    if (message.mediaType === 'voice' || message.mediaType === 'audio') {
      return (
        <View style={styles.audioRow}>
          <Ionicons name="play-circle" size={36} color={isMine ? '#FFF' : Colors.primary} />
          <View style={styles.audioBar} />
        </View>
      );
    }
    if (message.mediaType === 'document') {
      return (
        <View style={styles.docRow}>
          <Ionicons name="document" size={24} color={isMine ? '#FFF' : Colors.primary} />
          <Text style={[styles.docName, { color: isMine ? '#FFF' : Colors.dark.text }]} numberOfLines={1}>
            {message.fileName || 'Document'}
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <>
      <Pressable
        onLongPress={() => setShowActions(true)}
        style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}
      >
        {/* Reply context */}
        {message.replyTo && (
          <View style={[styles.replyContext, isMine ? styles.replyContextMine : styles.replyContextTheirs]}>
            <View style={styles.replyBorderBar} />
            <View>
              <Text style={styles.replyContextName}>
                {message.replyTo.sender?.displayName || message.replyTo.sender?.username}
              </Text>
              <Text style={styles.replyContextContent} numberOfLines={1}>
                {message.replyTo.content || '📎 Media'}
              </Text>
            </View>
          </View>
        )}

        {/* Bubble */}
        {isMine ? (
          <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={[styles.bubble, styles.bubbleMine]}>
            {renderMedia()}
            {message.content ? <Text style={styles.textMine}>{message.content}</Text> : null}
            <View style={styles.metaRow}>
              {message.isForwarded && (
                <Text style={styles.forwarded}>↪ Forwarded</Text>
              )}
              <Text style={styles.timeMine}>{formatTime(message.createdAt)}</Text>
              <Ionicons
                name={isRead ? 'checkmark-done' : 'checkmark'}
                size={13}
                color={isRead ? Colors.accentGreen : 'rgba(255,255,255,0.6)'}
              />
            </View>
          </LinearGradient>
        ) : (
          <View style={[styles.bubble, styles.bubbleTheirs]}>
            {renderMedia()}
            {message.content ? <Text style={styles.textTheirs}>{message.content}</Text> : null}
            <View style={styles.metaRow}>
              {message.isForwarded && <Text style={styles.forwardedTheirs}>↪ Forwarded</Text>}
              <Text style={styles.timeTheirs}>{formatTime(message.createdAt)}</Text>
            </View>
          </View>
        )}

        {/* Reactions display */}
        {message.reactions?.length > 0 && (
          <View style={styles.reactionsRow}>
            {message.reactions.slice(0, 5).map((r, i) => (
              <Text key={i} style={styles.reactionEmoji}>{r.emoji}</Text>
            ))}
            {message.reactions.length > 5 && (
              <Text style={styles.reactionCount}>+{message.reactions.length - 5}</Text>
            )}
          </View>
        )}
      </Pressable>

      {/* Action Modal */}
      <Modal visible={showActions} transparent animationType="fade" onRequestClose={() => setShowActions(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowActions(false)}>
          <View style={styles.actionMenu}>
            {/* Quick reactions */}
            <View style={styles.emojiRow}>
              {REACTIONS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => { onReact?.(message._id, emoji); setShowActions(false); }}
                  style={styles.emojiBtn}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.actionDivider} />
            {[
              { icon: 'arrow-undo-outline', label: 'Reply', action: () => { onReply?.(message); setShowActions(false); } },
              { icon: 'arrow-redo-outline', label: 'Forward', action: () => setShowActions(false) },
              { icon: 'copy-outline', label: 'Copy', action: () => setShowActions(false) },
              { icon: 'bookmark-outline', label: 'Save', action: () => setShowActions(false) },
              ...(isMine ? [{ icon: 'trash-outline', label: 'Delete', color: Colors.camera, action: () => { onDelete?.(message._id); setShowActions(false); } }] : []),
            ].map(({ icon, label, action, color }) => (
              <TouchableOpacity key={label} style={styles.actionItem} onPress={action}>
                <Ionicons name={icon} size={20} color={color || Colors.dark.text} />
                <Text style={[styles.actionLabel, color && { color }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 12, marginVertical: 2, flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '75%', borderRadius: 20, padding: 12, elevation: 2 },
  bubbleMine: { borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: Colors.dark.surface, borderBottomLeftRadius: 4 },
  textMine: { color: '#FFF', fontSize: 15, lineHeight: 20 },
  textTheirs: { color: Colors.dark.text, fontSize: 15, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, justifyContent: 'flex-end' },
  timeMine: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  timeTheirs: { fontSize: 11, color: Colors.dark.muted },
  forwarded: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' },
  forwardedTheirs: { fontSize: 10, color: Colors.dark.muted, fontStyle: 'italic' },
  mediaImage: { width: 220, height: 180, borderRadius: 12, marginBottom: 6 },
  audioRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, minWidth: 160 },
  audioBar: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 2 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, minWidth: 160 },
  docName: { fontSize: 13, flex: 1 },
  replyContext: {
    flexDirection: 'row', marginBottom: 6, borderRadius: 10, padding: 8,
    maxWidth: '75%',
  },
  replyContextMine: { backgroundColor: 'rgba(0,0,0,0.2)', alignSelf: 'flex-end' },
  replyContextTheirs: { backgroundColor: Colors.dark.border, alignSelf: 'flex-start' },
  replyBorderBar: { width: 3, backgroundColor: Colors.accentGreen, borderRadius: 2, marginRight: 8 },
  replyContextName: { fontSize: 12, fontWeight: '700', color: Colors.accentGreen },
  replyContextContent: { fontSize: 12, color: Colors.dark.muted },
  reactionsRow: {
    flexDirection: 'row', alignSelf: 'flex-end',
    backgroundColor: Colors.dark.card, borderRadius: 12,
    paddingHorizontal: 6, paddingVertical: 2, marginTop: -4, marginRight: 16,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 12, color: Colors.dark.muted, marginLeft: 2 },
  deletedBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.dark.surface, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.dark.border,
  },
  deletedText: { color: Colors.dark.muted, fontSize: 13, fontStyle: 'italic' },
  systemRow: { alignItems: 'center', marginVertical: 8 },
  systemText: {
    fontSize: 12, color: Colors.dark.muted, fontStyle: 'italic',
    backgroundColor: Colors.dark.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  actionMenu: {
    backgroundColor: Colors.dark.card, borderRadius: 20, width: '80%',
    paddingVertical: 8, borderWidth: 1, borderColor: Colors.dark.border,
    elevation: 20,
  },
  emojiRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, paddingVertical: 12 },
  emojiBtn: { padding: 4 },
  emoji: { fontSize: 26 },
  actionDivider: { height: 1, backgroundColor: Colors.dark.border, marginHorizontal: 16 },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 14 },
  actionLabel: { fontSize: 15, color: Colors.dark.text, fontWeight: '500' },
});
