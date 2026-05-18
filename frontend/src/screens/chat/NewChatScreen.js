import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../theme/colors';
import api from '../../services/api';
import useChatStore from '../../store/useChatStore';

export default function NewChatScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(null);

  const handleSearch = async (q) => {
    setSearch(q);
    if (q.length < 2) { setResults([]); return; }
    setIsSearching(true);
    try {
      const { data } = await api.get(`/users/search?q=${q}`);
      setResults(data.users);
    } catch (_) {} finally {
      setIsSearching(false);
    }
  };

  const startChat = async (userId) => {
    setIsCreating(userId);
    try {
      const { data } = await api.post('/chats', { userId });
      useChatStore.getState().addChat(data.chat);
      useChatStore.getState().selectChat(data.chat);
      navigation.replace('ChatRoom', { chat: data.chat });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setIsCreating(null);
    }
  };

  return (
    <LinearGradient colors={['#0A0A0F', '#1A1A2E']} style={{ flex: 1 }}>
      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={20} color={Colors.dark.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username..."
          placeholderTextColor={Colors.dark.muted}
          value={search}
          onChangeText={handleSearch}
          autoFocus
          autoCapitalize="none"
        />
        {isSearching && <ActivityIndicator size="small" color={Colors.primary} />}
      </View>

      <ScrollView>
        {results.map(user => (
          <TouchableOpacity
            key={user._id}
            style={styles.userItem}
            onPress={() => startChat(user._id)}
            disabled={isCreating === user._id}
          >
            {user.profilePicture ? (
              <Image source={{ uri: user.profilePicture }} style={styles.avatar} />
            ) : (
              <LinearGradient colors={[Colors.primary, Colors.accent]} style={styles.avatar}>
                <Text style={styles.avatarText}>{user.username?.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.displayName}>{user.displayName || user.username}</Text>
              <Text style={styles.username}>@{user.username}</Text>
            </View>
            {isCreating === user._id ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="chatbubble-outline" size={22} color={Colors.primary} />
            )}
          </TouchableOpacity>
        ))}

        {search.length >= 2 && results.length === 0 && !isSearching && (
          <View style={styles.empty}>
            <Ionicons name="search" size={48} color={Colors.dark.muted} />
            <Text style={styles.emptyText}>No users found for "{search}"</Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.dark.input, margin: 16, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  searchInput: { flex: 1, color: Colors.dark.text, fontSize: 15 },
  userItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: Colors.dark.border,
  },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  displayName: { fontSize: 15, fontWeight: '700', color: Colors.dark.text },
  username: { fontSize: 13, color: Colors.dark.muted, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: Colors.dark.muted },
});
