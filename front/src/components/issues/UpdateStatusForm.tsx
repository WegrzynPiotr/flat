import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { issuesAPI } from '../../api/endpoints';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';
import { Typography } from '../../styles/typography';

interface UpdateStatusFormProps {
  issueId: string;
  currentStatus: string;
  onStatusUpdated: () => void;
}

const STATUS_OPTIONS = [
  { label: 'Nowe', value: 'Nowe' },
  { label: 'W trakcie', value: 'W trakcie' },
  { label: 'Oczekuje na części', value: 'Oczekuje na części' },
  { label: 'Rozwiązane', value: 'Rozwiązane' },
];

export default function UpdateStatusForm({ issueId, currentStatus, onStatusUpdated }: UpdateStatusFormProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>(currentStatus);
  const [submitting, setSubmitting] = useState(false);

  const handleUpdateStatus = async () => {
    if (selectedStatus === currentStatus) {
      Alert.alert('Info', 'Status nie został zmieniony');
      return;
    }

    setSubmitting(true);
    try {
      await issuesAPI.updateStatus(issueId, selectedStatus);
      Alert.alert('Sukces', 'Status został zaktualizowany');
      onStatusUpdated();
    } catch (error: any) {
      console.error('Failed to update status:', error);
      Alert.alert('Błąd', error.response?.data?.message || 'Nie udało się zaktualizować statusu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={Typography.h3}>Aktualizuj status</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Status</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedStatus}
            onValueChange={setSelectedStatus}
            style={styles.picker}
          >
            {STATUS_OPTIONS.map((option) => (
              <Picker.Item key={option.value} label={option.label} value={option.value} />
            ))}
          </Picker>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleUpdateStatus}
          disabled={submitting || selectedStatus === currentStatus}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Aktualizuję...' : 'Zaktualizuj status'}
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
});
