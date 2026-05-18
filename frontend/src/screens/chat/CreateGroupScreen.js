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

export default function CreateGroupScreen({ navigation }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [avatar, setAvatar] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (q) => {
    setSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const { data } = await api.get(`/users/search?q=${q}`);
      setSearchResults(data.users);
    } catch (_) {} finally { setIsSearching(false); }
  };

  const toggleUser = (user) => {
    const exists = selected.find(u => u._id === user._id);
    if (exists) setSelected(s => s.filter(u => u._id !== user._id));
    else setSelected(s => [...s, user]);
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) setAvatar(result.assets[0]);
  };

  const createGroup = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Group name is required'); return; }
    if (selected.length < 1) { Alert.alert('Error', 'Add at least 1 participant'); return; }
    setIsCreating(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('users', JSON.stringify(selected.map(u => u._id)));
      if (avatar) formData.append('groupPicture', { uri: avatar.uri, name: 'group.jpg', type: 'image/jpeg' });
      const { data } = await api.post('/chats/group', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      useChatStore.getState().addChat(data.chat);
      navigation.replace('ChatRoom', { chat: data.chat });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally { setIsCreating(false); }
  };

  return (
    <LinearGradient colors={['#0A0A0F', '#1A1A2E']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Group avatar */}
        <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar}>
          {avatar ? (
            <Image source={{ uri: avatar.uri }} style={styles.avatar} />
          ) : (
            <LinearGradient colors={[Colors.primary, Colors.accent]} style={styles.avatar}>
              <Ionicons name="people" size={36} color="#FFF" />
            </LinearGradient>
          )}
          <View style={styles.cameraBadge}><Ionicons name="camera" size={14} color="#FFF" /></View>
        </TouchableOpacity>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Group Name *</Text>
          <View style={styles.inputWrap}>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Group name" placeholderTextColor={Colors.dark.muted} />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <View style={styles.inputWrap}>
            <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Optional" placeholderTextColor={Colors.dark.muted} multiline />
          </View>
        </View>

        {/* Selected members */}
        {selected.length > 0 && (
          <View style={styles.selectedWrap}>
            {selected.map(u => (
              <TouchableOpacity key={u._id} style={styles.selectedChip} onPress={() => toggleUser(u)}>
                <Text style={styles.chipText}>{u.username}</Text>
                <Ionicons name="close" size={14} color={Colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Search participants */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Add Participants</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="search-outline" size={18} color={Colors.dark.muted} />
            <TextInput
              style={[styles.input, { flex: 1, marginLeft: 8 }]}
              value={search} onChangeText={handleSearch}
              placeholder="Search users..." placeholderTextColor={Colors.dark.muted} autoCapitalize="none"
            />
          </View>
        </View>

        {isSearching ? <ActivityIndicator color={Colors.primary} /> : searchResults.map(u => {
          const isSelected = selected.find(s => s._id === u._id);
          return (
            <TouchableOpacity key={u._id} style={styles.userRow} onPress={() => toggleUser(u)}>
              <View style={styles.userAvatar}>
                <Text style={styles.userInitial}>{u.username?.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{u.displayName || u.username}</Text>
                <Text style={styles.userHandle}>@{u.username}</Text>
              </View>
              <View style={[styles.checkBox, isSelected && styles.checkBoxActive]}>
                {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity onPress={createGroup} disabled={isCreating} style={{ marginTop: 24 }}>
          <LinearGradient colors={[Colors.primary, Colors.accent]} style={styles.createBtn}>
            {isCreating ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Ionicons name="people" size={20} color="#FFF" />
                <Text style={styles.createBtnText}>Create Group ({selected.length})</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  avatarWrap: { alignSelf: 'center', marginBottom: 24, position: 'relative' },
  avatar: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors.primary, borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.dark.bg },
  inputGroup: { gap: 6, marginBottom: 16 },
  label: { color: Colors.dark.textSecondary, fontSize: 13, fontWeight: '600', marginLeft: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dark.input, borderRadius: 14, borderWidth: 1, borderColor: Colors.dark.border, paddingHorizontal: 14 },
  input: { color: Colors.dark.text, fontSize: 15, paddingVertical: 14, flex: 1 },
  selectedWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  selectedChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary + '20', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.primary + '40' },
  chipText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.dark.border },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary + '30', alignItems: 'center', justifyContent: 'center' },
  userInitial: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  userName: { fontSize: 15, fontWeight: '600', color: Colors.dark.text },
  userHandle: { fontSize: 13, color: Colors.dark.muted },
  checkBox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.dark.border, alignItems: 'center', justifyContent: 'center' },
  checkBoxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 18 },
  createBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
