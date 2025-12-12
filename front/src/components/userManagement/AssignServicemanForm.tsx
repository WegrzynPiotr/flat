import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { userManagementAPI, serviceRequestsAPI } from '../../api/endpoints';
import { UserManagementResponse } from '../../types/api';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';
import { Typography } from '../../styles/typography';
import { capitalizeFullName } from '../../utils/textFormatters';

interface AssignServicemanFormProps {
  issueId: string;
  onAssigned: () => void;
  currentServicemanId?: string;
}

interface PendingRequest {
  id: string;
  servicemanId: string;
  servicemanName: string;
  status: string;
  createdAt: string;
  respondedAt?: string;
  responseMessage?: string;
}

interface HistoryEvent {
  id: string;
  servicemanName: string;
  status: string;
  date: string;
  message?: string;
}

// Funkcja generująca wydarzenia historyczne z requestów
// Jeśli status to "Zrezygnowano" lub "Anulowane" (usunięcie serwisanta), generujemy dwa wydarzenia
const generateHistoryEvents = (requests: PendingRequest[]): HistoryEvent[] => {
  const events: HistoryEvent[] = [];
  
  requests.forEach(request => {
    if (request.status === 'Oczekujące') {
      // Oczekujące pomijamy w historii
      return;
    }
    
    if (request.status === 'Zrezygnowano') {
      // Serwisant zrezygnował po akceptacji - dodaj oba wydarzenia
      // Najpierw akceptacja
      events.push({
        id: `${request.id}-accepted`,
        servicemanName: request.servicemanName,
        status: 'Zaakceptowane',
        date: request.createdAt,
      });
      // Potem rezygnacja
      events.push({
        id: `${request.id}-resigned`,
        servicemanName: request.servicemanName,
        status: 'Zrezygnowano',
        date: request.respondedAt || request.createdAt,
        message: request.responseMessage,
      });
    } else if (request.status === 'Anulowane') {
      // Właściciel anulował/usunął serwisanta
      // Sprawdzamy czy to było usunięcie serwisanta (po akceptacji) czy anulowanie zaproszenia (przed akceptacją)
      // Usunięcie serwisanta ma responseMessage, anulowanie zaproszenia nie ma
      const wasAcceptedAndRemoved = request.responseMessage && request.responseMessage.length > 0;
      
      if (wasAcceptedAndRemoved) {
        // Dodaj wpis o akceptacji
        events.push({
          id: `${request.id}-accepted`,
          servicemanName: request.servicemanName,
          status: 'Zaakceptowane',
          date: request.createdAt,
        });
      }
      // Dodaj wpis o anulowaniu
      events.push({
        id: `${request.id}-cancelled`,
        servicemanName: request.servicemanName,
        status: 'Anulowane',
        date: request.respondedAt || request.createdAt,
        message: request.responseMessage,
      });
    } else {
      // Inne statusy (Zaakceptowane, Odrzucone, Wygasłe)
      events.push({
        id: request.id,
        servicemanName: request.servicemanName,
        status: request.status,
        date: request.respondedAt || request.createdAt,
        message: request.responseMessage,
      });
    }
  });
  
  // Sortuj chronologicznie (najstarsze pierwsze)
  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export default function AssignServicemanForm({ issueId, onAssigned, currentServicemanId }: AssignServicemanFormProps) {
  const [servicemen, setServicemen] = useState<UserManagementResponse[]>([]);
  const [selectedServicemen, setSelectedServicemen] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);

  useEffect(() => {
    loadData();
  }, [issueId]);

  const loadData = async () => {
    try {
      const [servicemenRes, requestsRes] = await Promise.all([
        userManagementAPI.getMyServicemen(),
        serviceRequestsAPI.getForIssue(issueId)
      ]);
      setServicemen(servicemenRes.data);
      setPendingRequests(requestsRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Błąd', 'Nie udało się załadować danych');
    } finally {
      setLoading(false);
    }
  };

  const toggleServiceman = (servicemanId: string) => {
    if (selectedServicemen.includes(servicemanId)) {
      setSelectedServicemen(selectedServicemen.filter(id => id !== servicemanId));
    } else {
      setSelectedServicemen([...selectedServicemen, servicemanId]);
    }
  };

  const handleSendInvitations = async () => {
    if (selectedServicemen.length === 0) {
      Alert.alert('Błąd', 'Wybierz przynajmniej jednego serwisanta');
      return;
    }

    setSubmitting(true);
    try {
      if (selectedServicemen.length === 1) {
        await serviceRequestsAPI.send(issueId, selectedServicemen[0], message || undefined);
      } else {
        await serviceRequestsAPI.sendMultiple(issueId, selectedServicemen, message || undefined);
      }
      
      Alert.alert('Sukces', `Zaproszenie zostało wysłane do ${selectedServicemen.length} serwisant${selectedServicemen.length > 1 ? 'ów' : 'a'}`);
      setSelectedServicemen([]);
      setMessage('');
      loadData();
      onAssigned();
    } catch (error: any) {
      console.error('Failed to send invitations:', error);
      Alert.alert('Błąd', error.response?.data?.message || error.response?.data || 'Nie udało się wysłać zaproszeń');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    const doCancel = async () => {
      try {
        await serviceRequestsAPI.cancel(requestId);
        if (Platform.OS === 'web') {
          alert('Zaproszenie zostało anulowane');
        } else {
          Alert.alert('Sukces', 'Zaproszenie zostało anulowane');
        }
        loadData();
      } catch (error: any) {
        const message = error.response?.data?.message || 'Nie udało się anulować zaproszenia';
        if (Platform.OS === 'web') {
          alert(message);
        } else {
          Alert.alert('Błąd', message);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Czy na pewno chcesz anulować to zaproszenie?')) {
        await doCancel();
      }
    } else {
      Alert.alert(
        'Anuluj zaproszenie',
        'Czy na pewno chcesz anulować to zaproszenie?',
        [
          { text: 'Nie', style: 'cancel' },
          { text: 'Tak', style: 'destructive', onPress: doCancel }
        ]
      );
    }
  };

  const handleRemoveServiceman = async () => {
    const doRemove = async () => {
      try {
        await serviceRequestsAPI.removeServiceman(issueId);
        if (Platform.OS === 'web') {
          alert('Serwisant został usunięty ze zgłoszenia');
        } else {
          Alert.alert('Sukces', 'Serwisant został usunięty ze zgłoszenia');
        }
        loadData();
        onAssigned();
      } catch (error: any) {
        const message = error.response?.data?.message || 'Nie udało się usunąć serwisanta';
        if (Platform.OS === 'web') {
          alert(message);
        } else {
          Alert.alert('Błąd', message);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Czy na pewno chcesz usunąć serwisanta z tego zgłoszenia? Będziesz mógł zaprosić innego.')) {
        await doRemove();
      }
    } else {
      Alert.alert(
        'Usuń serwisanta',
        'Czy na pewno chcesz usunąć serwisanta z tego zgłoszenia? Będziesz mógł zaprosić innego.',
        [
          { text: 'Nie', style: 'cancel' },
          { text: 'Tak, usuń', style: 'destructive', onPress: doRemove }
        ]
      );
    }
  };

  // Sprawdź czy już jest przypisany serwisant
  const hasAssignedServiceman = currentServicemanId !== undefined && currentServicemanId !== '';
  
  // Pobierz nazwisko przypisanego serwisanta z pendingRequests (status Zaakceptowane)
  const assignedServicemanRequest = pendingRequests.find(r => r.status === 'Zaakceptowane' && r.servicemanId === currentServicemanId);
  const assignedServicemanName = assignedServicemanRequest?.servicemanName || 'Nieznany';

  // Serwisanci do których już wysłano zaproszenie
  const pendingServicemanIds = pendingRequests
    .filter(r => r.status === 'Oczekujące')
    .map(r => r.servicemanId);

  // Dostępni serwisanci (nie przypisani, nie oczekujące zaproszenie)
  const availableServicemen = servicemen.filter(s => 
    s.id !== currentServicemanId && !pendingServicemanIds.includes(s.id)
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  // Jeśli jest już przypisany serwisant - pokazujemy info, nazwisko i możliwość usunięcia
  if (hasAssignedServiceman) {
    return (
      <View style={styles.container}>
        <Text style={Typography.h3}>Przypisany serwisant</Text>
        <View style={styles.assignedCard}>
          <View style={styles.assignedInfo}>
            <Ionicons name="person" size={24} color={Colors.primary} />
            <View style={styles.assignedDetails}>
              <Text style={styles.assignedName}>{assignedServicemanName}</Text>
              <Text style={styles.assignedStatus}>Przypisany do zgłoszenia</Text>
              {assignedServicemanRequest?.respondedAt && (
                <Text style={styles.assignedDate}>
                  Przyjął: {new Date(assignedServicemanRequest.respondedAt).toLocaleString('pl-PL', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity 
            style={styles.removeButton}
            onPress={handleRemoveServiceman}
          >
            <Ionicons name="close-circle" size={20} color={Colors.error} />
            <Text style={styles.removeButtonText}>Zmień serwisanta</Text>
          </TouchableOpacity>
        </View>
        
        {/* Historia zaproszeń - chronologicznie */}
        {generateHistoryEvents(pendingRequests).length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Historia serwisantów</Text>
            {generateHistoryEvents(pendingRequests).map((event) => (
              <View key={event.id} style={styles.historyCard}>
                <View style={styles.historyInfo}>
                  <Ionicons 
                    name={getStatusIcon(event.status)} 
                    size={16} 
                    color={Colors.textSecondary} 
                  />
                  <Text style={styles.historyName}>{event.servicemanName}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(event.status) }]}>
                    <Text style={styles.statusBadgeText}>{event.status}</Text>
                  </View>
                </View>
                {event.message && (
                  <Text style={styles.responseMessage}>{event.message}</Text>
                )}
                <Text style={styles.historyDate}>
                  {new Date(event.date).toLocaleString('pl-PL', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={Typography.h3}>Wyślij zaproszenie do naprawy</Text>
      <Text style={styles.subtitle}>
        Wybierz serwisantów do których chcesz wysłać zaproszenie. Pierwszy który je zaakceptuje zostanie przypisany.
      </Text>

      {/* Oczekujące zaproszenia */}
      {pendingRequests.filter(r => r.status === 'Oczekujące').length > 0 && (
        <View style={styles.pendingSection}>
          <Text style={styles.sectionTitle}>Oczekujące zaproszenia</Text>
          {pendingRequests.filter(r => r.status === 'Oczekujące').map((request) => (
            <View key={request.id} style={styles.pendingCard}>
              <View style={styles.pendingInfo}>
                <Ionicons name="hourglass-outline" size={18} color="#FFC107" />
                <Text style={styles.pendingName}>{request.servicemanName}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => handleCancelRequest(request.id)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Anuluj</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Historia - chronologicznie */}
      {generateHistoryEvents(pendingRequests).length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Historia zaproszeń</Text>
          {generateHistoryEvents(pendingRequests).map((event) => (
            <View key={event.id} style={styles.historyCard}>
              <View style={styles.historyInfo}>
                <Ionicons 
                  name={getStatusIcon(event.status)} 
                  size={16} 
                  color={Colors.textSecondary} 
                />
                <Text style={styles.historyName}>{event.servicemanName}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(event.status) }]}>
                  <Text style={styles.statusBadgeText}>{event.status}</Text>
                </View>
              </View>
              {event.message && (
                <Text style={styles.responseMessage}>{event.message}</Text>
              )}
              <Text style={styles.historyDate}>
                {new Date(event.date).toLocaleString('pl-PL', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Wybór serwisantów */}
      {availableServicemen.length > 0 ? (
        <View style={styles.form}>
          <Text style={styles.label}>Wybierz serwisantów</Text>
          <ScrollView style={styles.servicemanList} nestedScrollEnabled>
            {availableServicemen.map((serviceman) => {
              const isSelected = selectedServicemen.includes(serviceman.id);
              return (
                <TouchableOpacity
                  key={serviceman.id}
                  style={[styles.servicemanCard, isSelected && styles.servicemanCardSelected]}
                  onPress={() => toggleServiceman(serviceman.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.checkbox}>
                    {isSelected && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                  </View>
                  <View style={styles.servicemanInfo}>
                    <Text style={styles.servicemanName}>
                      {capitalizeFullName(serviceman.firstName, serviceman.lastName)}
                    </Text>
                    <Text style={styles.servicemanEmail}>{serviceman.email}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.label}>Wiadomość (opcjonalna)</Text>
          <TextInput
            style={styles.messageInput}
            placeholder="Np. Proszę o szybką reakcję, usterka jest pilna"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.submitButton, (submitting || selectedServicemen.length === 0) && styles.submitButtonDisabled]}
            onPress={handleSendInvitations}
            disabled={submitting || selectedServicemen.length === 0}
          >
            <Ionicons name="send" size={18} color="#fff" />
            <Text style={styles.submitButtonText}>
              {submitting ? 'Wysyłam...' : `Wyślij zaproszenie (${selectedServicemen.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={32} color={Colors.textSecondary} />
          <Text style={styles.emptyText}>
            {servicemen.length === 0 
              ? 'Nie masz żadnych serwisantów. Dodaj serwisanta w ustawieniach.'
              : 'Wysłałeś już zaproszenia do wszystkich dostępnych serwisantów.'}
          </Text>
        </View>
      )}
    </View>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Odrzucone': return Colors.error;
    case 'Wygasłe': return Colors.textSecondary;
    case 'Zaakceptowane': return Colors.success;
    case 'Anulowane': return Colors.textSecondary;
    case 'Zrezygnowano': return '#FF9800';
    default: return Colors.textSecondary;
  }
};

const getStatusIcon = (status: string): any => {
  switch (status) {
    case 'Zaakceptowane': return 'checkmark-circle';
    case 'Odrzucone': return 'close-circle';
    case 'Wygasłe': return 'time';
    case 'Anulowane': return 'ban';
    case 'Zrezygnowano': return 'exit';
    default: return 'help-circle';
  }
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    padding: Spacing.m,
    borderRadius: 8,
  },
  centerContainer: {
    padding: Spacing.m,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '15',
    padding: Spacing.m,
    borderRadius: 8,
    gap: 8,
  },
  assignedText: {
    color: Colors.success,
    fontWeight: '500',
    flex: 1,
  },
  assignedCard: {
    backgroundColor: Colors.background,
    padding: Spacing.m,
    borderRadius: 8,
    marginTop: Spacing.m,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  assignedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  assignedDetails: {
    flex: 1,
  },
  assignedName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  assignedStatus: {
    fontSize: 13,
    color: Colors.success,
    marginTop: 2,
  },
  assignedDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.m,
    paddingTop: Spacing.m,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  removeButtonText: {
    fontSize: 14,
    color: Colors.error,
    fontWeight: '500',
  },
  historyDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  pendingSection: {
    marginTop: Spacing.m,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.s,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF8E1',
    padding: Spacing.s,
    borderRadius: 8,
    marginBottom: Spacing.xs,
  },
  pendingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  cancelButton: {
    paddingHorizontal: Spacing.s,
    paddingVertical: 4,
  },
  cancelButtonText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '500',
  },
  historySection: {
    marginTop: Spacing.m,
  },
  historyCard: {
    backgroundColor: Colors.background,
    padding: Spacing.s,
    borderRadius: 8,
    marginBottom: Spacing.xs,
  },
  historyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyName: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  responseMessage: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
    marginLeft: 24,
  },
  form: {
    marginTop: Spacing.m,
  },
  label: {
    ...Typography.bodyBold,
    marginBottom: Spacing.s,
    marginTop: Spacing.m,
  },
  servicemanList: {
    maxHeight: 200,
  },
  servicemanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.m,
    borderRadius: 8,
    marginBottom: Spacing.xs,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  servicemanCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.m,
    backgroundColor: '#fff',
  },
  servicemanInfo: {
    flex: 1,
  },
  servicemanName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  servicemanEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.m,
    backgroundColor: Colors.background,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    padding: Spacing.m,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.m,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.textSecondary,
  },
  submitButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 15,
  },
  emptyContainer: {
    marginTop: Spacing.m,
    alignItems: 'center',
    padding: Spacing.m,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: Spacing.s,
    lineHeight: 20,
  },
});
