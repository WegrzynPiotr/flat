import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { invitationsAPI } from '../../api/endpoints';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';
import { Typography } from '../../styles/typography';

interface InviteUserFormProps {
  onInvitationSent: () => void;
}

export default function InviteUserForm({ onInvitationSent }: InviteUserFormProps) {
  const [email, setEmail] = useState('');
  const [invitationType, setInvitationType] = useState<'Najemca' | 'Serwisant'>('Najemca');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendInvitation = async () => {
    if (!email.trim()) {
      setError('Wprowadź adres email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Nieprawidłowy format adresu email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await invitationsAPI.send({
        email: email.trim(),
        invitationType,
        message: message.trim() || undefined,
      });

      Alert.alert(
        'Sukces',
        `Zaproszenie zostało wysłane do ${email}`,
        [{ text: 'OK' }]
      );

      // Reset form
      setEmail('');
      setMessage('');
      onInvitationSent();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data || 'Nie udało się wysłać zaproszenia';
      setError(typeof errorMessage === 'string' ? errorMessage : 'Nie udało się wysłać zaproszenia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconWrapper}>
          <Ionicons name="person-add" size={28} color={Colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Zaproś użytkownika</Text>
          <Text style={styles.subtitle}>
            Wyślij zaproszenie do współpracy
          </Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          <Ionicons name="mail-outline" size={14} color={Colors.textSecondary} /> Email użytkownika
        </Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="np. jan.kowalski@email.com"
          placeholderTextColor={Colors.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          <Ionicons name="briefcase-outline" size={14} color={Colors.textSecondary} /> Rola
        </Text>
        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[
              styles.roleButton,
              invitationType === 'Najemca' && styles.roleButtonActive,
            ]}
            onPress={() => setInvitationType('Najemca')}
          >
            <View style={[styles.roleIcon, invitationType === 'Najemca' && styles.roleIconActive]}>
              <Ionicons
                name="person"
                size={20}
                color={invitationType === 'Najemca' ? '#fff' : Colors.primary}
              />
            </View>
            <View style={styles.roleInfo}>
              <Text
                style={[
                  styles.roleButtonText,
                  invitationType === 'Najemca' && styles.roleButtonTextActive,
                ]}
              >
                Najemca
              </Text>
              <Text style={[styles.roleDescription, invitationType === 'Najemca' && styles.roleDescriptionActive]}>
                Wynajmujący mieszkanie
              </Text>
            </View>
            {invitationType === 'Najemca' && (
              <Ionicons name="checkmark-circle" size={24} color="#fff" style={styles.checkIcon} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleButton,
              invitationType === 'Serwisant' && styles.roleButtonActive,
            ]}
            onPress={() => setInvitationType('Serwisant')}
          >
            <View style={[styles.roleIcon, invitationType === 'Serwisant' && styles.roleIconActive]}>
              <Ionicons
                name="construct"
                size={20}
                color={invitationType === 'Serwisant' ? '#fff' : Colors.primary}
              />
            </View>
            <View style={styles.roleInfo}>
              <Text
                style={[
                  styles.roleButtonText,
                  invitationType === 'Serwisant' && styles.roleButtonTextActive,
                ]}
              >
                Serwisant
              </Text>
              <Text style={[styles.roleDescription, invitationType === 'Serwisant' && styles.roleDescriptionActive]}>
                Naprawy i konserwacja
              </Text>
            </View>
            {invitationType === 'Serwisant' && (
              <Ionicons name="checkmark-circle" size={24} color="#fff" style={styles.checkIcon} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          <Ionicons name="chatbubble-outline" size={14} color={Colors.textSecondary} /> Wiadomość (opcjonalna)
        </Text>
        <TextInput
          style={[styles.input, styles.messageInput]}
          value={message}
          onChangeText={setMessage}
          placeholder="Dodaj wiadomość do zaproszenia..."
          placeholderTextColor={Colors.textSecondary}
          multiline
          numberOfLines={3}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSendInvitation}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="send" size={20} color="#fff" />
            <Text style={styles.submitButtonText}>Wyślij zaproszenie</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.m,
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '15',
    padding: Spacing.s,
    borderRadius: 12,
    marginBottom: Spacing.m,
    gap: Spacing.xs,
  },
  errorText: {
    color: Colors.error,
    flex: 1,
    fontSize: 14,
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
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.m,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
  },
  messageInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: Spacing.m,
  },
  roleContainer: {
    gap: Spacing.s,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.m,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: '#FAFAFA',
    gap: Spacing.m,
  },
  roleButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  roleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleIconActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  roleInfo: {
    flex: 1,
  },
  roleButtonText: {
    color: Colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  roleDescription: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  roleDescriptionActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    padding: Spacing.m,
    borderRadius: 12,
    gap: Spacing.s,
    marginTop: Spacing.m,
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
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
