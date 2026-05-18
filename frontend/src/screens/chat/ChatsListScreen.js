import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, StatusBar, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import useChatStore from '../../store/useChatStore';
import useAuthStore from '../../store/useAuthStore';
import ChatListItem from '../../components/ChatListItem';
import { Colors } from '../../theme/colors';

export default function ChatsListScreen({ navigation }) {
  const { chats, fetchChats, isLoadingChats } = useChatStore();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchChats();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchChats();
    setRefreshing(false);
  };

  const filtered = chats.filter(c => {
    const otherUser = c.isGroupChat ? null : c.users?.find(u => u._id !== user?._id);
    const name = c.isGroupChat ? c.chatName : (otherUser?.displayName || otherUser?.username || '');
    return name.toLowerCase().includes(search.toLowerCase());
  });

  // Separate pinned and normal
  const pinned = filtered.filter(c => user?.pinnedChats?.includes(c._id));
  const normal = filtered.filter(c => !user?.pinnedChats?.includes(c._id));

  const renderItem = ({ item }) => (
    <ChatListItem
      chat={item}
      currentUser={user}
      onPress={() => {
        useChatStore.getState().selectChat(item);
        useChatStore.getState().clearUnread(item._id);
        navigation.navigate('ChatRoom', { chat: item });
      }}
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark.card} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>NexChat</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('NewChat')} style={styles.iconBtn}>
            <Ionicons name="create-outline" size={24} color={Colors.dark.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('CreateGroup')} style={styles.iconBtn}>
            <Ionicons name="people-outline" size={24} color={Colors.dark.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={Colors.dark.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search chats..."
          placeholderTextColor={Colors.dark.muted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.dark.muted} />
          </TouchableOpacity>
        )}
      </View>

      {isLoadingChats && chats.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={[
            ...(pinned.length > 0 ? [{ type: 'section', title: '📌 Pinned', id: 'pinned_header' }] : []),
            ...pinned.map(c => ({ ...c, type: 'chat' })),
            ...(normal.length > 0 && pinned.length > 0 ? [{ type: 'section', title: 'Recent', id: 'recent_header' }] : []),
            ...normal.map(c => ({ ...c, type: 'chat' })),
          ]}
          keyExtractor={(item) => item.id || item._id}
          renderItem={({ item }) =>
            item.type === 'section' ? (
              <Text style={styles.sectionTitle}>{item.title}</Text>
            ) : (
              renderItem({ item })
            )
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyWrap}>
              <Ionicons name="chatbubbles-outline" size={64} color={Colors.dark.muted} />
              <Text style={styles.emptyTitle}>No chats yet</Text>
              <Text style={styles.emptyText}>Start a new conversation!</Text>
              <TouchableOpacity onPress={() => navigation.navigate('NewChat')}>
                <LinearGradient colors={[Colors.primary, Colors.accent]} style={styles.startBtn}>
                  <Text style={styles.startBtnText}>New Message</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={{ flexGrow: 1 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: Colors.dark.card, borderBottomWidth: 1, borderBottomColor: Colors.dark.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#FFF' },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 6 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.dark.input, borderRadius: 14,
    marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  searchInput: { flex: 1, color: Colors.dark.text, fontSize: 15 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.dark.muted, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.dark.text },
  emptyText: { fontSize: 14, color: Colors.dark.muted },
  startBtn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, marginTop: 8 },
  startBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
