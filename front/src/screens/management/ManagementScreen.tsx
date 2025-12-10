import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, ScrollView, Alert, TextInput, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { userManagementAPI, invitationsAPI, userNotesAPI } from '../../api/endpoints';
import { UserManagementResponse, InvitationResponse, UserNoteResponse } from '../../types/api';
import { capitalizeFullName } from '../../utils/textFormatters';
import InviteUserForm from '../../components/userManagement/InviteUserForm';
import AssignTenantForm from '../../components/userManagement/AssignTenantForm';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';
import { Typography } from '../../styles/typography';

type TabType = 'tenants' | 'servicemen' | 'assign' | 'invite';

export default function ManagementScreen({ navigation, route }: any) {
  const [activeTab, setActiveTab] = useState<TabType>('tenants');
  const [currentPropertyId, setCurrentPropertyId] = useState<string | undefined>(undefined);
  const [tenants, setTenants] = useState<UserManagementResponse[]>([]);
  const [servicemen, setServicemen] = useState<UserManagementResponse[]>([]);
  const [sentInvitations, setSentInvitations] = useState<InvitationResponse[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Notatki
  const [userNotes, setUserNotes] = useState<Record<string, string>>({});
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserManagementResponse | null>(null);
  const [noteContent, setNoteContent] = useState('');

  // Reset do domyślnej zakładki gdy użytkownik kliknie PONOWNIE na zakładkę "Zarządzanie"
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e: any) => {
      // Sprawdź czy już jesteśmy na tej zakładce (ponowne kliknięcie)
      const state = navigation.getState();
      const currentRoute = state?.routes?.[state.index];
      
      // Tylko resetuj jeśli jesteśmy na zakładce Management i nie na domyślnej zakładce
      if (currentRoute?.name === 'Management' && activeTab !== 'tenants') {
        e.preventDefault();
        setActiveTab('tenants');
        setCurrentPropertyId(undefined);
      }
    });

    return unsubscribe;
  }, [navigation, activeTab]);

  // Aktualizuj zakładkę i propertyId przy każdym wejściu na ekran
  useFocusEffect(
    useCallback(() => {
      const tab = route?.params?.tab as TabType | undefined;
      const propertyId = route?.params?.propertyId as string | undefined;
      
      if (tab) {
        setActiveTab(tab);
      }
      if (propertyId) {
        setCurrentPropertyId(propertyId);
      }
      
      // Wyczyść parametry po użyciu (żeby nie były używane przy kolejnym wejściu bez parametrów)
      if (tab || propertyId) {
        navigation.setParams({ tab: undefined, propertyId: undefined });
      }
    }, [route?.params?.tab, route?.params?.propertyId])
  );

  // Załaduj obie listy przy montowaniu komponentu
  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (activeTab === 'tenants' || activeTab === 'servicemen') {
      loadData();
    } else if (activeTab === 'invite') {
      loadSentInvitations();
    }
  }, [activeTab]);

  const loadAllData = async () => {
    try {
      const [tenantsRes, servicemenRes, invitationsRes, notesRes] = await Promise.all([
        userManagementAPI.getMyTenants(),
        userManagementAPI.getMyServicemen(),
        invitationsAPI.getSent(),
        userNotesAPI.getAllNotes()
      ]);
      setTenants(tenantsRes.data);
      setServicemen(servicemenRes.data);
      setSentInvitations(invitationsRes.data);
      
      // Przekształć tablicę notatek na mapę userId -> content
      const notesMap: Record<string, string> = {};
      notesRes.data.forEach((note: UserNoteResponse) => {
        if (note.content) {
          notesMap[note.targetUserId] = note.content;
        }
      });
      setUserNotes(notesMap);
    } catch (error) {
      console.error('Failed to load all data:', error);
    }
  };

  const loadSentInvitations = async () => {
    try {
      const response = await invitationsAPI.getSent();
      setSentInvitations(response.data);
    } catch (error) {
      console.error('Failed to load sent invitations:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'tenants') {
        const response = await userManagementAPI.getMyTenants();
        setTenants(response.data);
      } else if (activeTab === 'servicemen') {
        const response = await userManagementAPI.getMyServicemen();
        setServicemen(response.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserCreated = async () => {
    // Odśwież wszystkie listy
    await loadAllData();
  };

  const handleTenantAssigned = async () => {
    // Odśwież wszystkie listy (zostań na zakładce Przypisz)
    await loadAllData();
  };

  const handleInvitationSent = async () => {
    // Odśwież listę wysłanych zaproszeń
    await loadSentInvitations();
  };

  // Funkcje obsługi notatek
  const openNoteModal = (user: UserManagementResponse) => {
    setSelectedUser(user);
    setNoteContent(userNotes[user.id] || '');
    setNoteModalVisible(true);
  };

  const saveNote = async () => {
    if (!selectedUser) return;
    
    try {
      await userNotesAPI.saveNote(selectedUser.id, noteContent);
      setUserNotes(prev => ({
        ...prev,
        [selectedUser.id]: noteContent
      }));
      setNoteModalVisible(false);
      Alert.alert('Sukces', 'Notatka została zapisana');
    } catch (error) {
      console.error('Failed to save note:', error);
      Alert.alert('Błąd', 'Nie udało się zapisać notatki');
    }
  };

  const deleteNote = async () => {
    if (!selectedUser) return;
    
    const performDelete = async () => {
      try {
        await userNotesAPI.deleteNote(selectedUser.id);
        setUserNotes(prev => {
          const newNotes = { ...prev };
          delete newNotes[selectedUser.id];
          return newNotes;
        });
        setNoteModalVisible(false);
        Alert.alert('Sukces', 'Notatka została usunięta');
      } catch (error) {
        console.error('Failed to delete note:', error);
        Alert.alert('Błąd', 'Nie udało się usunąć notatki');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Czy na pewno chcesz usunąć tę notatkę?')) {
        await performDelete();
      }
    } else {
      Alert.alert(
        'Usuń notatkę',
        'Czy na pewno chcesz usunąć tę notatkę?',
        [
          { text: 'Anuluj', style: 'cancel' },
          {
            text: 'Usuń',
            style: 'destructive',
            onPress: performDelete
          }
        ]
      );
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    Alert.alert(
      'Anuluj zaproszenie',
      'Czy na pewno chcesz anulować to zaproszenie?',
      [
        { text: 'Nie', style: 'cancel' },
        {
          text: 'Tak',
          style: 'destructive',
          onPress: async () => {
            try {
              await invitationsAPI.cancel(invitationId);
              await loadSentInvitations();
            } catch (error) {
              Alert.alert('Błąd', 'Nie udało się anulować zaproszenia');
            }
          },
        },
      ]
    );
  };

  const handleRemoveUser = async (user: UserManagementResponse, userType: 'tenant' | 'serviceman') => {
    const typeName = userType === 'tenant' ? 'najemcę' : 'serwisanta';
    const typeNameCapital = userType === 'tenant' ? 'Najemca' : 'Serwisant';
    const confirmMessage = `Czy na pewno chcesz usunąć ${user.firstName} ${user.lastName} z listy?\n\nUwaga: Użytkownik zachowa dostęp do historii (wcześniejsze wiadomości, mieszkania z okresu najmu).`;

    const performRemove = async () => {
      try {
        await userManagementAPI.removeUser(user.id);
        await loadAllData();
        if (Platform.OS === 'web') {
          window.alert(`${typeNameCapital} został usunięty z Twojej listy`);
        } else {
          Alert.alert('Sukces', `${typeNameCapital} został usunięty z Twojej listy`);
        }
      } catch (error: any) {
        console.log('Remove user error:', error);
        console.log('Error response:', error.response);
        console.log('Error response data:', error.response?.data);
        
        let message = 'Nie udało się usunąć użytkownika';
        if (error.response?.data) {
          if (typeof error.response.data === 'string') {
            message = error.response.data;
          } else if (error.response.data.message) {
            message = error.response.data.message;
          } else if (error.response.data.title) {
            message = error.response.data.title;
          }
        } else if (error.message) {
          message = error.message;
        }
        
        if (Platform.OS === 'web') {
          window.alert(`Błąd: ${message}`);
        } else {
          Alert.alert('Błąd', message);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) {
        await performRemove();
      }
    } else {
      Alert.alert(
        `Usuń ${typeName}`,
        confirmMessage,
        [
          { text: 'Anuluj', style: 'cancel' },
          { text: 'Usuń', style: 'destructive', onPress: performRemove },
        ]
      );
    }
  };

  const renderUserCard = ({ item }: { item: UserManagementResponse }) => {
    const note = userNotes[item.id];
    
    return (
      <View style={styles.userCard}>
        <TouchableOpacity 
          style={styles.userCardContent}
          onPress={() => openNoteModal(item)}
          activeOpacity={0.7}
        >
          <View style={styles.userInfo}>
            <View style={styles.iconContainer}>
              <Ionicons 
                name={activeTab === 'tenants' ? 'person' : 'construct'} 
                size={24} 
                color={Colors.primary} 
              />
            </View>
            <View style={styles.userDetails}>
              <View style={styles.userNameRow}>
                <Text style={styles.userName}>{capitalizeFullName(item.firstName, item.lastName)}</Text>
                <TouchableOpacity 
                  style={styles.noteButton}
                  onPress={() => openNoteModal(item)}
                >
                  <Ionicons 
                    name={note ? 'document-text' : 'document-text-outline'} 
                    size={20} 
                    color={note ? Colors.primary : Colors.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.userEmail}>{item.email}</Text>
              {note && (
                <View style={styles.notePreview}>
                  <Ionicons name="create-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.notePreviewText} numberOfLines={2}>{note}</Text>
                </View>
              )}
              {activeTab === 'tenants' && item.properties && item.properties.length > 0 && (
                <View style={styles.propertiesContainer}>
                  {item.properties.map((address, index) => (
                    <View key={index} style={styles.propertyItem}>
                      <Ionicons name="home" size={14} color={Colors.primary} />
                      <Text style={styles.propertyAddress}>{address}</Text>
                    </View>
                  ))}
                </View>
              )}
              {activeTab === 'tenants' && (!item.properties || item.properties.length === 0) && (
                <Text style={styles.noProperties}>Nie przypisano do żadnej nieruchomości</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.removeUserButton}
          onPress={() => handleRemoveUser(item, activeTab === 'tenants' ? 'tenant' : 'serviceman')}
        >
          <Ionicons name="trash-outline" size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderContent = () => {
    if (activeTab === 'tenants' || activeTab === 'servicemen') {
      const currentData = activeTab === 'tenants' ? tenants : servicemen;

      if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      );
    }

    return (
      <FlatList
        data={currentData}
        keyExtractor={(item) => item.id}
        renderItem={renderUserCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons 
              name={activeTab === 'tenants' ? 'people-outline' : 'construct-outline'} 
              size={64} 
              color={Colors.textSecondary} 
            />
            <Text style={styles.emptyText}>
              {activeTab === 'tenants' ? 'Brak najemców' : 'Brak serwisantów'}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'tenants' 
                ? 'Zaproś najemcę i przypisz do mieszkania' 
                : 'Zaproś serwisanta do współpracy'}
            </Text>
          </View>
        }
      />
    );
    }

    if (activeTab === 'assign') {
      return (
        <View style={styles.formContainer}>
          <AssignTenantForm 
            key={currentPropertyId || 'no-property'}
            onTenantAssigned={handleTenantAssigned} 
            initialPropertyId={currentPropertyId}
          />
        </View>
      );
    }

    if (activeTab === 'invite') {
      const pendingInvitations = sentInvitations.filter(i => i.status === 'Pending');
      return (
        <ScrollView style={styles.inviteContainer}>
          <View style={styles.formContainer}>
            <InviteUserForm onInvitationSent={handleInvitationSent} />
          </View>
          
          {pendingInvitations.length > 0 && (
            <View style={styles.pendingSection}>
              <Text style={styles.pendingSectionTitle}>Oczekujące zaproszenia</Text>
              {pendingInvitations.map((invitation) => (
                <View key={invitation.id} style={styles.invitationCard}>
                  <View style={styles.invitationInfo}>
                    <Text style={styles.invitationName}>{invitation.inviteeName}</Text>
                    <Text style={styles.invitationEmail}>{invitation.inviteeEmail}</Text>
                    <View style={styles.invitationTypeBadge}>
                      <Ionicons 
                        name={invitation.invitationType === 'Najemca' ? 'person' : 'construct'} 
                        size={14} 
                        color={Colors.primary} 
                      />
                      <Text style={styles.invitationTypeText}>{invitation.invitationType}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancelInvitation(invitation.id)}
                  >
                    <Ionicons name="close-circle" size={24} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      );
    }
  };

  const currentData = activeTab === 'tenants' ? tenants : servicemen;

  return (
    <View style={styles.container}>
      {/* Zakładki */}
      <View style={styles.tabsWrapper}>
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('tenants')}
            activeOpacity={0.7}
          >
            <View style={styles.tabContent}>
              <Ionicons 
                name="people-outline" 
                size={18} 
                color={activeTab === 'tenants' ? Colors.primary : Colors.textSecondary} 
              />
              <Text style={[styles.tabButtonText, activeTab === 'tenants' && styles.tabButtonTextActive]}>
                Najemcy
              </Text>
              <View style={[styles.tabBadge, activeTab === 'tenants' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'tenants' && styles.tabBadgeTextActive]}>
                  {tenants.length}
                </Text>
              </View>
            </View>
            {activeTab === 'tenants' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('servicemen')}
            activeOpacity={0.7}
          >
            <View style={styles.tabContent}>
              <Ionicons 
                name="construct-outline" 
                size={18} 
                color={activeTab === 'servicemen' ? Colors.primary : Colors.textSecondary} 
              />
              <Text style={[styles.tabButtonText, activeTab === 'servicemen' && styles.tabButtonTextActive]}>
                Serwisanci
              </Text>
              <View style={[styles.tabBadge, activeTab === 'servicemen' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'servicemen' && styles.tabBadgeTextActive]}>
                  {servicemen.length}
                </Text>
              </View>
            </View>
            {activeTab === 'servicemen' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('assign')}
            activeOpacity={0.7}
          >
            <View style={styles.tabContent}>
              <Ionicons 
                name="link-outline" 
                size={18} 
                color={activeTab === 'assign' ? Colors.primary : Colors.textSecondary} 
              />
              <Text style={[styles.tabButtonText, activeTab === 'assign' && styles.tabButtonTextActive]}>
                Przypisz
              </Text>
            </View>
            {activeTab === 'assign' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('invite')}
            activeOpacity={0.7}
          >
            <View style={styles.tabContent}>
              <Ionicons 
                name="person-add-outline" 
                size={18} 
                color={activeTab === 'invite' ? Colors.primary : Colors.textSecondary} 
              />
              <Text style={[styles.tabButtonText, activeTab === 'invite' && styles.tabButtonTextActive]}>
                Dodaj
              </Text>
              {sentInvitations.filter(i => i.status === 'Pending').length > 0 && (
                <View style={[styles.tabBadge, activeTab === 'invite' && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, activeTab === 'invite' && styles.tabBadgeTextActive]}>
                    {sentInvitations.filter(i => i.status === 'Pending').length}
                  </Text>
                </View>
              )}
            </View>
            {activeTab === 'invite' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Zawartość */}
      {renderContent()}

      {/* Modal notatki */}
      <Modal
        visible={noteModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setNoteModalVisible(false)}
      >
        <View style={styles.noteModalOverlay}>
          <View style={styles.noteModalContent}>
            <View style={styles.noteModalHeader}>
              <Text style={styles.noteModalTitle}>
                Notatka o {selectedUser ? capitalizeFullName(selectedUser.firstName, selectedUser.lastName) : ''}
              </Text>
              <TouchableOpacity onPress={() => setNoteModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.noteModalSubtitle}>
              Prywatna notatka widoczna tylko dla Ciebie
            </Text>
            
            <TextInput
              style={styles.noteInput}
              multiline
              placeholder="Wpisz notatkę..."
              value={noteContent}
              onChangeText={setNoteContent}
              textAlignVertical="top"
            />
            
            <View style={styles.noteModalButtons}>
              {userNotes[selectedUser?.id || ''] && (
                <TouchableOpacity 
                  style={styles.deleteNoteButton}
                  onPress={deleteNote}
                >
                  <Ionicons name="trash-outline" size={20} color={Colors.error} />
                  <Text style={styles.deleteNoteText}>Usuń</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.saveNoteButton}
                onPress={saveNote}
              >
                <Ionicons name="checkmark" size={20} color={Colors.white} />
                <Text style={styles.saveNoteText}>Zapisz</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabsWrapper: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
  },
  tabButton: {
    flex: 1,
    position: 'relative',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.2,
  },
  tabButtonTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: '#E8E8E8',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: Colors.primary + '20',
  },
  tabBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  tabBadgeTextActive: {
    color: Colors.primary,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  formContainer: {
    padding: Spacing.m,
    backgroundColor: '#fff',
    margin: Spacing.m,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: Spacing.m,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: Spacing.m,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userCardContent: {
    flex: 1,
    padding: Spacing.m,
  },
  removeUserButton: {
    padding: Spacing.m,
    marginRight: Spacing.xs,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.m,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
    gap: 6,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  propertiesContainer: {
    gap: 6,
    marginTop: 4,
  },
  propertyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  propertyAddress: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  noProperties: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.s,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.m,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  inviteContainer: {
    flex: 1,
  },
  pendingSection: {
    padding: Spacing.m,
  },
  pendingSectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.s,
  },
  invitationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: Spacing.m,
    borderRadius: 12,
    marginBottom: Spacing.s,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  invitationInfo: {
    flex: 1,
    gap: 4,
  },
  invitationName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  invitationEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  invitationTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  invitationTypeText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  cancelButton: {
    padding: Spacing.xs,
  },
  // Notatki
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noteButton: {
    padding: 4,
  },
  notePreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  notePreviewText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  noteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  noteModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.l,
    paddingBottom: Spacing.xl,
    maxHeight: '80%',
  },
  noteModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.s,
  },
  noteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  noteModalSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.m,
  },
  noteInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: Spacing.m,
    minHeight: 150,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.m,
    marginTop: Spacing.m,
  },
  deleteNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.s,
    paddingHorizontal: Spacing.m,
  },
  deleteNoteText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.error,
  },
  saveNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.s,
    paddingHorizontal: Spacing.l,
    borderRadius: 10,
  },
  saveNoteText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
});
