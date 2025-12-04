import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { propertiesAPI } from '../../api/endpoints';
import { PropertyResponse } from '../../types/api';
import { Colors } from '../../styles/colors';
import { Typography } from '../../styles/typography';
import { Spacing } from '../../styles/spacing';
import { storage } from '../../utils/storage';
import { API_BASE_URL } from '@env';

const API_URL = API_BASE_URL || 'http://localhost:5162/api';

export default function PropertyDetailsScreen({ route, navigation }: any) {
  const { propertyId } = route.params;
  const [property, setProperty] = useState<PropertyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    address: '',
    city: '',
    postalCode: '',
    roomsCount: '',
    area: '',
    description: '',
  });

  useEffect(() => {
    loadProperty();
  }, [propertyId]);

  const loadProperty = async () => {
    try {
      const response = await propertiesAPI.getById(propertyId);
      setProperty(response.data);
      setFormData({
        address: response.data.address || '',
        city: response.data.city || '',
        postalCode: response.data.postalCode || '',
        roomsCount: response.data.roomsCount?.toString() || '',
        area: response.data.area?.toString() || '',
        description: response.data.description || '',
      });
    } catch (error) {
      console.error('Failed to load property:', error);
      Alert.alert('Błąd', 'Nie udało się załadować szczegółów mieszkania');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      await propertiesAPI.update(propertyId, {
        address: formData.address,
        city: formData.city,
        postalCode: formData.postalCode,
        roomsCount: parseInt(formData.roomsCount) || 0,
        area: parseFloat(formData.area) || 0,
        description: formData.description,
      });
      
      Alert.alert('Sukces', 'Mieszkanie zostało zaktualizowane');
      setEditMode(false);
      loadProperty();
    } catch (error) {
      console.error('Failed to update property:', error);
      Alert.alert('Błąd', 'Nie udało się zaktualizować mieszkania');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Brak uprawnień', 'Potrzebujemy uprawnień do galerii');
      return;
    }

    const result = await ImagePicker.launchImagePickerAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadPhoto(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (uri: string) => {
    setUploading(true);
    try {
      const token = await storage.getItemAsync('authToken');
      
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('photo', {
        uri,
        name: filename,
        type,
      } as any);

      const response = await fetch(`${API_URL}/properties/${propertyId}/photos`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }

      Alert.alert('Sukces', 'Zdjęcie zostało dodane');
      loadProperty();
    } catch (error) {
      console.error('Failed to upload photo:', error);
      Alert.alert('Błąd', 'Nie udało się dodać zdjęcia');
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (photoUrl: string) => {
    Alert.alert(
      'Usuń zdjęcie',
      'Czy na pewno chcesz usunąć to zdjęcie?',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await storage.getItemAsync('authToken');
              const photoPath = photoUrl.split('/').pop();
              
              const response = await fetch(`${API_URL}/properties/${propertyId}/photos/${photoPath}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': token ? `Bearer ${token}` : '',
                },
              });

              if (!response.ok) {
                throw new Error('Failed to delete photo');
              }

              Alert.alert('Sukces', 'Zdjęcie zostało usunięte');
              loadProperty();
            } catch (error) {
              console.error('Failed to delete photo:', error);
              Alert.alert('Błąd', 'Nie udało się usunąć zdjęcia');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Nie znaleziono mieszkania</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={Typography.h2}>Szczegóły mieszkania</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setEditMode(!editMode)}
        >
          <Ionicons 
            name={editMode ? "close" : "pencil"} 
            size={24} 
            color={Colors.primary} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        {editMode ? (
          <>
            <Text style={styles.label}>Adres *</Text>
            <TextInput
              style={styles.input}
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
            />

            <Text style={styles.label}>Miasto *</Text>
            <TextInput
              style={styles.input}
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
            />

            <Text style={styles.label}>Kod pocztowy *</Text>
            <TextInput
              style={styles.input}
              value={formData.postalCode}
              onChangeText={(text) => setFormData({ ...formData, postalCode: text })}
            />

            <Text style={styles.label}>Liczba pokoi</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={formData.roomsCount}
              onChangeText={(text) => setFormData({ ...formData, roomsCount: text })}
            />

            <Text style={styles.label}>Powierzchnia (m²)</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={formData.area}
              onChangeText={(text) => setFormData({ ...formData, area: text })}
            />

            <Text style={styles.label}>Opis</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={4}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleUpdate}>
              <Text style={styles.saveButtonText}>Zapisz zmiany</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={Typography.h3}>{property.address}</Text>
            <Text style={styles.subtitle}>{property.city}, {property.postalCode}</Text>
            
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Ionicons name="bed-outline" size={24} color={Colors.primary} />
                <Text style={styles.detailLabel}>Pokoje</Text>
                <Text style={styles.detailValue}>{property.roomsCount || 0}</Text>
              </View>
              
              <View style={styles.detailItem}>
                <Ionicons name="resize-outline" size={24} color={Colors.primary} />
                <Text style={styles.detailLabel}>Powierzchnia</Text>
                <Text style={styles.detailValue}>{property.area || 0} m²</Text>
              </View>
            </View>

            {property.description && (
              <>
                <Text style={[Typography.label, styles.marginTop]}>Opis</Text>
                <Text style={styles.description}>{property.description}</Text>
              </>
            )}
          </>
        )}
      </View>

      {/* Zdjęcia */}
      <View style={styles.card}>
        <View style={styles.photosHeader}>
          <Text style={Typography.h3}>Zdjęcia</Text>
          <TouchableOpacity
            style={styles.addPhotoButton}
            onPress={pickImage}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons name="camera" size={24} color={Colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.photosGrid}>
          {property.photos && property.photos.length > 0 ? (
            property.photos.map((photo, index) => (
              <TouchableOpacity
                key={index}
                style={styles.photoContainer}
                onPress={() => setSelectedPhoto(photo)}
              >
                <Image source={{ uri: photo }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.deletePhotoButton}
                  onPress={() => deletePhoto(photo)}
                >
                  <Ionicons name="trash" size={18} color="#fff" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>Brak zdjęć</Text>
          )}
        </View>
      </View>

      {/* Najemcy */}
      {property.tenants && property.tenants.length > 0 && (
        <View style={styles.card}>
          <Text style={Typography.h3}>Najemcy</Text>
          {property.tenants.map((tenant, index) => (
            <View key={index} style={styles.tenantItem}>
              <Ionicons name="person" size={20} color={Colors.primary} />
              <View style={styles.tenantInfo}>
                <Text style={styles.tenantName}>{tenant.tenantName}</Text>
                <Text style={styles.tenantDate}>
                  Od: {new Date(tenant.startDate).toLocaleDateString('pl-PL')}
                  {tenant.endDate && ` - Do: ${new Date(tenant.endDate).toLocaleDateString('pl-PL')}`}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Lightbox Modal */}
      <Modal
        visible={selectedPhoto !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.lightboxContainer}>
          <TouchableOpacity
            style={styles.lightboxClose}
            onPress={() => setSelectedPhoto(null)}
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {selectedPhoto && (
            <Image
              source={{ uri: selectedPhoto }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
  },
  editButton: {
    padding: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    margin: Spacing.md,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.lg,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  marginTop: {
    marginTop: Spacing.lg,
  },
  description: {
    fontSize: 14,
    color: Colors.text,
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  label: {
    ...Typography.bodyBold,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.md,
    backgroundColor: Colors.background,
    fontSize: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  photosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  addPhotoButton: {
    padding: Spacing.sm,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  photoContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  deletePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 4,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  tenantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tenantInfo: {
    flex: 1,
  },
  tenantName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  tenantDate: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  lightboxContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  lightboxImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});
