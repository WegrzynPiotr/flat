import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { userManagementAPI, propertiesAPI } from '../../api/endpoints';
import { PropertyResponse, UserManagementResponse } from '../../types/api';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';
import { Typography } from '../../styles/typography';

export default function AssignTenantForm() {
  const [properties, setProperties] = useState<PropertyResponse[]>([]);
  const [tenants, setTenants] = useState<UserManagementResponse[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [propsResponse, tenantsResponse] = await Promise.all([
        propertiesAPI.getAll(),
        userManagementAPI.getMyTenants(),
      ]);
      setProperties(propsResponse.data);
      setTenants(tenantsResponse.data);
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Błąd', 'Nie udało się załadować danych');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedProperty || !selectedTenant) {
      Alert.alert('Błąd', 'Wybierz nieruchomość i najemcę');
      return;
    }

    setSubmitting(true);
    try {
      await userManagementAPI.assignTenant({
        propertyId: selectedProperty,
        tenantId: selectedTenant,
        startDate,
      });
      
      Alert.alert('Sukces', 'Najemca został przypisany do nieruchomości');
      setSelectedProperty('');
      setSelectedTenant('');
      await loadData();
    } catch (error: any) {
      console.error('Failed to assign tenant:', error);
      Alert.alert('Błąd', error.response?.data?.message || 'Nie udało się przypisać najemcy');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={Typography.h2}>Przypisz najemcę</Text>

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

        <Text style={styles.label}>Najemca</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedTenant}
            onValueChange={setSelectedTenant}
            style={styles.picker}
          >
            <Picker.Item label="Wybierz najemcę..." value="" />
            {tenants.map((tenant) => (
              <Picker.Item key={tenant.userId} label={`${tenant.firstName} ${tenant.lastName}`} value={tenant.userId} />
            ))}
          </Picker>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleAssign}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Przypisuję...' : 'Przypisz'}
          </Text>
        </TouchableOpacity>
      </View>

      {selectedProperty && (
        <View style={styles.tenantsSection}>
          <Text style={Typography.h3}>Obecni najemcy</Text>
          <FlatList
            data={properties.find(p => p.id === selectedProperty)?.tenants || []}
            renderItem={({ item }) => (
              <View style={styles.tenantCard}>
                <Text style={Typography.bodyBold}>{item.name}</Text>
                <Text style={styles.dateText}>
                  Od: {new Date(item.startDate).toLocaleDateString('pl-PL')}
                  {item.endDate && ` Do: ${new Date(item.endDate).toLocaleDateString('pl-PL')}`}
                </Text>
              </View>
            )}
            keyExtractor={(item) => item.tenantId}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Brak najemców</Text>
            }
          />
        </View>
      )}
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
  form: {
    marginTop: Spacing.l,
  },
  label: {
    ...Typography.bodyBold,
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
    color: Colors.white,
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
