import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, Switch, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../../store/useAuthStore';
import { Colors } from '../../theme/colors';
import { disconnectSocket } from '../../services/socketService';

const SettingItem = ({ icon, label, value, onPress, isDestructive, isSwitch, switchValue, onSwitch }) => (
  <TouchableOpacity style={styles.settingItem} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
    <View style={[styles.settingIconWrap, { backgroundColor: isDestructive ? Colors.camera + '20' : Colors.primary + '20' }]}>
      <Ionicons name={icon} size={20} color={isDestructive ? Colors.camera : Colors.primary} />
    </View>
    <Text style={[styles.settingLabel, isDestructive && { color: Colors.camera }]}>{label}</Text>
    {isSwitch ? (
      <Switch value={switchValue} onValueChange={onSwitch} trackColor={{ true: Colors.primary }} />
    ) : (
      <View style={styles.settingRight}>
        {value ? <Text style={styles.settingValue}>{value}</Text> : null}
        <Ionicons name="chevron-forward" size={16} color={Colors.dark.muted} />
      </View>
    )}
  </TouchableOpacity>
);

export default function SettingsScreen({ navigation }) {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => { disconnectSocket(); await logout(); },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView>
        {/* Profile card */}
        <LinearGradient colors={['#1A1A2E', '#12121A']} style={styles.profileCard}>
          {user?.profilePicture ? (
            <Image source={{ uri: user.profilePicture }} style={styles.avatar} />
          ) : (
            <LinearGradient colors={[Colors.primary, Colors.accent]} style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.username?.charAt(0).toUpperCase()}</Text>
            </LinearGradient>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.displayName}>{user?.displayName || user?.username}</Text>
            <Text style={styles.username}>@{user?.username}</Text>
            <Text style={styles.bio} numberOfLines={2}>{user?.bio || 'No bio yet'}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} style={styles.editBtn}>
            <Ionicons name="pencil" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </LinearGradient>

        {/* Account */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.section}>
          <SettingItem icon="person-outline" label="Edit Profile" onPress={() => navigation.navigate('EditProfile')} />
          <SettingItem icon="lock-closed-outline" label="Change Password" onPress={() => navigation.navigate('ChangePassword')} />
          <SettingItem icon="phone-portrait-outline" label="Connected Devices" value="1 device" onPress={() => {}} />
        </View>

        {/* Privacy */}
        <Text style={styles.sectionTitle}>Privacy & Security</Text>
        <View style={styles.section}>
          <SettingItem icon="eye-outline" label="Last Seen" value={user?.privacy?.lastSeenVisibility || 'Everyone'} onPress={() => {}} />
          <SettingItem icon="image-outline" label="Profile Photo" value={user?.privacy?.profilePictureVisibility || 'Everyone'} onPress={() => {}} />
          <SettingItem icon="ban-outline" label="Blocked Users" onPress={() => {}} />
        </View>

        {/* Appearance */}
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.section}>
          <SettingItem icon="moon-outline" label="Theme" value={user?.theme || 'System'} onPress={() => {}} />
        </View>

        {/* Danger zone */}
        <Text style={styles.sectionTitle}>Account Actions</Text>
        <View style={styles.section}>
          <SettingItem icon="log-out-outline" label="Sign Out" isDestructive onPress={handleLogout} />
        </View>

        <Text style={styles.version}>NexChat v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', padding: 20, gap: 14,
    marginBottom: 8,
  },
  avatar: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#FFF' },
  displayName: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  username: { fontSize: 14, color: Colors.primary, marginTop: 2 },
  bio: { fontSize: 13, color: Colors.dark.muted, marginTop: 4 },
  editBtn: { padding: 8 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: Colors.dark.muted,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  section: {
    backgroundColor: Colors.dark.card, borderRadius: 16,
    marginHorizontal: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.dark.border,
  },
  settingItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14,
    borderBottomWidth: 0.5, borderBottomColor: Colors.dark.border,
  },
  settingIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { flex: 1, fontSize: 15, color: Colors.dark.text, fontWeight: '500' },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settingValue: { fontSize: 14, color: Colors.dark.muted },
  version: { textAlign: 'center', color: Colors.dark.muted, fontSize: 12, marginVertical: 24 },
});
