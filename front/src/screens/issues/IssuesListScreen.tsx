import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Text,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import { fetchIssues } from '../../store/slices/issuesSlice';
import { propertiesAPI, userManagementAPI, serviceRequestsAPI } from '../../api/endpoints';
import IssueCard from '../../components/issues/IssueCard';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import { AppDispatch, RootState } from '../../store/store';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';
import { Typography } from '../../styles/typography';
import { PropertyResponse, UserManagementResponse, ServiceRequestResponse } from '../../types/api';

type TabType = 'pending' | 'active' | 'resolved';

export default function IssuesListScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { issues, loading, error } = useSelector((state: RootState) => state.issues);
  const user = useSelector((state: RootState) => state.auth.user);
  const userRole = user?.role;
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedServiceman, setSelectedServiceman] = useState<string>('all');
  const [properties, setProperties] = useState<PropertyResponse[]>([]);
  const [servicemen, setServicemen] = useState<UserManagementResponse[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<ServiceRequestResponse[]>([]);
  const [rejectedIssueIds, setRejectedIssueIds] = useState<string[]>([]); // ID usterek które serwisant odrzucił lub zrezygnował
  const [pendingLoading, setPendingLoading] = useState(false);
  // Czy użytkownik jest dodany jako serwisant u kogoś (nie bazuje na roli systemowej)
  const [isUserServiceman, setIsUserServiceman] = useState(false);

  useEffect(() => {
    dispatch(fetchIssues({}));
    loadFilterData();
    checkIfUserIsServiceman();
  }, [dispatch]);

  // Odświeżaj przy powrocie na ekran
  useFocusEffect(
    useCallback(() => {
      loadPendingRequests();
      dispatch(fetchIssues({}));
    }, [])
  );

  // Sprawdź czy użytkownik jest serwisantem (dodany u kogoś jako serwisant)
  const checkIfUserIsServiceman = async () => {
    try {
      // Najpierw sprawdź przez endpoint czy użytkownik jest serwisantem
      const isServicemanResponse = await serviceRequestsAPI.isServiceman();
      const isServiceman = isServicemanResponse.data.isServiceman;
      setIsUserServiceman(isServiceman);
      
      if (isServiceman) {
        // Jeśli jest serwisantem, pobierz oczekujące zaproszenia
        const pendingResponse = await serviceRequestsAPI.getPending();
        setPendingRequests(pendingResponse.data);
        
        // Pobierz historię zaproszeń (odrzucone, zrezygnowane) żeby ukryć te usterki
        const historyResponse = await serviceRequestsAPI.getHistory();
        const rejectedOrResignedIds = historyResponse.data
          .filter((r: ServiceRequestResponse) => r.status === 'Odrzucone' || r.status === 'Zrezygnowano')
          .map((r: ServiceRequestResponse) => r.issueId);
        setRejectedIssueIds(rejectedOrResignedIds);
        
        // Jeśli ma oczekujące zaproszenia, ustaw domyślną zakładkę na "pending"
        if (pendingResponse.data.length > 0 && activeTab === 'active') {
          setActiveTab('pending');
        }
      }
    } catch (error) {
      console.log('Error checking serviceman status:', error);
      setIsUserServiceman(false);
    }
  };

  const loadPendingRequests = async () => {
    if (!isUserServiceman) return;
    
    try {
      setPendingLoading(true);
      const response = await serviceRequestsAPI.getPending();
      setPendingRequests(response.data);
      
      // Pobierz też historię żeby zaktualizować listę odrzuconych/zrezygnowanych
      const historyResponse = await serviceRequestsAPI.getHistory();
      const rejectedOrResignedIds = historyResponse.data
        .filter((r: ServiceRequestResponse) => r.status === 'Odrzucone' || r.status === 'Zrezygnowano')
        .map((r: ServiceRequestResponse) => r.issueId);
      setRejectedIssueIds(rejectedOrResignedIds);
    } catch (error) {
      console.log('Failed to load pending requests');
    } finally {
      setPendingLoading(false);
    }
  };

  const loadFilterData = async () => {
    try {
      const propsResponse = await propertiesAPI.getAll();
      setProperties(propsResponse.data);
      
      if (userRole === 'Wlasciciel') {
        const servicemanResponse = await userManagementAPI.getMyServicemen();
        setServicemen(servicemanResponse.data);
      }
    } catch (error) {
      console.error('Failed to load filter data:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchIssues({}));
    await loadPendingRequests();
    setRefreshing(false);
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await serviceRequestsAPI.accept(requestId);
      Alert.alert('Sukces', 'Zaproszenie zostało zaakceptowane - jesteś przypisany do tego zgłoszenia');
      loadPendingRequests();
      dispatch(fetchIssues({}));
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.response?.data || 'Nie udało się zaakceptować zaproszenia';
      Alert.alert('Błąd', message);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const doReject = async () => {
      try {
        console.log('🔵 Rejecting request:', requestId);
        await serviceRequestsAPI.reject(requestId);
        console.log('🟢 Request rejected successfully');
        if (Platform.OS === 'web') {
          alert('Zaproszenie zostało odrzucone');
        } else {
          Alert.alert('Sukces', 'Zaproszenie zostało odrzucone');
        }
        loadPendingRequests();
        dispatch(fetchIssues({})); // Odśwież listę usterek
      } catch (error: any) {
        console.error('🔴 Error rejecting request:', error?.response?.data || error);
        const message = error?.response?.data?.message || error?.response?.data || 'Nie udało się odrzucić zaproszenia';
        if (Platform.OS === 'web') {
          alert(message);
        } else {
          Alert.alert('Błąd', message);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Czy na pewno chcesz odrzucić to zaproszenie?')) {
        await doReject();
      }
    } else {
      Alert.alert(
        'Odrzuć zaproszenie',
        'Czy na pewno chcesz odrzucić to zaproszenie?',
        [
          { text: 'Anuluj', style: 'cancel' },
          { text: 'Odrzuć', style: 'destructive', onPress: doReject }
        ]
      );
    }
  };

  // ID usterek z oczekujących zaproszeń - te nie powinny być pokazywane w "Aktywne"
  // bo są widoczne w "Do akceptacji" dopóki serwisant nie zaakceptuje
  const pendingIssueIds = pendingRequests.map(r => r.issueId);

  const filteredIssues = issues.filter(issue => {
    // Filtruj po zakładce (aktywne/rozwiązane)
    if (activeTab === 'active' && issue.status === 'Rozwiązane') return false;
    if (activeTab === 'resolved' && issue.status !== 'Rozwiązane') return false;

    // Jeśli serwisant ma oczekujące zaproszenie do tej usterki, nie pokazuj jej w "Aktywne"
    // (będzie pokazana w "Do akceptacji" dopóki nie zaakceptuje)
    if (activeTab === 'active' && isUserServiceman && pendingIssueIds.includes(issue.id)) {
      return false;
    }

    // Jeśli serwisant odrzucił zaproszenie lub zrezygnował z tej usterki, nie pokazuj jej
    // (chyba że jest też właścicielem/najemcą i ma do niej dostęp z innego powodu - 
    // ale wtedy nie powinien widzieć jej jako "swojej" do naprawy)
    if (isUserServiceman && rejectedIssueIds.includes(issue.id)) {
      // Sprawdź czy serwisant jest przypisany do tej usterki - jeśli nie, ukryj
      const isAssignedToIssue = issue.assignedServicemen?.some(s => s.servicemanId === user?.id);
      if (!isAssignedToIssue) {
        return false;
      }
    }

    // Filtruj po mieszkaniu
    if (selectedProperty !== 'all' && issue.propertyId !== selectedProperty) return false;

    // Filtruj po statusie
    if (selectedStatus !== 'all' && issue.status !== selectedStatus) return false;

    // Filtruj po serwisancie
    if (selectedServiceman !== 'all') {
      const hasServiceman = issue.assignedServicemen?.some(s => s.servicemanId === selectedServiceman);
      if (!hasServiceman) return false;
    }

    return true;
  });

  if (loading && issues.length === 0) {
    return <Loading />;
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Krytyczna': return Colors.error;
      case 'Wysoka': return '#FF9800';
      case 'Średnia': return '#FFC107';
      case 'Niska': return Colors.success;
      default: return Colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      {error && <ErrorMessage message={error} />}
      
      {/* Zakładki w stylu Material Design */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tabsRow}>
            {/* Zakładka "Do akceptacji" - pokazuj jeśli użytkownik jest serwisantem lub ma zaproszenia */}
            {isUserServiceman && (
              <TouchableOpacity
                style={styles.tabButton}
                onPress={() => setActiveTab('pending')}
                activeOpacity={0.7}
              >
                <View style={styles.tabContent}>
                  <Text style={[styles.tabButtonText, activeTab === 'pending' && styles.tabButtonTextActive]}>
                    Do akceptacji
                  </Text>
                  <View style={[styles.tabBadge, activeTab === 'pending' && styles.tabBadgeActive, pendingRequests.length > 0 && styles.tabBadgeHighlight]}>
                    <Text style={[styles.tabBadgeText, activeTab === 'pending' && styles.tabBadgeTextActive, pendingRequests.length > 0 && styles.tabBadgeTextHighlight]}>
                      {pendingRequests.length}
                    </Text>
                  </View>
                </View>
                {activeTab === 'pending' && <View style={styles.activeIndicator} />}
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => setActiveTab('active')}
              activeOpacity={0.7}
            >
              <View style={styles.tabContent}>
                <Text style={[styles.tabButtonText, activeTab === 'active' && styles.tabButtonTextActive]}>
                  Aktywne
                </Text>
                <View style={[styles.tabBadge, activeTab === 'active' && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, activeTab === 'active' && styles.tabBadgeTextActive]}>
                    {issues.filter(i => {
                      if (i.status === 'Rozwiązane') return false;
                      if (isUserServiceman && pendingIssueIds.includes(i.id)) return false;
                      if (isUserServiceman && rejectedIssueIds.includes(i.id)) {
                        const isAssigned = i.assignedServicemen?.some(s => s.servicemanId === user?.id);
                        if (!isAssigned) return false;
                      }
                      return true;
                    }).length}
                  </Text>
                </View>
              </View>
              {activeTab === 'active' && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => setActiveTab('resolved')}
              activeOpacity={0.7}
            >
              <View style={styles.tabContent}>
                <Text style={[styles.tabButtonText, activeTab === 'resolved' && styles.tabButtonTextActive]}>
                  Rozwiązane
                </Text>
                <View style={[styles.tabBadge, activeTab === 'resolved' && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, activeTab === 'resolved' && styles.tabBadgeTextActive]}>
                    {issues.filter(i => i.status === 'Rozwiązane').length}
                  </Text>
                </View>
              </View>
              {activeTab === 'resolved' && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Nowoczesny przycisk filtrów */}
      <TouchableOpacity
        style={styles.filterToggle}
        onPress={() => setShowFilters(!showFilters)}
        activeOpacity={0.7}
      >
        <View style={styles.filterToggleContent}>
          <View style={styles.filterToggleLeft}>
            <Ionicons name="funnel-outline" size={20} color={Colors.primary} />
            <Text style={styles.filterToggleText}>Filtry</Text>
          </View>
          <Ionicons 
            name={showFilters ? "chevron-up-outline" : "chevron-down-outline"} 
            size={20} 
            color={Colors.textSecondary} 
          />
        </View>
      </TouchableOpacity>

      {/* Panel filtrów z animacją */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          {userRole !== 'Serwisant' && properties.length > 0 && (
            <View style={styles.filterItem}>
              <View style={styles.filterLabelRow}>
                <Ionicons name="home-outline" size={18} color={Colors.primary} />
                <Text style={styles.filterLabel}>Mieszkanie</Text>
              </View>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedProperty}
                  onValueChange={setSelectedProperty}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  <Picker.Item label="Wszystkie mieszkania" value="all" />
                  {properties.map((prop) => (
                    <Picker.Item key={prop.id} label={prop.address} value={prop.id} />
                  ))}
                </Picker>
              </View>
            </View>
          )}

          {activeTab === 'active' && (
            <View style={styles.filterItem}>
              <View style={styles.filterLabelRow}>
                <Ionicons name="flag-outline" size={18} color={Colors.primary} />
                <Text style={styles.filterLabel}>Status</Text>
              </View>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedStatus}
                  onValueChange={setSelectedStatus}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  <Picker.Item label="Wszystkie statusy" value="all" />
                  <Picker.Item label="Nowe" value="Nowe" />
                  <Picker.Item label="W trakcie" value="W trakcie" />
                  <Picker.Item label="Oczekuje na części" value="Oczekuje na części" />
                </Picker>
              </View>
            </View>
          )}

          {userRole === 'Wlasciciel' && servicemen.length > 0 && (
            <View style={styles.filterItem}>
              <View style={styles.filterLabelRow}>
                <Ionicons name="person-outline" size={18} color={Colors.primary} />
                <Text style={styles.filterLabel}>Serwisant</Text>
              </View>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedServiceman}
                  onValueChange={setSelectedServiceman}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  <Picker.Item label="Wszyscy serwisanci" value="all" />
                  <Picker.Item label="Nieprzypisane" value="none" />
                  {servicemen.map((serviceman) => (
                    <Picker.Item 
                      key={serviceman.id} 
                      label={`${serviceman.firstName} ${serviceman.lastName}`} 
                      value={serviceman.id} 
                    />
                  ))}
                </Picker>
              </View>
            </View>
          )}
        </View>
      )}
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Zakładka Do akceptacji - zaproszenia dla serwisantów */}
        {activeTab === 'pending' && isUserServiceman && (
          <View style={styles.gridContainer}>
            {pendingLoading ? (
              <Loading />
            ) : pendingRequests.length > 0 ? (
              pendingRequests.map((request) => (
                <View key={request.id} style={styles.requestCard}>
                  <TouchableOpacity 
                    style={styles.requestClickable}
                    onPress={() => navigation.navigate('IssueDetails', { id: request.issueId })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.requestHeader}>
                      <Text style={styles.requestTitle}>{request.issueTitle}</Text>
                      <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(request.issuePriority) }]}>
                        <Text style={styles.priorityText}>{request.issuePriority}</Text>
                      </View>
                    </View>
                    
                    <Text style={styles.requestDescription} numberOfLines={3}>
                      {request.issueDescription}
                    </Text>
                    
                    <View style={styles.requestDetails}>
                      <View style={styles.detailRow}>
                        <Ionicons name="location-outline" size={16} color={Colors.textSecondary} />
                        <Text style={styles.detailText}>{request.propertyAddress}, {request.propertyCity}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="person-outline" size={16} color={Colors.textSecondary} />
                        <Text style={styles.detailText}>Właściciel: {request.landlordName}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="construct-outline" size={16} color={Colors.textSecondary} />
                        <Text style={styles.detailText}>Kategoria: {request.issueCategory || 'Brak'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                        <Text style={styles.detailText}>
                          Wysłano: {new Date(request.createdAt).toLocaleDateString('pl-PL')}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.viewDetailsHint}>
                      <Ionicons name="eye-outline" size={14} color={Colors.primary} />
                      <Text style={styles.viewDetailsText}>Kliknij, aby zobaczyć szczegóły</Text>
                    </View>
                  </TouchableOpacity>
                  
                  {request.message && (
                    <View style={styles.messageBox}>
                      <Text style={styles.messageLabel}>Wiadomość od właściciela:</Text>
                      <Text style={styles.messageText}>{request.message}</Text>
                    </View>
                  )}
                  
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleRejectRequest(request.id)}
                    >
                      <Ionicons name="close" size={20} color={Colors.error} />
                      <Text style={[styles.actionButtonText, { color: Colors.error }]}>Odrzuć</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => handleAcceptRequest(request.id)}
                    >
                      <Ionicons name="checkmark" size={20} color="#fff" />
                      <Text style={[styles.actionButtonText, { color: '#fff' }]}>Przyjmij</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="mail-open-outline" size={64} color={Colors.textSecondary} />
                <Text style={styles.emptyText}>Brak zaproszeń do naprawy</Text>
                <Text style={styles.emptySubtext}>
                  Tutaj pojawią się zaproszenia od właścicieli mieszkań do naprawy usterek
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Zakładki Aktywne i Rozwiązane - normalna lista usterek */}
        {activeTab !== 'pending' && (
          <View style={styles.gridContainer}>
            {filteredIssues.length > 0 ? (
              filteredIssues.map((item) => (
                <View key={item.id} style={styles.gridItem}>
                  <IssueCard
                    issue={item}
                    onPress={() => navigation.navigate('IssueDetails', { id: item.id })}
                  />
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Brak usterek do wyświetlenia</Text>
            )}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateIssue')}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
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
  filterToggle: {
    backgroundColor: '#fff',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
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
  filtersPanel: {
    backgroundColor: '#fff',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    gap: Spacing.lg,
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
  scrollContent: {
    flexGrow: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.md,
    gap: Spacing.md,
    justifyContent: 'center',
  },
  gridItem: {
    minWidth: 300,
    maxWidth: 450,
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.xl,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.xl,
  },
  emptySubtext: {
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  tabBadgeHighlight: {
    backgroundColor: Colors.error,
  },
  tabBadgeTextHighlight: {
    color: '#fff',
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
    maxWidth: 500,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  requestTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  requestDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  requestDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  messageBox: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: Colors.text,
    fontStyle: 'italic',
  },
  requestActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: Colors.success,
  },
  rejectButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.error,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  requestClickable: {
    marginBottom: Spacing.sm,
  },
  viewDetailsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  viewDetailsText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
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
});
