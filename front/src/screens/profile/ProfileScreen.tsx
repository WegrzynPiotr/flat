import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { RootState } from '../../store/store';
import { Colors } from '../../styles/colors';
import { Typography } from '../../styles/typography';
import { Spacing } from '../../styles/spacing';

export default function ProfileScreen() {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const handleLogout = () => {
    Alert.alert(
      'Wylogowanie',
      'Czy na pewno chcesz się wylogować?',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Wyloguj',
          style: 'destructive',
          onPress: () => dispatch(logout()),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
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

        <Text style={[Typography.label, styles.marginTop]}>Rola</Text>
        <Text style={styles.infoText}>{user?.role}</Text>

        {user?.phoneNumber && (
          <>
            <Text style={[Typography.label, styles.marginTop]}>Telefon</Text>
            <Text style={styles.infoText}>{user.phoneNumber}</Text>
          </>
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Wyloguj się</Text>
      </TouchableOpacity>
    </View>
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
  logoutButton: {
    backgroundColor: Colors.error,
    paddingVertical: Spacing.m,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
