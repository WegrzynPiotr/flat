import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ConversationUser, MessageResponse } from '../../types/api';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';
import { Typography } from '../../styles/typography';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { startSignalRConnection, onReceiveMessage } from '../../services/signalrService';

interface MessagesListProps {
  contacts: ConversationUser[];
  loading: boolean;
  onRefresh: () => void;
  onSelectContact: (userId: string, name: string) => void;
}

export default function MessagesList({ contacts, loading, onRefresh, onSelectContact }: MessagesListProps) {
  const currentUserId = useSelector((state: RootState) => state.auth.user?.id);
  const token = useSelector((state: RootState) => state.auth.accessToken);

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
            
            // Jeśli jestem odbiorcą wiadomości, odśwież kontakty
            if (message.receiverId === currentUserId) {
              console.log('✅ Message is for me, refreshing contacts');
              onRefresh();
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
  }, [token, currentUserId, onRefresh]);

  const renderContact = ({ item }: { item: ConversationUser }) => (
    <TouchableOpacity
      style={styles.contactCard}
      onPress={() => onSelectContact(item.userId, item.name)}
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
                {relation.details && (
                  <View style={styles.detailsRow}>
                    <Ionicons 
                      name={relation.role === 'Serwisant' ? 'construct-outline' : 'home-outline'} 
                      size={12} 
                      color={Colors.textSecondary} 
                    />
                    <Text style={styles.contactDetails} numberOfLines={1}>{relation.details}</Text>
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
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  contactDetails: {
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
