import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../theme/colors';
import api from '../../services/api';
import useAuthStore from '../../store/useAuthStore';

export default function StoriesScreen({ navigation }) {
  const { user } = useAuthStore();
  const [stories, setStories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fetchStories = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/stories');
      setStories(data.stories);
    } catch (_) {} finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchStories(); }, []);

  const addStory = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.9,
    });
    if (result.canceled) return;
    setIsUploading(true);
    try {
      const file = result.assets[0];
      const formData = new FormData();
      const isVideo = file.type === 'video';
      formData.append('media', { uri: file.uri, name: isVideo ? 'story.mp4' : 'story.jpg', type: isVideo ? 'video/mp4' : 'image/jpeg' });
      await api.post('/stories', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      fetchStories();
      Alert.alert('✨', 'Story added!');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setIsUploading(false);
    }
  };

  const renderUserStory = ({ item }) => {
    const isOwnStory = item.user._id === user?._id;
    return (
      <TouchableOpacity
        style={styles.storyItem}
        onPress={() => navigation.navigate('StoryViewer', { stories: item.stories, user: item.user })}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.accent]}
          style={styles.storyRing}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          {item.user.profilePicture ? (
            <Image source={{ uri: item.user.profilePicture }} style={styles.storyAvatar} />
          ) : (
            <View style={[styles.storyAvatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{item.user.username?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </LinearGradient>
        <Text style={styles.storyName} numberOfLines={1}>
          {isOwnStory ? 'Your Story' : (item.user.displayName || item.user.username)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Stories</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={[{ isAddBtn: true }, ...stories]}
          keyExtractor={(item, i) => item.isAddBtn ? 'add' : item.user._id}
          numColumns={3}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) =>
            item.isAddBtn ? (
              <TouchableOpacity style={styles.addStoryBtn} onPress={addStory} disabled={isUploading}>
                {isUploading ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : (
                  <>
                    <LinearGradient colors={[Colors.primary, Colors.accent]} style={styles.addIcon}>
                      <Ionicons name="add" size={28} color="#FFF" />
                    </LinearGradient>
                    <Text style={styles.storyName}>Add Story</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : renderUserStory({ item })
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  header: {
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: Colors.dark.card, borderBottomWidth: 1, borderBottomColor: Colors.dark.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#FFF' },
  grid: { padding: 12, gap: 8 },
  storyItem: { flex: 1, alignItems: 'center', margin: 6, maxWidth: '33%' },
  storyRing: { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center', padding: 3 },
  storyAvatar: { width: 68, height: 68, borderRadius: 34 },
  avatarFallback: { backgroundColor: Colors.dark.card, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 28, fontWeight: '800', color: Colors.primary },
  storyName: { fontSize: 12, color: Colors.dark.textSecondary, marginTop: 6, textAlign: 'center' },
  addStoryBtn: { flex: 1, alignItems: 'center', margin: 6, maxWidth: '33%' },
  addIcon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
});
