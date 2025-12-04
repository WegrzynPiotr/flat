import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import CreateUserForm from '../../components/userManagement/CreateUserForm';
import AssignTenantForm from '../../components/userManagement/AssignTenantForm';
import { userManagementAPI } from '../../api/endpoints';
import { UserManagementResponse } from '../../types/api';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';
import { Typography } from '../../styles/typography';
import { useFocusEffect } from '@react-navigation/native';

export default function UserManagementScreen() {
  const [activeTab, setActiveTab] = useState<'create' | 'assign' | 'list'>('create');
  const [tenants, setTenants] = useState<UserManagementResponse[]>([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (activeTab === 'list') {
        loadTenants();
      }
    }, [activeTab])
  );

  const loadTenants = async () => {
    setLoading(true);
    try {
      const response = await userManagementAPI.getMyTenants();
      console.log('🔵 Loaded tenants:', response.data);
      setTenants(response.data);
    } catch (error) {
      console.error('🔴 Failed to load tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (activeTab === 'create') return <CreateUserForm onUserCreated={() => setActiveTab('list')} />;
    if (activeTab === 'assign') return <AssignTenantForm onTenantAssigned={() => {
      loadTenants();
    }} />;
    
    return (
      <View style={styles.listContainer}>
        <Text style={Typography.h2}>Moi najemcy</Text>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
        ) : (
          <FlatList
            data={tenants}
            renderItem={({ item }) => (
              <View style={styles.tenantCard}>
                <Text style={Typography.bodyBold}>{item.firstName} {item.lastName}</Text>
                <Text style={styles.tenantEmail}>{item.email}</Text>
                <Text style={styles.tenantRole}>Rola: {item.role}</Text>
              </View>
            )}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                Nie masz jeszcze najemców. Przejdź do zakładki "Utwórz użytkownika" aby dodać pierwszego najemcę.
              </Text>
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'create' && styles.tabActive]}
          onPress={() => setActiveTab('create')}
        >
          <Text style={[styles.tabText, activeTab === 'create' && styles.tabTextActive]}>
            Utwórz
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'list' && styles.tabActive]}
          onPress={() => setActiveTab('list')}
        >
          <Text style={[styles.tabText, activeTab === 'list' && styles.tabTextActive]}>
            Lista
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'assign' && styles.tabActive]}
          onPress={() => setActiveTab('assign')}
        >
          <Text style={[styles.tabText, activeTab === 'assign' && styles.tabTextActive]}>
            Przypisz
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {renderContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    padding: Spacing.m,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: Spacing.m,
  },
  listContent: {
    paddingTop: Spacing.l,
  },
  loader: {
    marginTop: Spacing.xl,
  },
  tenantCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.m,
    borderRadius: 8,
    marginBottom: Spacing.m,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tenantEmail: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  tenantRole: {
    color: Colors.primary,
    marginTop: Spacing.xs,
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.l,
  },
});
