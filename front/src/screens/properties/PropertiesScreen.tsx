import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Modal, ScrollView, Image, Platform, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { fetchProperties } from '../../store/slices/propertiesSlice';
import { AppDispatch, RootState } from '../../store/store';
import { propertiesAPI } from '../../api/endpoints';
import Loading from '../../components/common/Loading';
import { Colors } from '../../styles/colors';
import { Typography } from '../../styles/typography';
import { Spacing } from '../../styles/spacing';
import { capitalize } from '../../utils/textFormatters';

export default function PropertiesScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { properties, loading } = useSelector((state: RootState) => state.properties);
  const user = useSelector((state: RootState) => state.auth.user);
  const userRole = user?.role;
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    address: '',
    city: '',
    postalCode: '',
    roomsCount: '',
    area: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<(File | { uri: string, file?: File })[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Odświeżaj nieruchomości przy każdym wejściu na ekran
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchProperties());
    }, [dispatch])
  );

  const pickImage = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.onchange = async (e: any) => {
        const files = Array.from(e.target.files || []) as File[];
        const newPhotos = files.map(file => file);
        const newPreviewUrls = files.map(file => URL.createObjectURL(file));
        setPhotos(prev => [...prev, ...newPhotos]);
        setPhotoPreviewUrls(prev => [...prev, ...newPreviewUrls]);
      };
      input.click();
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Błąd', 'Potrzebujemy uprawnień do galerii');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setPhotos(prev => [...prev, { uri }]);
        setPhotoPreviewUrls(prev => [...prev, uri]);
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

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
      const propertyId = response.data.id;

      // Upload photos if any
      if (photos.length > 0) {
        console.log('🔵 Uploading photos...', photos.length);
        const uploadPromises = photos.map(async (photo) => {
          try {
            const formData = new FormData();
            
            if (Platform.OS === 'web' && photo instanceof File) {
              formData.append('photo', photo);
              console.log('🔵 Uploading web photo:', photo.name, photo.type, photo.size);
            } else if (typeof photo === 'object' && 'uri' in photo) {
              const filename = photo.uri.split('/').pop() || 'photo.jpg';
              const match = /\.([\w]+)$/.exec(filename);
              const type = match ? `image/${match[1]}` : 'image/jpeg';
              formData.append('photo', { uri: photo.uri, name: filename, type } as any);
              console.log('🔵 Uploading mobile photo:', filename);
            }

            const uploadResponse = await propertiesAPI.uploadPhoto(propertyId, formData);
            console.log('🟢 Photo uploaded:', uploadResponse.data);
          } catch (photoError) {
            console.error('🔴 Failed to upload photo:', photoError);
            throw photoError;
          }
        });

        try {
          await Promise.all(uploadPromises);
          console.log('🟢 All photos uploaded successfully');
        } catch (error) {
          console.error('🔴 Some photos failed to upload');
          Alert.alert('Ostrzeżenie', 'Niektóre zdjęcia mogły się nie załadować');
        }
      }
      
      Alert.alert('Sukces', 'Mieszkanie zostało dodane');
      setModalVisible(false);
      setFormData({ address: '', city: '', postalCode: '', roomsCount: '', area: '' });
      setPhotos([]);
      setPhotoPreviewUrls([]);
      
      console.log('🔵 Refreshing properties list...');
      await dispatch(fetchProperties()).unwrap();
      console.log('🟢 Properties refreshed');
      
      // Navigate to the newly created property details
      navigation.navigate('PropertyDetails', { propertyId });
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

  const renderProperty = ({ item }: any) => {
    const firstPhoto = item.photos && item.photos.length > 0 ? item.photos[0] : null;
    
    // Sprawdź czy użytkownik jest właścicielem tej nieruchomości
    const isOwnerOfThis = item.ownerId === user?.id;
    
    // Sprawdź czy najemca ma nieaktywny najem
    const isInactive = userRole === 'Najemca' && item.isActiveTenant === false;
    
    // Aktualni najemcy (data zakończenia jest włącznie - wygasa NASTĘPNEGO dnia)
    const currentTenants = item.tenants?.filter((t: any) => {
      if (!t.endDate) return true;
      const endDate = new Date(t.endDate);
      endDate.setHours(23, 59, 59, 999); // Koniec dnia (włącznie)
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Początek dzisiejszego dnia
      return endDate >= today;
    }) || [];

    // Oblicz okres umowy (od najwcześniejszej do najpóźniejszej daty)
    let rentalPeriod = '';
    if (currentTenants.length > 0) {
      const dates = currentTenants.map((t: any) => ({
        start: new Date(t.startDate),
        end: t.endDate ? new Date(t.endDate) : null
      }));
      const earliestStart = new Date(Math.min(...dates.map(d => d.start.getTime())));
      const latestEnd = dates.some(d => !d.end) ? null : new Date(Math.max(...dates.filter(d => d.end).map(d => d.end!.getTime())));
      
      rentalPeriod = `${earliestStart.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${latestEnd ? latestEnd.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'obecnie'}`;
    }
    
    return (
      <TouchableOpacity 
        style={[
          styles.card, 
          isInactive && styles.cardInactive,
          isOwnerOfThis ? styles.cardOwned : styles.cardRented
        ]}
        onPress={() => navigation.navigate('PropertyDetails', { propertyId: item.id })}
        activeOpacity={0.7}
      >
        {/* Kolorowy pasek wskazujący typ */}
        <View style={[styles.ownershipIndicator, isOwnerOfThis ? styles.indicatorOwned : styles.indicatorRented]} />
        
        {firstPhoto && (
          <Image 
            source={{ uri: firstPhoto }} 
            style={[styles.propertyImage, isInactive && styles.imageInactive]}
            resizeMode="cover"
          />
        )}
        <View style={styles.cardContent}>
          {/* Badge typu własności */}
          <View style={[styles.ownershipBadge, isOwnerOfThis ? styles.badgeOwned : styles.badgeRented]}>
            <Ionicons 
              name={isOwnerOfThis ? "home" : "key"} 
              size={12} 
              color={isOwnerOfThis ? Colors.primary : "#8B5CF6"} 
            />
            <Text style={[styles.ownershipBadgeText, isOwnerOfThis ? styles.badgeTextOwned : styles.badgeTextRented]}>
              {isOwnerOfThis ? 'Twoje mieszkanie' : 'Wynajmujesz'}
            </Text>
          </View>
          
          <View style={styles.cardHeader}>
            <Text style={[Typography.h3, isInactive && styles.textInactive]}>{item.address}</Text>
            <Ionicons name="chevron-forward" size={24} color={isInactive ? Colors.textSecondary : Colors.textSecondary} />
          </View>
          <Text style={[styles.city, isInactive && styles.textInactive]}>{item.city}, {item.postalCode}</Text>
          
          {isInactive && (
            <View style={styles.inactiveBadge}>
              <Ionicons name="time-outline" size={14} color={Colors.error} />
              <Text style={styles.inactiveText}>Najem zakończony</Text>
            </View>
          )}
          
          <View style={styles.detailsRow}>
            <View style={styles.details}>
              <View style={styles.detailBadge}>
                <Ionicons name="bed-outline" size={16} color={isInactive ? Colors.textSecondary : Colors.primary} />
                <Text style={[styles.detailText, isInactive && styles.textInactive]}>{item.roomsCount} pokoi</Text>
              </View>
              <View style={styles.detailBadge}>
                <Ionicons name="resize-outline" size={16} color={isInactive ? Colors.textSecondary : Colors.primary} />
                <Text style={[styles.detailText, isInactive && styles.textInactive]}>{item.area} m²</Text>
              </View>
            </View>
            
            {currentTenants.length > 0 && (
              <View style={styles.tenantInfo}>
                <View style={styles.tenantHeader}>
                  <Ionicons name="people" size={14} color={isInactive ? Colors.textSecondary : Colors.primary} />
                  <Text style={[styles.tenantLabel, isInactive && styles.textInactive]}>Najemcy:</Text>
                </View>
                {currentTenants.map((tenant: any, index: number) => (
                  <Text key={tenant.tenantId} style={[styles.tenantName, isInactive && styles.textInactive]}>
                    {capitalize(tenant.tenantName)}
                  </Text>
                ))}
                {rentalPeriod && (
                  <Text style={[styles.rentalPeriod, isInactive && styles.textInactive]}>
                    <Ionicons name="calendar-outline" size={11} color={isInactive ? Colors.textSecondary : Colors.textSecondary} /> {rentalPeriod}
                  </Text>
                )}
              </View>
            )}
          </View>
          
          {/* Pokaż właściciela dla najemców */}
          {!isOwnerOfThis && item.owner && (
            <View style={styles.ownerInfoRow}>
              <Ionicons name="person" size={14} color={isInactive ? Colors.textSecondary : Colors.primary} />
              <Text style={[styles.ownerLabel, isInactive && styles.textInactive]}>Właściciel: </Text>
              <Text style={[styles.ownerNameText, isInactive && styles.textInactive]}>{item.owner.name}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={Typography.h2}>Moje mieszkania</Text>
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

              <View style={styles.photosSection}>
                <View style={styles.photosSectionHeader}>
                  <Text style={styles.label}>Zdjęcia</Text>
                  <TouchableOpacity
                    style={styles.addPhotoButtonSmall}
                    onPress={pickImage}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Ionicons name="camera" size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                </View>
                
                {photoPreviewUrls.length > 0 && (
                  <View style={styles.photosGrid}>
                    {photoPreviewUrls.map((photoUrl, index) => (
                      <View key={index} style={styles.photoPreviewContainer}>
                        <Image source={{ uri: photoUrl }} style={styles.photoPreview} />
                        <TouchableOpacity
                          style={styles.removePhotoButton}
                          onPress={() => removePhoto(index)}
                        >
                          <Ionicons name="close-circle" size={24} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

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

      {userRole === 'Wlasciciel' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      )}
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
  photosSection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  photosSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  addPhotoButtonSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  photoPreviewContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.white,
    borderRadius: 12,
  },
  listContent: {
    padding: Spacing.m,
    gap: Spacing.m,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: Spacing.m,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardOwned: {
    borderLeftWidth: 0,
  },
  cardRented: {
    borderLeftWidth: 0,
  },
  ownershipIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    zIndex: 10,
  },
  indicatorOwned: {
    backgroundColor: Colors.primary,
  },
  indicatorRented: {
    backgroundColor: '#8B5CF6',
  },
  ownershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: Spacing.s,
  },
  badgeOwned: {
    backgroundColor: '#E8F5E9',
  },
  badgeRented: {
    backgroundColor: '#EDE9FE',
  },
  ownershipBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTextOwned: {
    color: Colors.primary,
  },
  badgeTextRented: {
    color: '#8B5CF6',
  },
  cardInactive: {
    opacity: 0.6,
    backgroundColor: '#f5f5f5',
  },
  propertyImage: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.disabled,
  },
  imageInactive: {
    opacity: 0.5,
  },
  textInactive: {
    color: Colors.textSecondary,
  },
  inactiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff5f5',
    paddingHorizontal: Spacing.s,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: Spacing.s,
    borderWidth: 1,
    borderColor: '#ffebeb',
    alignSelf: 'flex-start',
  },
  inactiveText: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: '600',
  },
  cardContent: {
    padding: Spacing.m,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  city: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.s,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: Spacing.s,
    gap: Spacing.m,
  },
  details: {
    flexDirection: 'row',
    gap: Spacing.s,
    flex: 1,
  },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.s,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  tenantInfo: {
    alignItems: 'flex-end',
    flex: 1,
  },
  tenantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  tenantLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  tenantName: {
    fontSize: 12,
    color: Colors.text,
    textAlign: 'right',
    marginBottom: 1,
  },
  rentalPeriod: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'right',
  },
  ownerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.s,
    paddingTop: Spacing.s,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  ownerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  ownerNameText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
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
