import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { messagesAPI } from '../../api/endpoints';
import { ConversationUser, MessageResponse } from '../../types/api';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';
import { Typography } from '../../styles/typography';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { startSignalRConnection, onReceiveMessage, offReceiveMessage } from '../../services/signalrService';

interface MessagesListProps {
  onSelectContact: (userId: string, name: string) => void;
}

export default function MessagesList({ onSelectContact }: MessagesListProps) {
  const [contacts, setContacts] = useState<ConversationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUserId = useSelector((state: RootState) => state.auth.user?.id);
  const token = useSelector((state: RootState) => state.auth.accessToken);

  useEffect(() => {
    loadContacts();

    let cleanup: (() => void) | undefined;

    // Połączenie SignalR dla otrzymywania powiadomień o nowych wiadomościach
    if (token) {
      console.log('🔌 Initializing SignalR in MessagesList');
      startSignalRConnection(token)
        .then(() => {
          console.log('📡 SignalR connected in MessagesList');
          
          // Nasłuchuj na nowe wiadomości
          cleanup = onReceiveMessage((message: MessageResponse) => {
            console.log('📨 New message notification in MessagesList:', message);
            
            // Jeśli jestem odbiorcą wiadomości, zwiększ licznik nieodczytanych
            if (message.receiverId === currentUserId) {
              console.log('✅ Message is for me, updating unread count');
              setContacts(prevContacts => {
                return prevContacts.map(contact => {
                  if (contact.userId === message.senderId) {
                    return {
                      ...contact,
                      unreadCount: contact.unreadCount + 1
                    };
                  }
                  return contact;
                });
              });
            }
          });
        })
        .catch(err => console.error('❌ SignalR connection failed in MessagesList:', err));
    } else {
      console.log('⚠️ No token available for SignalR connection in MessagesList');
    }

    return () => {
      console.log('🔌 Cleaning up SignalR listeners in MessagesList');
      if (cleanup) cleanup();
    };
  }, [token, currentUserId]);

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
        {item.propertyAddress && (
          <Text style={styles.contactProperty}>{item.propertyAddress}</Text>
        )}
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
  contactProperty: {
    fontSize: 11,
    color: Colors.primary,
    marginTop: 2,
    fontStyle: 'italic',
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
