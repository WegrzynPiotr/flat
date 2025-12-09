import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { logoutAsync } from '../../store/slices/authSlice';
import { RootState, AppDispatch } from '../../store/store';
import { invitationsAPI } from '../../api/endpoints';
import { InvitationResponse } from '../../types/api';
import { Colors } from '../../styles/colors';
import { Typography } from '../../styles/typography';
import { Spacing } from '../../styles/spacing';
import { capitalizeFullName } from '../../utils/textFormatters';

export default function ProfileScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [pendingInvitations, setPendingInvitations] = useState<InvitationResponse[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  useEffect(() => {
    loadPendingInvitations();
  }, []);

  const loadPendingInvitations = async () => {
    try {
      const response = await invitationsAPI.getPending();
      setPendingInvitations(response.data);
    } catch (error) {
      console.error('Failed to load pending invitations:', error);
    } finally {
      setLoadingInvitations(false);
    }
  };

  const handleRespondToInvitation = async (invitationId: string, accept: boolean) => {
    setRespondingTo(invitationId);
    try {
      await invitationsAPI.respond(invitationId, accept);
      Alert.alert(
        'Sukces',
        accept ? 'Zaproszenie zostało zaakceptowane' : 'Zaproszenie zostało odrzucone'
      );
      await loadPendingInvitations();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Nie udało się odpowiedzieć na zaproszenie';
      Alert.alert('Błąd', typeof errorMessage === 'string' ? errorMessage : 'Błąd');
    } finally {
      setRespondingTo(null);
    }
  };

  const handleLogout = () => {
    console.log('🔴 PROFILE: Logout button clicked');
    
    const confirmed = Platform.OS === 'web' 
      ? window.confirm('Czy na pewno chcesz się wylogować?')
      : true;
    
    if (confirmed) {
      console.log('🔴 PROFILE: User confirmed logout');
      dispatch(logoutAsync())
        .unwrap()
        .then(() => {
          console.log('🔴 PROFILE: Logout successful');
        })
        .catch((error) => {
          console.error('🔴 PROFILE: Logout failed:', error);
        });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={Typography.h2}>Profil</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={Typography.label}>Imię i nazwisko</Text>
        <Text style={styles.infoText}>
          {user?.firstName} {user?.lastName}
        </Text>

        <Text style={[Typography.label, styles.marginTop]}>Email</Text>
        <Text style={styles.infoText}>{user?.email}</Text>

        {user?.phoneNumber && (
          <>
            <Text style={[Typography.label, styles.marginTop]}>Telefon</Text>
            <Text style={styles.infoText}>{user.phoneNumber}</Text>
          </>
        )}
      </View>

      {/* Sekcja oczekujących zaproszeń */}
      <View style={styles.invitationsSection}>
        <View style={styles.invitationsHeader}>
          <Ionicons name="mail" size={24} color={Colors.primary} />
          <Text style={styles.invitationsTitle}>Oczekujące zaproszenia</Text>
          {pendingInvitations.length > 0 && (
            <View style={styles.invitationsBadge}>
              <Text style={styles.invitationsBadgeText}>{pendingInvitations.length}</Text>
            </View>
          )}
        </View>

        {loadingInvitations ? (
          <ActivityIndicator color={Colors.primary} style={styles.loadingIndicator} />
        ) : pendingInvitations.length === 0 ? (
          <View style={styles.emptyInvitations}>
            <Ionicons name="checkmark-circle-outline" size={48} color={Colors.textSecondary} />
            <Text style={styles.emptyInvitationsText}>Brak oczekujących zaproszeń</Text>
          </View>
        ) : (
          pendingInvitations.map((invitation) => (
            <View key={invitation.id} style={styles.invitationCard}>
              <View style={styles.invitationInfo}>
                <Text style={styles.invitationName}>{invitation.inviterName}</Text>
                <Text style={styles.invitationEmail}>{invitation.inviterEmail}</Text>
                <View style={styles.invitationTypeBadge}>
                  <Ionicons 
                    name={invitation.invitationType === 'Najemca' ? 'person' : 'construct'} 
                    size={14} 
                    color={Colors.primary} 
                  />
                  <Text style={styles.invitationTypeText}>
                    Zaproszenie jako {invitation.invitationType.toLowerCase()}
                  </Text>
                </View>
                {invitation.message && (
                  <Text style={styles.invitationMessage}>"{invitation.message}"</Text>
                )}
              </View>
              
              <View style={styles.invitationActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => handleRespondToInvitation(invitation.id, true)}
                  disabled={respondingTo === invitation.id}
                >
                  {respondingTo === invitation.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleRespondToInvitation(invitation.id, false)}
                  disabled={respondingTo === invitation.id}
                >
                  <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Wyloguj się</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.m,
  },
  header: {
    marginBottom: Spacing.l,
  },
  infoCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.l,
    borderRadius: 12,
    marginBottom: Spacing.l,
  },
  infoText: {
    fontSize: 16,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  marginTop: {
    marginTop: Spacing.m,
  },
  invitationsSection: {
    backgroundColor: Colors.surface,
    padding: Spacing.l,
    borderRadius: 12,
    marginBottom: Spacing.l,
  },
  invitationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  invitationsTitle: {
    ...Typography.h3,
    flex: 1,
  },
  invitationsBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  invitationsBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingIndicator: {
    padding: Spacing.xl,
  },
  emptyInvitations: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyInvitationsText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  invitationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.m,
    borderRadius: 12,
    marginBottom: Spacing.sm,
  },
  invitationInfo: {
    flex: 1,
    gap: 4,
  },
  invitationName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  invitationEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  invitationTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  invitationTypeText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  invitationMessage: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  invitationActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: Colors.success,
  },
  rejectButton: {
    backgroundColor: Colors.error,
  },
  logoutButton: {
    backgroundColor: Colors.error,
    paddingVertical: Spacing.m,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
