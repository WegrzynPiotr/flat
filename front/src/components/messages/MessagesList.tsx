import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { messagesAPI } from '../../api/endpoints';
import { ConversationUser } from '../../types/api';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';
import { Typography } from '../../styles/typography';

interface MessagesListProps {
  onSelectContact: (userId: string, name: string) => void;
}

export default function MessagesList({ onSelectContact }: MessagesListProps) {
  const [contacts, setContacts] = useState<ConversationUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const response = await messagesAPI.getContacts();
      setContacts(response.data);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderContact = ({ item }: { item: ConversationUser }) => (
    <TouchableOpacity
      style={styles.contactCard}
      onPress={() => onSelectContact(item.userId, item.name)}
    >
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactRole}>{item.role}</Text>
      </View>
      {item.unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={Typography.h2}>Wiadomości</Text>
      <FlatList
        data={contacts}
        renderItem={renderContact}
        keyExtractor={(item) => item.userId}
        style={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Brak kontaktów</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.m,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    marginTop: Spacing.m,
  },
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.m,
    borderRadius: 8,
    marginBottom: Spacing.s,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
  contactRole: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  badge: {
    backgroundColor: Colors.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: Spacing.xl,
  },
});
