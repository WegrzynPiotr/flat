import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { userManagementAPI } from '../../api/endpoints';
import { UserManagementResponse } from '../../types/api';
import { capitalizeFullName } from '../../utils/textFormatters';
import CreateUserForm from '../../components/userManagement/CreateUserForm';
import AssignTenantForm from '../../components/userManagement/AssignTenantForm';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';
import { Typography } from '../../styles/typography';

type TabType = 'tenants' | 'servicemen' | 'assign' | 'create';

export default function ManagementScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<TabType>('tenants');
  const [tenants, setTenants] = useState<UserManagementResponse[]>([]);
  const [servicemen, setServicemen] = useState<UserManagementResponse[]>([]);
  const [loading, setLoading] = useState(false);

  // Załaduj obie listy przy montowaniu komponentu
  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (activeTab === 'tenants' || activeTab === 'servicemen') {
      loadData();
    }
  }, [activeTab]);

  const loadAllData = async () => {
    try {
      const [tenantsRes, servicemenRes] = await Promise.all([
        userManagementAPI.getMyTenants(),
        userManagementAPI.getMyServicemen()
      ]);
      setTenants(tenantsRes.data);
      setServicemen(servicemenRes.data);
    } catch (error) {
      console.error('Failed to load all data:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'tenants') {
        const response = await userManagementAPI.getMyTenants();
        setTenants(response.data);
      } else if (activeTab === 'servicemen') {
        const response = await userManagementAPI.getMyServicemen();
        setServicemen(response.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserCreated = async () => {
    // Odśwież obie listy
    try {
      const [tenantsRes, servicemenRes] = await Promise.all([
        userManagementAPI.getMyTenants(),
        userManagementAPI.getMyServicemen()
      ]);
      setTenants(tenantsRes.data);
      setServicemen(servicemenRes.data);
    } catch (error) {
      console.error('Failed to refresh lists:', error);
    }
  };

  const handleTenantAssigned = async () => {
    // Odśwież obie listy
    try {
      const [tenantsRes, servicemenRes] = await Promise.all([
        userManagementAPI.getMyTenants(),
        userManagementAPI.getMyServicemen()
      ]);
      setTenants(tenantsRes.data);
      setServicemen(servicemenRes.data);
    } catch (error) {
      console.error('Failed to refresh lists:', error);
    }
  };

  const renderUserCard = ({ item }: { item: UserManagementResponse }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name={activeTab === 'tenants' ? 'person' : 'construct'} 
            size={24} 
            color={Colors.primary} 
          />
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{capitalizeFullName(item.firstName, item.lastName)}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          {activeTab === 'tenants' && item.properties && item.properties.length > 0 && (
            <View style={styles.propertiesContainer}>
              {item.properties.map((address, index) => (
                <View key={index} style={styles.propertyItem}>
                  <Ionicons name="home" size={14} color={Colors.primary} />
                  <Text style={styles.propertyAddress}>{address}</Text>
                </View>
              ))}
            </View>
          )}
          {activeTab === 'tenants' && (!item.properties || item.properties.length === 0) && (
            <Text style={styles.noProperties}>Nie przypisano do żadnej nieruchomości</Text>
          )}
        </View>
      </View>
    </View>
  );

  const renderContent = () => {
    if (activeTab === 'tenants' || activeTab === 'servicemen') {
      const currentData = activeTab === 'tenants' ? tenants : servicemen;

      if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      );
    }

    return (
      <FlatList
        data={currentData}
        keyExtractor={(item) => item.id}
        renderItem={renderUserCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons 
              name={activeTab === 'tenants' ? 'people-outline' : 'construct-outline'} 
              size={64} 
              color={Colors.textSecondary} 
            />
            <Text style={styles.emptyText}>
              {activeTab === 'tenants' ? 'Brak najemców' : 'Brak serwisantów'}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'tenants' 
                ? 'Utwórz konto najemcy i przypisz do mieszkania' 
                : 'Utwórz konto serwisanta'}
            </Text>
          </View>
        }
      />
    );
    }

    if (activeTab === 'assign') {
      return (
        <View style={styles.formContainer}>
          <AssignTenantForm onTenantAssigned={handleTenantAssigned} />
        </View>
      );
    }

    if (activeTab === 'create') {
      return (
        <View style={styles.formContainer}>
          <CreateUserForm onUserCreated={handleUserCreated} />
        </View>
      );
    }
  };

  const currentData = activeTab === 'tenants' ? tenants : servicemen;

  return (
    <View style={styles.container}>
      {/* Zakładki */}
      <View style={styles.tabsWrapper}>
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('tenants')}
            activeOpacity={0.7}
          >
            <View style={styles.tabContent}>
              <Ionicons 
                name="people-outline" 
                size={18} 
                color={activeTab === 'tenants' ? Colors.primary : Colors.textSecondary} 
              />
              <Text style={[styles.tabButtonText, activeTab === 'tenants' && styles.tabButtonTextActive]}>
                Najemcy
              </Text>
              <View style={[styles.tabBadge, activeTab === 'tenants' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'tenants' && styles.tabBadgeTextActive]}>
                  {tenants.length}
                </Text>
              </View>
            </View>
            {activeTab === 'tenants' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('servicemen')}
            activeOpacity={0.7}
          >
            <View style={styles.tabContent}>
              <Ionicons 
                name="construct-outline" 
                size={18} 
                color={activeTab === 'servicemen' ? Colors.primary : Colors.textSecondary} 
              />
              <Text style={[styles.tabButtonText, activeTab === 'servicemen' && styles.tabButtonTextActive]}>
                Serwisanci
              </Text>
              <View style={[styles.tabBadge, activeTab === 'servicemen' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'servicemen' && styles.tabBadgeTextActive]}>
                  {servicemen.length}
                </Text>
              </View>
            </View>
            {activeTab === 'servicemen' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('assign')}
            activeOpacity={0.7}
          >
            <View style={styles.tabContent}>
              <Ionicons 
                name="link-outline" 
                size={18} 
                color={activeTab === 'assign' ? Colors.primary : Colors.textSecondary} 
              />
              <Text style={[styles.tabButtonText, activeTab === 'assign' && styles.tabButtonTextActive]}>
                Przypisz
              </Text>
            </View>
            {activeTab === 'assign' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => setActiveTab('create')}
            activeOpacity={0.7}
          >
            <View style={styles.tabContent}>
              <Ionicons 
                name="person-add-outline" 
                size={18} 
                color={activeTab === 'create' ? Colors.primary : Colors.textSecondary} 
              />
              <Text style={[styles.tabButtonText, activeTab === 'create' && styles.tabButtonTextActive]}>
                Utwórz
              </Text>
            </View>
            {activeTab === 'create' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Zawartość */}
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabsWrapper: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
  },
  tabButton: {
    flex: 1,
    position: 'relative',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.2,
  },
  tabButtonTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: '#E8E8E8',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: Colors.primary + '20',
  },
  tabBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  tabBadgeTextActive: {
    color: Colors.primary,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  formContainer: {
    padding: Spacing.md,
    backgroundColor: '#fff',
    margin: Spacing.md,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: Spacing.m,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: Spacing.m,
    marginBottom: Spacing.m,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
    gap: 6,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  propertiesContainer: {
    gap: 6,
    marginTop: 4,
  },
  propertyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  propertyAddress: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  noProperties: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
