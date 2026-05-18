import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/useAuthStore';
import { Colors } from '../../theme/colors';

export default function ProfileScreen({ navigation }) {
  const { user } = useAuthStore();

  const stats = [
    { label: 'Friends', value: user?.friends?.length || 0 },
    { label: 'Groups', value: '—' },
    { label: 'Stories', value: '—' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Cover */}
      <LinearGradient colors={[Colors.primary, Colors.accent]} style={styles.cover} />

      {/* Avatar */}
      <View style={styles.avatarWrap}>
        {user?.profilePicture ? (
          <Image source={{ uri: user.profilePicture }} style={styles.avatar} />
        ) : (
          <LinearGradient colors={[Colors.primary, Colors.accent]} style={styles.avatar}>
            <Text style={styles.avatarInitial}>{user?.username?.charAt(0).toUpperCase()}</Text>
          </LinearGradient>
        )}
      </View>

      {/* Name */}
      <View style={styles.info}>
        <Text style={styles.name}>{user?.displayName || user?.username}</Text>
        <Text style={styles.username}>@{user?.username}</Text>
        {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {stats.map(({ label, value }) => (
          <View key={label} style={styles.stat}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
          <LinearGradient colors={[Colors.primary, Colors.accent]} style={styles.actionBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="pencil" size={18} color="#FFF" />
            <Text style={styles.actionBtnText}>Edit Profile</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={22} color={Colors.dark.text} />
        </TouchableOpacity>
      </View>

      {/* Details */}
      <View style={styles.details}>
        {[
          { icon: 'mail-outline', value: user?.email },
          { icon: 'person-circle-outline', value: user?.isOnline ? 'Currently Online' : 'Offline' },
        ].map(({ icon, value }) => (
          <View key={icon} style={styles.detailRow}>
            <Ionicons name={icon} size={18} color={Colors.primary} />
            <Text style={styles.detailValue}>{value}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  cover: { height: 160 },
  avatarWrap: { alignSelf: 'center', marginTop: -50, marginBottom: 12, borderWidth: 3, borderColor: Colors.dark.bg, borderRadius: 55 },
  avatar: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 40, fontWeight: '800', color: '#FFF' },
  info: { alignItems: 'center', paddingHorizontal: 24, marginBottom: 20 },
  name: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  username: { fontSize: 15, color: Colors.primary, marginTop: 2 },
  bio: { fontSize: 14, color: Colors.dark.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: Colors.dark.card, marginHorizontal: 20, borderRadius: 16,
    paddingVertical: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.dark.border,
  },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  statLabel: { fontSize: 12, color: Colors.dark.muted, marginTop: 2 },
  actions: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 20 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14 },
  actionBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  settingsBtn: { backgroundColor: Colors.dark.card, borderRadius: 14, paddingHorizontal: 16, justifyContent: 'center', borderWidth: 1, borderColor: Colors.dark.border },
  details: { marginHorizontal: 20, backgroundColor: Colors.dark.card, borderRadius: 16, padding: 16, gap: 14, borderWidth: 1, borderColor: Colors.dark.border },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailValue: { fontSize: 14, color: Colors.dark.text },
});
