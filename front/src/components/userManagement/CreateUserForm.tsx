import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { userManagementAPI } from '../../api/endpoints';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';
import { Typography } from '../../styles/typography';

export default function CreateUserForm() {
  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    role: 'Najemca' as 'Najemca' | 'Serwisant',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    console.log('🔵 Current user role:', userRole);
    
    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      Alert.alert('Błąd', 'Wypełnij wszystkie wymagane pola');
      return;
    }

    console.log('🔵 Creating user with data:', formData);
    setLoading(true);
    try {
      console.log('🔵 Sending request to API...');
      const response = await userManagementAPI.createUser({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
      });
      
      console.log('🟢 User created successfully:', response.data);
      Alert.alert('Sukces', 'Użytkownik został utworzony');
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        role: 'Najemca',
      });
    } catch (error: any) {
      console.error('🔴 Failed to create user:', error);
      console.error('🔴 Error response:', error.response?.data);
      Alert.alert('Błąd', error.response?.data?.message || 'Nie udało się utworzyć użytkownika');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={Typography.h2}>Utwórz nowego użytkownika</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="email@example.com"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Hasło *</Text>
          <TextInput
            style={styles.input}
            placeholder="Minimum 6 znaków"
            value={formData.password}
            onChangeText={(text) => setFormData({ ...formData, password: text })}
            secureTextEntry
          />

          <Text style={styles.label}>Imię *</Text>
          <TextInput
            style={styles.input}
            placeholder="Jan"
            value={formData.firstName}
            onChangeText={(text) => setFormData({ ...formData, firstName: text })}
          />

          <Text style={styles.label}>Nazwisko *</Text>
          <TextInput
            style={styles.input}
            placeholder="Kowalski"
            value={formData.lastName}
            onChangeText={(text) => setFormData({ ...formData, lastName: text })}
          />

          <Text style={styles.label}>Telefon</Text>
          <TextInput
            style={styles.input}
            placeholder="+48 123 456 789"
            value={formData.phoneNumber}
            onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Rola *</Text>
          <View style={styles.roleButtons}>
            <TouchableOpacity
              style={[styles.roleButton, formData.role === 'Najemca' && styles.roleButtonActive]}
              onPress={() => setFormData({ ...formData, role: 'Najemca' })}
            >
              <Text style={[styles.roleButtonText, formData.role === 'Najemca' && styles.roleButtonTextActive]}>
                Najemca
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, formData.role === 'Serwisant' && styles.roleButtonActive]}
              onPress={() => setFormData({ ...formData, role: 'Serwisant' })}
            >
              <Text style={[styles.roleButtonText, formData.role === 'Serwisant' && styles.roleButtonTextActive]}>
                Serwisant
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Tworzenie...' : 'Utwórz użytkownika'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.m,
  },
  form: {
    marginTop: Spacing.l,
  },
  label: {
    ...Typography.bodyBold,
    marginBottom: Spacing.s,
    marginTop: Spacing.m,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.m,
    backgroundColor: Colors.surface,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: Spacing.m,
  },
  roleButton: {
    flex: 1,
    padding: Spacing.m,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  roleButtonText: {
    color: Colors.text,
  },
  roleButtonTextActive: {
    color: Colors.white,
    fontWeight: 'bold',
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
});

