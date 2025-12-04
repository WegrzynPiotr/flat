import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Modal, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProperties } from '../../store/slices/propertiesSlice';
import { AppDispatch, RootState } from '../../store/store';
import { propertiesAPI } from '../../api/endpoints';
import Loading from '../../components/common/Loading';
import { Colors } from '../../styles/colors';
import { Typography } from '../../styles/typography';
import { Spacing } from '../../styles/spacing';

export default function PropertiesScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { properties, loading } = useSelector((state: RootState) => state.properties);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    address: '',
    city: '',
    postalCode: '',
    roomsCount: '',
    area: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchProperties());
  }, [dispatch]);

  const handleAddProperty = async () => {
    if (!formData.address || !formData.city || !formData.postalCode) {
      Alert.alert('Błąd', 'Wypełnij wszystkie wymagane pola');
      return;
    }

    console.log('🔵 Adding property:', formData);
    setSubmitting(true);
    try {
      const response = await propertiesAPI.create({
        address: formData.address,
        city: formData.city,
        postalCode: formData.postalCode,
        roomsCount: parseInt(formData.roomsCount) || 0,
        area: parseFloat(formData.area) || 0,
      });
      
      console.log('🟢 Property created:', response.data);
      
      Alert.alert('Sukces', 'Mieszkanie zostało dodane');
      setModalVisible(false);
      setFormData({ address: '', city: '', postalCode: '', roomsCount: '', area: '' });
      
      console.log('🔵 Refreshing properties list...');
      await dispatch(fetchProperties());
      console.log('🟢 Properties refreshed');
    } catch (error: any) {
      console.error('🔴 Failed to add property:', error);
      console.error('🔴 Error response:', error.response?.data);
      Alert.alert('Błąd', error.response?.data?.message || 'Nie udało się dodać mieszkania');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && properties.length === 0) {
    return <Loading />;
  }

  const renderProperty = ({ item }: any) => (
    <View style={styles.card}>
      <Text style={Typography.h3}>{item.address}</Text>
      <Text style={styles.city}>{item.city}, {item.postalCode}</Text>
      <View style={styles.details}>
        <Text style={styles.detailText}>Pokoje: {item.roomsCount}</Text>
        <Text style={styles.detailText}>Powierzchnia: {item.area} m²</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={Typography.h2}>Moje mieszkania</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={properties}
        keyExtractor={(item) => item.id}
        renderItem={renderProperty}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Brak mieszkań do wyświetlenia</Text>
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={Typography.h2}>Dodaj mieszkanie</Text>

              <Text style={styles.label}>Adres *</Text>
              <TextInput
                style={styles.input}
                placeholder="ul. Przykładowa 1/23"
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
              />

              <Text style={styles.label}>Miasto *</Text>
              <TextInput
                style={styles.input}
                placeholder="Warszawa"
                value={formData.city}
                onChangeText={(text) => setFormData({ ...formData, city: text })}
              />

              <Text style={styles.label}>Kod pocztowy *</Text>
              <TextInput
                style={styles.input}
                placeholder="00-000"
                value={formData.postalCode}
                onChangeText={(text) => setFormData({ ...formData, postalCode: text })}
              />

              <Text style={styles.label}>Liczba pokoi</Text>
              <TextInput
                style={styles.input}
                placeholder="3"
                keyboardType="numeric"
                value={formData.roomsCount}
                onChangeText={(text) => setFormData({ ...formData, roomsCount: text })}
              />

              <Text style={styles.label}>Powierzchnia (m²)</Text>
              <TextInput
                style={styles.input}
                placeholder="50.5"
                keyboardType="decimal-pad"
                value={formData.area}
                onChangeText={(text) => setFormData({ ...formData, area: text })}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Anuluj</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.button, styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleAddProperty}
                  disabled={submitting}
                >
                  <Text style={styles.submitButtonText}>
                    {submitting ? 'Dodawanie...' : 'Dodaj'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.m,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: 'bold',
  },
  listContent: {
    padding: Spacing.m,
    gap: Spacing.m,
  },
  card: {
    backgroundColor: Colors.surface,
    padding: Spacing.l,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  city: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  details: {
    flexDirection: 'row',
    gap: Spacing.m,
    marginTop: Spacing.m,
  },
  detailText: {
    fontSize: 14,
    color: Colors.text,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.xl,
    color: Colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.l,
    width: '90%',
    maxHeight: '80%',
  },
  label: {
    ...Typography.bodyBold,
    marginTop: Spacing.m,
    marginBottom: Spacing.s,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.m,
    backgroundColor: Colors.background,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.m,
    marginTop: Spacing.xl,
  },
  button: {
    flex: 1,
    padding: Spacing.m,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.text,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: Colors.primary,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.textSecondary,
  },
  submitButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
});
