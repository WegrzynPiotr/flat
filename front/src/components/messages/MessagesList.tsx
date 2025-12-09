import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { messagesAPI } from '../../api/endpoints';
import { ConversationUser, MessageResponse, UserRelation } from '../../types/api';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';
import { Typography } from '../../styles/typography';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { startSignalRConnection, onReceiveMessage, offReceiveMessage } from '../../services/signalrService';

interface MessagesListProps {
  onSelectContact: (userId: string, name: string, relations: UserRelation[]) => void;
}

interface MessagesListProps {
  onSelectContact: (userId: string, name: string, propertyAddress?: string) => void;
}

export default function MessagesList({ onSelectContact }: MessagesListProps) {
  const [contacts, setContacts] = useState<ConversationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUserId = useSelector((state: RootState) => state.auth.user?.id);
  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  const token = useSelector((state: RootState) => state.auth.accessToken);

  // Odświeżaj kontakty przy każdym wejściu na ekran (np. po zatwierdzeniu zaproszenia)
  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [])
  );

  useEffect(() => {
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
  }, [token, currentUserId, userRole]);

  const loadContacts = async () => {
    try {
      // Użyj standardowego endpointu kontaktów - backend sam obsługuje
      // wszystkie przypadki (właściciele widzą najemców/serwisantów,
      // najemcy widzą właścicieli, serwisanci widzą właścicieli/najemców)
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
      onPress={() => onSelectContact(item.userId, item.name, item.relations)}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </Text>
        </View>
      </View>
      <View style={styles.contactInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.contactName}>{item.name}</Text>
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
        {item.relations && item.relations.length > 0 && (
          <View style={styles.relationsContainer}>
            {item.relations.map((relation, index) => (
              <View key={index} style={styles.relationRow}>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{relation.role}</Text>
                </View>
                {relation.propertyAddress && (
                  <View style={styles.propertyRow}>
                    <Ionicons name="home-outline" size={12} color={Colors.textSecondary} />
                    <Text style={styles.contactProperty} numberOfLines={1}>{relation.propertyAddress}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
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
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.m,
    borderRadius: 12,
    marginBottom: Spacing.s,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarContainer: {
    marginRight: Spacing.m,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  contactInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  relationsContainer: {
    gap: 4,
  },
  relationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  roleBadge: {
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  propertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  contactProperty: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  badge: {
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: Spacing.xl,
  },
});
