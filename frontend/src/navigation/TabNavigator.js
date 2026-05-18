import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import ChatsListScreen from '../screens/chat/ChatsListScreen';
import CommunitiesScreen from '../screens/communities/CommunitiesScreen';
import StoriesScreen from '../screens/stories/StoriesScreen';
import ProfileScreen from '../screens/settings/ProfileScreen';
import { Colors } from '../theme/colors';
import useChatStore from '../store/useChatStore';

const Tab = createBottomTabNavigator();

const TabBarIcon = ({ name, focused, color, badge }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons name={name} size={24} color={color} />
    {badge > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
      </View>
    )}
  </View>
);

export default function TabNavigator() {
  const unreadCounts = useChatStore(s => s.unreadCounts);
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.dark.muted,
        tabBarLabelStyle: styles.tabLabel,
        headerStyle: { backgroundColor: Colors.dark.card, shadowOpacity: 0 },
        headerTintColor: Colors.dark.text,
        headerTitleStyle: { fontWeight: '800', fontSize: 20 },
      })}
    >
      <Tab.Screen
        name="Chats"
        component={ChatsListScreen}
        options={{
          title: 'NexChat',
          tabBarLabel: 'Chats',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} focused={focused} color={color} badge={totalUnread} />
          ),
        }}
      />
      <Tab.Screen
        name="Communities"
        component={CommunitiesScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Stories"
        component={StoriesScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'sparkles' : 'sparkles-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.dark.card,
    borderTopColor: Colors.dark.border,
    borderTopWidth: 1,
    paddingBottom: 6,
    paddingTop: 6,
    height: 60,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: Colors.accent,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
