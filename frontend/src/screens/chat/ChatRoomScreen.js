import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Image, StatusBar, Alert,
  ActivityIndicator, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import useChatStore from '../../store/useChatStore';
import useAuthStore from '../../store/useAuthStore';
import { Colors } from '../../theme/colors';
import api from '../../services/api';
import { joinChat, leaveChat, sendTyping, stopTyping, markRead } from '../../services/socketService';
import MessageBubble from '../../components/MessageBubble';

export default function ChatRoomScreen({ route, navigation }) {
  const { chat } = route.params;
  const { user } = useAuthStore();
  const { messages, fetchMessages, addMessage, typingUsers, clearUnread } = useChatStore();
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [page, setPage] = useState(1);
  const flatRef = useRef(null);
  const typingTimeout = useRef(null);

  const chatMessages = messages[chat._id] || [];
  const isTyping = (typingUsers[chat._id] || []).filter(id => id !== user?._id).length > 0;

  const otherUser = chat.isGroupChat
    ? null
    : chat.users?.find(u => u._id !== user?._id);

  const headerName = chat.isGroupChat ? chat.chatName : (otherUser?.displayName || otherUser?.username);
  const headerAvatar = chat.isGroupChat ? chat.groupPicture : otherUser?.profilePicture;
  const isOnline = !chat.isGroupChat && otherUser?.isOnline;
  const isCameraActive = !chat.isGroupChat && otherUser?.isCameraActive;

  useEffect(() => {
    joinChat(chat._id);
    fetchMessages(chat._id);
    clearUnread(chat._id);
    markRead(chat._id, user?._id);
    return () => { leaveChat(chat._id); };
  }, [chat._id]);

  const handleTyping = (val) => {
    setText(val);
    sendTyping(chat._id, user?._id, user?.username);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      stopTyping(chat._id, user?._id);
    }, 1500);
  };

  const sendMessage = async (mediaFile = null) => {
    const content = text.trim();
    if (!content && !mediaFile) return;
    setIsSending(true);
    setText('');
    stopTyping(chat._id, user?._id);
    try {
      const formData = new FormData();
      if (content) formData.append('content', content);
      formData.append('chatId', chat._id);
      if (replyTo) formData.append('replyTo', replyTo._id);
      if (mediaFile) {
        formData.append('media', { uri: mediaFile.uri, name: mediaFile.name || 'media', type: mediaFile.type || 'image/jpeg' });
      }
      const { data } = await api.post('/messages', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setReplyTo(null);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to send');
    } finally {
      setIsSending(false);
    }
  };

  const pickImage = async () => {
    setShowAttach(false);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.85 });
    if (!result.canceled) await sendMessage({ uri: result.assets[0].uri, name: 'media.jpg', type: 'image/jpeg' });
  };

  const pickDocument = async () => {
    setShowAttach(false);
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.type !== 'cancel' && result.assets) {
      const file = result.assets[0];
      await sendMessage({ uri: file.uri, name: file.name, type: file.mimeType });
    }
  };

  const loadMore = () => {
    if (chatMessages.length >= page * 50) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMessages(chat._id, nextPage);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark.card} />

      {/* Header */}
      <LinearGradient colors={[Colors.dark.card, Colors.dark.surface]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerInfo}
          onPress={() => navigation.navigate(chat.isGroupChat ? 'GroupInfo' : 'UserProfile', { chat, username: otherUser?.username })}
        >
          {headerAvatar ? (
            <Image source={{ uri: headerAvatar }} style={styles.headerAvatar} />
          ) : (
            <View style={[styles.headerAvatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>{headerName?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View>
            <Text style={styles.headerName}>{headerName}</Text>
            {isTyping ? (
              <Text style={[styles.headerStatus, { color: Colors.accentGreen }]}>typing...</Text>
            ) : isCameraActive ? (
              <Text style={[styles.headerStatus, { color: Colors.camera }]}>📷 Using camera</Text>
            ) : isOnline ? (
              <Text style={[styles.headerStatus, { color: Colors.accentGreen }]}>Online</Text>
            ) : otherUser?.lastSeen ? (
              <Text style={styles.headerStatus}>
                Last seen {new Date(otherUser.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="search-outline" size={22} color={Colors.dark.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="ellipsis-vertical" size={22} color={Colors.dark.text} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={flatRef}
          data={chatMessages}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              currentUser={user}
              onReply={setReplyTo}
              onDelete={async (id) => {
                try {
                  await api.delete(`/messages/${id}`);
                } catch (e) { Alert.alert('Error', e.message); }
              }}
              onReact={async (id, emoji) => {
                try { await api.post(`/messages/${id}/react`, { emoji }); } catch (_) {}
              }}
            />
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 12 }}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Reply preview */}
        {replyTo && (
          <View style={styles.replyPreview}>
            <View style={styles.replyBar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.replyName}>{replyTo.sender?.displayName || replyTo.sender?.username}</Text>
              <Text style={styles.replyContent} numberOfLines={1}>{replyTo.content || '📎 Media'}</Text>
            </View>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Ionicons name="close" size={20} color={Colors.dark.muted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Attachment menu */}
        {showAttach && (
          <View style={styles.attachMenu}>
            <TouchableOpacity style={styles.attachOption} onPress={pickImage}>
              <LinearGradient colors={[Colors.primary, Colors.accent]} style={styles.attachIcon}>
                <Ionicons name="image" size={22} color="#FFF" />
              </LinearGradient>
              <Text style={styles.attachLabel}>Photo/Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachOption} onPress={pickDocument}>
              <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.attachIcon}>
                <Ionicons name="document" size={22} color="#FFF" />
              </LinearGradient>
              <Text style={styles.attachLabel}>Document</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity onPress={() => setShowAttach(!showAttach)} style={styles.inputIconBtn}>
            <Ionicons name={showAttach ? 'close' : 'add-circle-outline'} size={26} color={Colors.primary} />
          </TouchableOpacity>

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.textInput}
              placeholder="Message..."
              placeholderTextColor={Colors.dark.muted}
              value={text}
              onChangeText={handleTyping}
              multiline
              maxLength={4096}
            />
          </View>

          {text.trim() ? (
            <TouchableOpacity onPress={() => sendMessage()} disabled={isSending}>
              <LinearGradient colors={[Colors.primary, Colors.accent]} style={styles.sendBtn}>
                {isSending ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={20} color="#FFF" />}
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.micBtn}>
              <Ionicons name="mic-outline" size={26} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 48, paddingBottom: 12, paddingHorizontal: 12,
    gap: 10, borderBottomWidth: 1, borderBottomColor: Colors.dark.border,
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 42, height: 42, borderRadius: 21 },
  avatarFallback: {
    backgroundColor: Colors.primary + '40', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  headerName: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  headerStatus: { fontSize: 12, color: Colors.dark.muted },
  headerRight: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 6 },
  replyPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.dark.surface, paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: Colors.dark.border,
  },
  replyBar: { width: 3, height: '100%', backgroundColor: Colors.primary, borderRadius: 2, minHeight: 30 },
  replyName: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  replyContent: { fontSize: 13, color: Colors.dark.muted },
  attachMenu: {
    flexDirection: 'row', padding: 16, gap: 20,
    backgroundColor: Colors.dark.surface, borderTopWidth: 1, borderTopColor: Colors.dark.border,
  },
  attachOption: { alignItems: 'center', gap: 8 },
  attachIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  attachLabel: { fontSize: 12, color: Colors.dark.textSecondary, fontWeight: '600' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: Colors.dark.card, borderTopWidth: 1, borderTopColor: Colors.dark.border,
  },
  inputIconBtn: { paddingBottom: 6 },
  inputWrap: {
    flex: 1, backgroundColor: Colors.dark.input, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10, maxHeight: 120,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  textInput: { color: Colors.dark.text, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  micBtn: { paddingBottom: 6 },
});
