import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';

export default function StoryViewerScreen({ route }) {
  const { stories, user } = route.params;
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{user?.username}'s Story</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#FFF', fontSize: 18 },
});
