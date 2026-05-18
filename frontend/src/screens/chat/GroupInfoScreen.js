import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';

export default function GroupInfoScreen({ route }) {
  const { chat } = route.params;
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{chat?.chatName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg, alignItems: 'center', justifyContent: 'center' },
  text: { color: Colors.dark.text, fontSize: 18 },
});
