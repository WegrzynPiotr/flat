import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { userManagementAPI, issuesAPI } from '../../api/endpoints';
import { IssueResponse, UserManagementResponse } from '../../types/api';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';
import { Typography } from '../../styles/typography';

interface AssignServicemanFormProps {
  issueId: string;
  onAssigned: () => void;
}

export default function AssignServicemanForm({ issueId, onAssigned }: AssignServicemanFormProps) {
  const [servicemen, setServicemen] = useState<UserManagementResponse[]>([]);
  const [selectedServiceman, setSelectedServiceman] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadServicemen();
  }, []);

  const loadServicemen = async () => {
    try {
      const response = await userManagementAPI.getMyServicemen();
      setServicemen(response.data);
    } catch (error) {
      console.error('Failed to load servicemen:', error);
      Alert.alert('Błąd', 'Nie udało się załadować serwisantów');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedServiceman) {
      Alert.alert('Błąd', 'Wybierz serwisanta');
      return;
    }

    setSubmitting(true);
    try {
      await userManagementAPI.assignServiceman({
        issueId,
        servicemanId: selectedServiceman,
      });
      
      Alert.alert('Sukces', 'Serwisant został przypisany do zgłoszenia');
      onAssigned();
    } catch (error: any) {
      console.error('Failed to assign serviceman:', error);
      Alert.alert('Błąd', error.response?.data?.message || 'Nie udało się przypisać serwisanta');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  if (servicemen.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Brak dostępnych serwisantów</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={Typography.h3}>Przypisz serwisanta</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Serwisant</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedServiceman}
            onValueChange={setSelectedServiceman}
            style={styles.picker}
          >
            <Picker.Item label="Wybierz serwisanta..." value="" />
            {servicemen.map((serviceman) => (
              <Picker.Item
                key={serviceman.userId}
                label={`${serviceman.firstName} ${serviceman.lastName}${serviceman.phoneNumber ? ` (${serviceman.phoneNumber})` : ''}`}
                value={serviceman.userId}
              />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    padding: Spacing.m,
    borderRadius: 8,
    marginTop: Spacing.m,
  },
  centerContainer: {
    padding: Spacing.m,
    alignItems: 'center',
  },
  form: {
    marginTop: Spacing.m,
  },
  label: {
    ...Typography.bodyBold,
    marginBottom: Spacing.s,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  picker: {
    height: 50,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.m,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: Spacing.m,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.textSecondary,
  },
  submitButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
  },
});
