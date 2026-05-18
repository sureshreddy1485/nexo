import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import useAuthStore from '../../store/useAuthStore';
import { Colors } from '../../theme/colors';
import api from '../../services/api';

export default function EditProfileScreen({ navigation }) {
  const { user, updateUser } = useAuthStore();
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    bio: user?.bio || '',
  });
  const [avatar, setAvatar] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) setAvatar(result.assets[0]);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('displayName', form.displayName);
      formData.append('bio', form.bio);
      if (avatar) {
        formData.append('profilePicture', { uri: avatar.uri, name: 'profile.jpg', type: 'image/jpeg' });
      }
      const { data } = await api.put('/users/profile', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser(data.user);
      Alert.alert('Success', 'Profile updated!');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message || 'Update failed');
    } finally {
      setIsLoading(false);
    }
  };

  const currentAvatar = avatar?.uri || user?.profilePicture;

  return (
    <LinearGradient colors={['#0A0A0F', '#1A1A2E']} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Avatar */}
          <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar}>
            {currentAvatar ? (
              <Image source={{ uri: currentAvatar }} style={styles.avatar} />
            ) : (
              <LinearGradient colors={[Colors.primary, Colors.accent]} style={styles.avatar}>
                <Text style={styles.avatarInitial}>{user?.username?.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={16} color="#FFF" />
            </View>
          </TouchableOpacity>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Display Name</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={form.displayName}
                  onChangeText={v => update('displayName', v)}
                  placeholder="Your display name"
                  placeholderTextColor={Colors.dark.muted}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio</Text>
              <View style={[styles.inputWrap, { height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
                <TextInput
                  style={[styles.input, { height: 80 }]}
                  value={form.bio}
                  onChangeText={v => update('bio', v)}
                  placeholder="Tell people about yourself..."
                  placeholderTextColor={Colors.dark.muted}
                  multiline
                  maxLength={200}
                />
              </View>
              <Text style={styles.charCount}>{form.bio.length}/200</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <View style={[styles.inputWrap, { opacity: 0.5 }]}>
                <TextInput
                  style={styles.input}
                  value={`@${user?.username}`}
                  editable={false}
                  placeholderTextColor={Colors.dark.muted}
                />
              </View>
              <Text style={styles.hint}>Username cannot be changed</Text>
            </View>

            <TouchableOpacity onPress={handleSave} disabled={isLoading} style={{ marginTop: 16 }}>
              <LinearGradient colors={[Colors.primary, Colors.accent]} style={styles.saveBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 },
  avatarWrap: { alignSelf: 'center', marginBottom: 32, position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 40, fontWeight: '800', color: '#FFF' },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: Colors.primary, borderRadius: 16, width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.dark.bg,
  },
  form: { gap: 4 },
  inputGroup: { gap: 6, marginBottom: 16 },
  label: { color: Colors.dark.textSecondary, fontSize: 13, fontWeight: '600', marginLeft: 4 },
  inputWrap: {
    backgroundColor: Colors.dark.input, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.dark.border, paddingHorizontal: 16,
  },
  input: { color: Colors.dark.text, fontSize: 15, paddingVertical: 14 },
  charCount: { alignSelf: 'flex-end', fontSize: 12, color: Colors.dark.muted },
  hint: { fontSize: 12, color: Colors.dark.muted, marginLeft: 4 },
  saveBtn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
