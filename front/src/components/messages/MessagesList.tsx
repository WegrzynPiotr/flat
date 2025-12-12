import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
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
  
  // Stany filtrów
  const [showFilters, setShowFilters] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');

  // Pobierz unikalne role z kontaktów
  const availableRoles = useMemo(() => {
    const roles = new Set<string>();
    contacts.forEach(contact => {
      contact.relations?.forEach(relation => {
        roles.add(relation.role);
      });
    });
    return Array.from(roles).sort((a, b) => {
      // Sortowanie: Wynajmujący, Najemca, Usterka, Zaproszenie do naprawy, Serwisant
      const order: { [key: string]: number } = {
        'Wynajmujący': 1,
        'Najemca': 2,
        'Usterka': 3,
        'Zaproszenie do naprawy': 4,
        'Serwisant': 5
      };
      return (order[a] || 100) - (order[b] || 100);
    });
  }, [contacts]);

  // Filtruj kontakty
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      // Filtruj po nazwisku
      if (searchName && !contact.name.toLowerCase().includes(searchName.toLowerCase())) {
        return false;
      }
      
      // Filtruj po roli (plakietce)
      if (selectedRole !== 'all') {
        const hasRole = contact.relations?.some(r => r.role === selectedRole);
        if (!hasRole) return false;
      }
      
      return true;
    });
  }, [contacts, searchName, selectedRole]);

  // Sprawdź czy są aktywne filtry
  const hasActiveFilters = searchName !== '' || selectedRole !== 'all';
  const activeFiltersCount = (searchName !== '' ? 1 : 0) + (selectedRole !== 'all' ? 1 : 0);

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
      {/* Przycisk filtrów */}
      <TouchableOpacity
        style={styles.filterToggle}
        onPress={() => setShowFilters(!showFilters)}
        activeOpacity={0.7}
      >
        <View style={styles.filterToggleContent}>
          <View style={styles.filterToggleLeft}>
            <Ionicons name="funnel-outline" size={20} color={Colors.primary} />
            <Text style={styles.filterToggleText}>Filtry</Text>
            {hasActiveFilters && (
              <View style={styles.activeFiltersBadge}>
                <Text style={styles.activeFiltersBadgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </View>
          <Ionicons 
            name={showFilters ? "chevron-up-outline" : "chevron-down-outline"} 
            size={20} 
            color={Colors.textSecondary} 
          />
        </View>
      </TouchableOpacity>

      {/* Panel filtrów */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          {/* Wyszukiwanie po nazwisku */}
          <View style={styles.filterItem}>
            <View style={styles.filterLabelRow}>
              <Ionicons name="search-outline" size={18} color={Colors.primary} />
              <Text style={styles.filterLabel}>Szukaj po nazwisku</Text>
            </View>
            <TextInput
              style={styles.searchInput}
              value={searchName}
              onChangeText={setSearchName}
              placeholder="Wpisz imię lub nazwisko..."
              placeholderTextColor={Colors.textSecondary}
            />
          </View>

          {/* Filtr po roli */}
          {availableRoles.length > 0 && (
            <View style={styles.filterItem}>
              <View style={styles.filterLabelRow}>
                <Ionicons name="pricetag-outline" size={18} color={Colors.primary} />
                <Text style={styles.filterLabel}>Relacja</Text>
              </View>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedRole}
                  onValueChange={setSelectedRole}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  <Picker.Item label="Wszystkie relacje" value="all" />
                  {availableRoles.map((role) => (
                    <Picker.Item key={role} label={role} value={role} />
                  ))}
                </Picker>
              </View>
            </View>
          )}

          {/* Przycisk resetowania filtrów */}
          {hasActiveFilters && (
            <TouchableOpacity
              style={styles.resetFiltersBtn}
              onPress={() => {
                setSearchName('');
                setSelectedRole('all');
              }}
            >
              <Ionicons name="refresh-outline" size={16} color={Colors.error} />
              <Text style={styles.resetFiltersText}>Wyczyść filtry</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Licznik wyników */}
      {hasActiveFilters && (
        <Text style={styles.resultsCount}>
          Znaleziono: {filteredContacts.length} {filteredContacts.length === 1 ? 'kontakt' : 
            filteredContacts.length < 5 ? 'kontakty' : 'kontaktów'}
        </Text>
      )}

      <FlatList
        data={filteredContacts}
        renderItem={renderContact}
        keyExtractor={(item) => item.userId}
        style={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {hasActiveFilters ? 'Brak kontaktów spełniających kryteria' : 'Brak kontaktów'}
          </Text>
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
    color: '#fff',
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
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: Spacing.xl,
  },
  // Style filtrów (jak w IssuesListScreen)
  filterToggle: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  filterToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  filterToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 0.2,
  },
  activeFiltersBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  activeFiltersBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  filtersPanel: {
    backgroundColor: '#fff',
    marginTop: Spacing.s,
    paddingVertical: Spacing.m,
    paddingHorizontal: Spacing.m,
    borderRadius: 12,
    gap: Spacing.l,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  filterItem: {
    gap: 10,
  },
  filterLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    letterSpacing: 0.2,
  },
  searchInput: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  pickerWrapper: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  picker: {
    height: 52,
  },
  pickerItem: {
    fontSize: 15,
  },
  resetFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: Spacing.s,
  },
  resetFiltersText: {
    fontSize: 14,
    color: Colors.error,
    fontWeight: '500',
  },
  resultsCount: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: Spacing.s,
    textAlign: 'center',
  },
});
