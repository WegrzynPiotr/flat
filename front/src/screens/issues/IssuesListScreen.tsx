import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Text,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { fetchIssues } from '../../store/slices/issuesSlice';
import { propertiesAPI, userManagementAPI } from '../../api/endpoints';
import IssueCard from '../../components/issues/IssueCard';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import { AppDispatch, RootState } from '../../store/store';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';
import { Typography } from '../../styles/typography';
import { PropertyResponse, UserManagementResponse } from '../../types/api';

type TabType = 'active' | 'resolved';

export default function IssuesListScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { issues, loading, error } = useSelector((state: RootState) => state.issues);
  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedServiceman, setSelectedServiceman] = useState<string>('all');
  const [properties, setProperties] = useState<PropertyResponse[]>([]);
  const [servicemen, setServicemen] = useState<UserManagementResponse[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    dispatch(fetchIssues({}));
    loadFilterData();
  }, [dispatch]);

  const loadFilterData = async () => {
    try {
      if (userRole !== 'Serwisant') {
        const propsResponse = await propertiesAPI.getAll();
        setProperties(propsResponse.data);
      }
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
    setRefreshing(false);
  };

  const filteredIssues = issues.filter(issue => {
    // Filtruj po zakładce (aktywne/rozwiązane)
    if (activeTab === 'active' && issue.status === 'Rozwiązane') return false;
    if (activeTab === 'resolved' && issue.status !== 'Rozwiązane') return false;

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

  return (
    <View style={styles.container}>
      {error && <ErrorMessage message={error} />}
      
      {/* Zakładki w stylu Material Design */}
      <View style={styles.tabsWrapper}>
        <View style={styles.tabsRow}>
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
                  {issues.filter(i => i.status !== 'Rozwiązane').length}
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
      
      <FlatList
        data={filteredIssues}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <IssueCard
            issue={item}
            onPress={() => navigation.navigate('IssueDetails', { id: item.id })}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>Brak usterek do wyświetlenia</Text>
        }
      />

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
  listContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.xl,
    fontSize: 15,
    color: Colors.textSecondary,
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
