import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator, TextInput, Modal, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { userManagementAPI, propertiesAPI } from '../../api/endpoints';
import { PropertyResponse, UserManagementResponse } from '../../types/api';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';
import { Typography } from '../../styles/typography';
import { capitalizeFullName } from '../../utils/textFormatters';

interface AssignTenantFormProps {
  onTenantAssigned?: () => void;
}

export default function AssignTenantForm({ onTenantAssigned }: AssignTenantFormProps) {
  const [properties, setProperties] = useState<PropertyResponse[]>([]);
  const [tenants, setTenants] = useState<UserManagementResponse[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
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
      setProperties(propsResponse.data);
      
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
      const currentTenantIds = property.tenants?.map(t => t.tenantId) || [];
      console.log('🔵 Current tenants for property:', currentTenantIds);
      setSelectedTenants(currentTenantIds);
      setInitialTenants(currentTenantIds);
      
      // Sortuj listę: zaznaczeni na górze, reszta alfabetycznie
      const sortedTenants = [...tenants].sort((a, b) => {
        const aSelected = currentTenantIds.includes(a.id);
        const bSelected = currentTenantIds.includes(b.id);
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;
        return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'pl');
      });
      setTenants(sortedTenants);
      
      // Ustaw daty z pierwszego najemcy (jeśli istnieje)
      if (property.tenants && property.tenants.length > 0) {
        const firstTenant = property.tenants[0];
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
      <Text style={Typography.h2}>Przypisz najemców</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Nieruchomość</Text>
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

        <Text style={styles.label}>Wyszukaj najemców</Text>
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

        <Text style={styles.label}>
          Wybrani najemcy ({selectedTenants.length})
        </Text>
        <ScrollView style={styles.tenantsScrollView}>
          {filteredTenants.map((tenant) => {
            const isSelected = selectedTenants.includes(tenant.id);
            return (
              <TouchableOpacity
                key={tenant.id}
                style={[styles.tenantSelectItem, isSelected && styles.tenantSelectItemSelected]}
                onPress={() => toggleTenantSelection(tenant.id)}
              >
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
        </ScrollView>

        <Text style={styles.label}>Data rozpoczęcia wynajmu</Text>
        <TouchableOpacity
          style={styles.dateInput}
          onPress={() => setShowStartCalendar(true)}
        >
          <Ionicons name="calendar" size={20} color={Colors.primary} />
          <Text style={styles.dateInputText}>{startDate || 'Wybierz datę'}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Data zakończenia wynajmu (opcjonalnie)</Text>
        <TouchableOpacity
          style={styles.dateInput}
          onPress={() => setShowEndCalendar(true)}
        >
          <Ionicons name="calendar" size={20} color={Colors.primary} />
          <Text style={styles.dateInputText}>{endDate || 'Wybierz datę (opcjonalnie)'}</Text>
        </TouchableOpacity>
        {endDate && (
          <TouchableOpacity 
            style={styles.clearDateButton}
            onPress={() => setEndDate('')}
          >
            <Text style={styles.clearDateText}>Wyczyść datę zakończenia</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.hint}>Pozostaw puste dla umowy bezterminowej</Text>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleAssign}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Aktualizuję...' : `Zaktualizuj (${selectedTenants.length})`}
          </Text>
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
  form: {
    marginTop: Spacing.l,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.s,
    marginTop: Spacing.m,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: Colors.surface,
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
    borderRadius: 8,
    backgroundColor: Colors.surface,
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
    maxHeight: 300,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  tenantSelectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tenantSelectItemSelected: {
    backgroundColor: Colors.primary + '15',
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
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.m,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    padding: Spacing.m,
  },
  dateInputText: {
    fontSize: 16,
    color: Colors.text,
  },
  clearDateButton: {
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  clearDateText: {
    fontSize: 13,
    color: Colors.error,
    textDecorationLine: 'underline',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: Colors.surface,
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
    borderRadius: 12,
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
    backgroundColor: Colors.primary,
    padding: Spacing.m,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.textSecondary,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  tenantsSection: {
    marginTop: Spacing.xl,
  },
  tenantCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.m,
    borderRadius: 8,
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
