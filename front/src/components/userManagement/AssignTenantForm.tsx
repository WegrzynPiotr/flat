import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator, TextInput, Modal, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { userManagementAPI, propertiesAPI } from '../../api/endpoints';
import { PropertyResponse, UserManagementResponse } from '../../types/api';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';
import { Typography } from '../../styles/typography';
import { capitalizeFullName } from '../../utils/textFormatters';
import { RootState } from '../../store/store';

interface AssignTenantFormProps {
  onTenantAssigned?: () => void;
  initialPropertyId?: string;
}

export default function AssignTenantForm({ onTenantAssigned, initialPropertyId }: AssignTenantFormProps) {
  const user = useSelector((state: RootState) => state.auth.user);
  const [properties, setProperties] = useState<PropertyResponse[]>([]);
  const [tenants, setTenants] = useState<UserManagementResponse[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>(initialPropertyId || '');
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [initialTenants, setInitialTenants] = useState<string[]>([]); // Oryginalni najemcy nieruchomości
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const filteredTenants = tenants.filter(tenant => 
    `${tenant.firstName} ${tenant.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    loadData();
  }, []);

  // Ustaw początkową nieruchomość gdy jest przekazana
  useEffect(() => {
    if (initialPropertyId && properties.length > 0) {
      setSelectedProperty(initialPropertyId);
    }
  }, [initialPropertyId, properties]);

  // Ładuj aktualnych najemców po wybraniu nieruchomości
  useEffect(() => {
    if (selectedProperty) {
      loadPropertyTenants();
    } else {
      setSelectedTenants([]);
      setInitialTenants([]);
    }
  }, [selectedProperty]);

  const loadData = async () => {
    try {
      console.log('🔵 Loading properties and tenants...');
      const [propsResponse, tenantsResponse] = await Promise.all([
        propertiesAPI.getAll(),
        userManagementAPI.getMyTenants(),
      ]);
      console.log('🔵 Properties:', propsResponse.data);
      console.log('🔵 Tenants:', tenantsResponse.data);
      
      // Filtruj tylko nieruchomości, których użytkownik jest właścicielem
      const ownedProperties = propsResponse.data.filter(
        (prop: PropertyResponse) => prop.ownerId === user?.id
      );
      console.log('🔵 Owned properties:', ownedProperties);
      setProperties(ownedProperties);
      
      // Sortuj alfabetycznie po nazwisku
      const sortedTenants = [...tenantsResponse.data].sort((a, b) => 
        `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'pl')
      );
      setTenants(sortedTenants);
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Błąd', 'Nie udało się załadować danych');
    } finally {
      setLoading(false);
    }
  };

  const loadPropertyTenants = async () => {
    try {
      const response = await propertiesAPI.getById(selectedProperty);
      const property = response.data;
      
      // Filtruj tylko aktywnych najemców (niewygasłych)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const activeTenantIds = property.tenants?.filter(t => {
        if (!t.endDate) return true; // Brak daty końcowej = aktywny
        const endDate = new Date(t.endDate);
        endDate.setHours(23, 59, 59, 999); // Koniec dnia (włącznie)
        return endDate >= today;
      }).map(t => t.tenantId) || [];
      
      console.log('🔵 Active tenants for property:', activeTenantIds);
      setSelectedTenants(activeTenantIds);
      setInitialTenants(activeTenantIds);
      
      // Sortuj listę: zaznaczeni na górze, reszta alfabetycznie
      const sortedTenants = [...tenants].sort((a, b) => {
        const aSelected = activeTenantIds.includes(a.id);
        const bSelected = activeTenantIds.includes(b.id);
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;
        return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'pl');
      });
      setTenants(sortedTenants);
      
      // Ustaw daty z pierwszego aktywnego najemcy (jeśli istnieje)
      const activeTenants = property.tenants?.filter(t => {
        if (!t.endDate) return true;
        const endDate = new Date(t.endDate);
        endDate.setHours(23, 59, 59, 999);
        return endDate >= today;
      }) || [];
      
      if (activeTenants.length > 0) {
        const firstTenant = activeTenants[0];
        if (firstTenant.startDate) {
          setStartDate(new Date(firstTenant.startDate).toISOString().split('T')[0]);
        }
        if (firstTenant.endDate) {
          setEndDate(new Date(firstTenant.endDate).toISOString().split('T')[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load property tenants:', error);
    }
  };

  const handleAssign = async () => {
    if (!selectedProperty) {
      Alert.alert('Błąd', 'Wybierz nieruchomość');
      return;
    }

    if (!startDate) {
      Alert.alert('Błąd', 'Podaj datę rozpoczęcia wynajmu');
      return;
    }

    // Walidacja dat
    if (endDate && new Date(endDate) < new Date(startDate)) {
      Alert.alert('Błąd', 'Data zakończenia nie może być wcześniejsza niż data rozpoczęcia');
      return;
    }

    setSubmitting(true);
    try {
      // Znajdź najemców do dodania i usunięcia
      const tenantsToAdd = selectedTenants.filter(id => !initialTenants.includes(id));
      const tenantsToRemove = initialTenants.filter(id => !selectedTenants.includes(id));

      console.log('🔵 Tenants to add:', tenantsToAdd);
      console.log('🔵 Tenants to remove:', tenantsToRemove);

      // Usuń odznaczonych najemców
      for (const tenantId of tenantsToRemove) {
        await userManagementAPI.removeTenant(selectedProperty, tenantId);
      }

      // Dodaj nowych najemców
      for (const tenantId of tenantsToAdd) {
        const payload = {
          propertyId: selectedProperty,
          tenantId: tenantId,
          startDate: new Date(startDate).toISOString(),
          endDate: endDate ? new Date(endDate).toISOString() : null,
        };
        await userManagementAPI.assignTenant(payload);
      }

      // Aktualizuj daty dla istniejących najemców
      for (const tenantId of selectedTenants.filter(id => initialTenants.includes(id))) {
        const payload = {
          propertyId: selectedProperty,
          tenantId: tenantId,
          startDate: new Date(startDate).toISOString(),
          endDate: endDate ? new Date(endDate).toISOString() : null,
        };
        await userManagementAPI.assignTenant(payload);
      }
      
      const message = tenantsToAdd.length > 0 || tenantsToRemove.length > 0 
        ? `Zaktualizowano najemców (dodano: ${tenantsToAdd.length}, usunięto: ${tenantsToRemove.length})`
        : 'Zaktualizowano daty wynajmu';
      
      Alert.alert('Sukces', message);
      setSelectedProperty('');
      setSelectedTenants([]);
      setInitialTenants([]);
      setSearchQuery('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      await loadData();
      onTenantAssigned?.();
    } catch (error: any) {
      console.error('🔴 Failed to update tenants:', error);
      console.error('🔴 Error response:', error.response?.data);
      Alert.alert('Błąd', error.response?.data?.message || 'Nie udało się zaktualizować najemców');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTenantSelection = (tenantId: string) => {
    setSelectedTenants(prev => 
      prev.includes(tenantId) 
        ? prev.filter(id => id !== tenantId)
        : [...prev, tenantId]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={true}>
      {/* Nagłówek */}
      <View style={styles.header}>
        <View style={styles.iconWrapper}>
          <Ionicons name="link" size={28} color={Colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Przypisz najemców</Text>
          <Text style={styles.subtitle}>
            Dodaj najemców do nieruchomości
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        {/* Wybór nieruchomości */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Ionicons name="home-outline" size={14} color={Colors.textSecondary} /> Nieruchomość
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedProperty}
              onValueChange={setSelectedProperty}
              style={styles.picker}
            >
              <Picker.Item label="Wybierz nieruchomość..." value="" />
              {properties.map((prop) => (
                <Picker.Item key={prop.id} label={prop.address} value={prop.id} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Wyszukiwanie najemców */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Ionicons name="search-outline" size={14} color={Colors.textSecondary} /> Wyszukaj najemców
          </Text>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Wpisz imię, nazwisko lub email..."
              placeholderTextColor={Colors.textSecondary}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Lista najemców */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            <Ionicons name="people-outline" size={14} color={Colors.textSecondary} /> Wybrani najemcy 
            <Text style={styles.countBadge}> ({selectedTenants.length})</Text>
          </Text>
          
          {filteredTenants.length === 0 ? (
            <View style={styles.emptyTenantsContainer}>
              <Ionicons name="person-add-outline" size={40} color={Colors.textSecondary} />
              <Text style={styles.emptyTenantsText}>Brak najemców do wyświetlenia</Text>
              <Text style={styles.emptyTenantsHint}>Najpierw zaproś najemców w zakładce "Dodaj"</Text>
            </View>
          ) : (
            <View style={styles.tenantsScrollView}>
              {filteredTenants.map((tenant) => {
                const isSelected = selectedTenants.includes(tenant.id);
                return (
                  <TouchableOpacity
                    key={tenant.id}
                    style={[styles.tenantSelectItem, isSelected && styles.tenantSelectItemSelected]}
                    onPress={() => toggleTenantSelection(tenant.id)}
                  >
                    <View style={[styles.tenantIcon, isSelected && styles.tenantIconSelected]}>
                      <Ionicons 
                        name="person" 
                        size={18} 
                        color={isSelected ? '#fff' : Colors.primary} 
                      />
                    </View>
                    <View style={styles.tenantSelectInfo}>
                      <Text style={[styles.tenantSelectName, isSelected && styles.tenantSelectNameSelected]}>
                        {capitalizeFullName(tenant.firstName, tenant.lastName)}
                      </Text>
                      <Text style={styles.tenantSelectEmail}>{tenant.email}</Text>
                    </View>
                    <Ionicons 
                      name={isSelected ? "checkbox" : "square-outline"} 
                      size={24} 
                      color={isSelected ? Colors.primary : Colors.textSecondary} 
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Daty */}
        <View style={styles.datesRow}>
          <View style={styles.dateColumn}>
            <Text style={styles.label}>
              <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} /> Od
            </Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowStartCalendar(true)}
            >
              <Ionicons name="calendar" size={18} color={Colors.primary} />
              <Text style={styles.dateInputText}>{startDate || 'Wybierz'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dateColumn}>
            <Text style={styles.label}>
              <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} /> Do (opcjonalnie)
            </Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowEndCalendar(true)}
            >
              <Ionicons name="calendar" size={18} color={Colors.primary} />
              <Text style={[styles.dateInputText, !endDate && styles.dateInputPlaceholder]}>
                {endDate || 'Bezterminowo'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {endDate && (
          <TouchableOpacity 
            style={styles.clearDateButton}
            onPress={() => setEndDate('')}
          >
            <Ionicons name="close-circle" size={16} color={Colors.error} />
            <Text style={styles.clearDateText}>Wyczyść datę zakończenia</Text>
          </TouchableOpacity>
        )}

        {/* Przycisk */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleAssign}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>
                Zaktualizuj przypisanie ({selectedTenants.length})
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Kalendarz dla daty rozpoczęcia */}
      <Modal
        visible={showStartCalendar}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStartCalendar(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.calendarModal}>
            <View style={styles.calendarHeader}>
              <Text style={Typography.h3}>Data rozpoczęcia wynajmu</Text>
              <TouchableOpacity onPress={() => setShowStartCalendar(false)}>
                <Ionicons name="close" size={28} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <Calendar
              onDayPress={(day) => {
                setStartDate(day.dateString);
                setShowStartCalendar(false);
              }}
              markedDates={{
                [startDate]: { selected: true, selectedColor: Colors.primary }
              }}
              theme={{
                selectedDayBackgroundColor: Colors.primary,
                todayTextColor: Colors.primary,
                arrowColor: Colors.primary,
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Kalendarz dla daty zakończenia */}
      <Modal
        visible={showEndCalendar}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEndCalendar(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.calendarModal}>
            <View style={styles.calendarHeader}>
              <Text style={Typography.h3}>Data zakończenia wynajmu</Text>
              <TouchableOpacity onPress={() => setShowEndCalendar(false)}>
                <Ionicons name="close" size={28} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <Calendar
              onDayPress={(day) => {
                setEndDate(day.dateString);
                setShowEndCalendar(false);
              }}
              markedDates={{
                [endDate]: { selected: true, selectedColor: Colors.primary }
              }}
              minDate={startDate}
              theme={{
                selectedDayBackgroundColor: Colors.primary,
                todayTextColor: Colors.primary,
                arrowColor: Colors.primary,
              }}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.l,
    gap: Spacing.m,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  form: {
    gap: Spacing.xs,
  },
  inputGroup: {
    marginBottom: Spacing.m,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  countBadge: {
    color: Colors.primary,
    fontWeight: '700',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: Spacing.xs,
  },
  tenantsScrollView: {
    maxHeight: 280,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
  },
  emptyTenantsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  emptyTenantsText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: Spacing.s,
  },
  emptyTenantsHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  tenantSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.m,
  },
  tenantSelectItemSelected: {
    backgroundColor: Colors.primary + '10',
  },
  tenantIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tenantIconSelected: {
    backgroundColor: Colors.primary,
  },
  tenantSelectInfo: {
    flex: 1,
  },
  tenantSelectName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  tenantSelectNameSelected: {
    color: Colors.primary,
  },
  tenantSelectEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  datesRow: {
    flexDirection: 'row',
    gap: Spacing.m,
    marginBottom: Spacing.s,
  },
  dateColumn: {
    flex: 1,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    padding: Spacing.m,
  },
  dateInputText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  dateInputPlaceholder: {
    color: Colors.textSecondary,
  },
  clearDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    marginBottom: Spacing.m,
  },
  clearDateText: {
    fontSize: 13,
    color: Colors.error,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    padding: Spacing.m,
    fontSize: 16,
    color: Colors.text,
  },
  hint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  calendarModal: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.l,
    width: '90%',
    maxWidth: 400,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.m,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: Spacing.m,
    borderRadius: 12,
    gap: Spacing.s,
    marginTop: Spacing.l,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  tenantsSection: {
    marginTop: Spacing.xl,
  },
  tenantCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.m,
    borderRadius: 12,
    marginTop: Spacing.s,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: Spacing.m,
  },
});
