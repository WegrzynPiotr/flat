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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { propertiesAPI, userManagementAPI } from '../../api/endpoints';
import { PropertyResponse } from '../../types/api';
import { Colors } from '../../styles/colors';
import { Typography } from '../../styles/typography';
import { Spacing } from '../../styles/spacing';
import { storage } from '../../utils/storage';
import Constants from 'expo-constants';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

const API_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://193.106.130.55:5162/api';

export default function PropertyDetailsScreen({ route, navigation }: any) {
  const { propertyId } = route.params;
  const user = useSelector((state: RootState) => state.auth.user);
  const isOwner = user?.role === 'Wlasciciel';
  
  const [property, setProperty] = useState<PropertyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{ url: string; name: string; type: string } | null>(null);
  
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
    // Web fallback - użyj standardowego input file
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (file) {
          // Konwertuj File na base64 URI dla web
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = reader.result as string;
            await uploadPhoto(base64, file);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
      return;
    }

    // Native - użyj expo-image-picker
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

  const uploadPhoto = async (uri: string, file?: File) => {
    setUploading(true);
    try {
      console.log('🔵 Starting photo upload...');
      console.log('🔵 URI:', uri);
      console.log('🔵 File:', file);
      console.log('🔵 Property ID:', propertyId);
      console.log('🔵 Platform:', Platform.OS);
      
      const token = await storage.getItemAsync('authToken');
      console.log('🔵 Token exists:', !!token);
      
      const formData = new FormData();

      if (Platform.OS === 'web' && file) {
        // Web: użyj File object
        console.log('🔵 Using File object for web');
        formData.append('photo', file);
      } else {
        // Mobile: użyj URI
        const filename = uri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        console.log('🔵 Filename:', filename);
        console.log('🔵 Type:', type);

        formData.append('photo', {
          uri,
          name: filename,
          type,
        } as any);
      }

      const uploadUrl = `${API_URL}/properties/${propertyId}/photos`;
      console.log('🔵 Upload URL:', uploadUrl);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: formData,
      });

      console.log('🔵 Response status:', response.status);
      console.log('🔵 Response ok:', response.ok);
      
      const responseText = await response.text();
      console.log('🔵 Response body:', responseText);

      if (!response.ok) {
        console.error('🔴 Upload failed with status:', response.status);
        console.error('🔴 Response:', responseText);
        throw new Error(`Failed to upload photo: ${response.status} - ${responseText}`);
      }

      Alert.alert('Sukces', 'Zdjęcie zostało dodane');
      loadProperty();
    } catch (error) {
      console.error('🔴 Failed to upload photo:', error);
      if (error instanceof Error) {
        console.error('🔴 Error message:', error.message);
        console.error('🔴 Error stack:', error.stack);
      }
      Alert.alert('Błąd', `Nie udało się dodać zdjęcia: ${error}`);
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (photoUrl: string) => {
    console.log('🔵 deletePhoto called with:', photoUrl);
    
    const confirmDelete = Platform.OS === 'web' 
      ? window.confirm('Czy na pewno chcesz usunąć to zdjęcie?')
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Usuń zdjęcie',
            'Czy na pewno chcesz usunąć to zdjęcie?',
            [
              { 
                text: 'Anuluj', 
                style: 'cancel',
                onPress: () => {
                  console.log('🔵 Delete cancelled');
                  resolve(false);
                }
              },
              {
                text: 'Usuń',
                style: 'destructive',
                onPress: () => {
                  console.log('🔵 Delete confirmed');
                  resolve(true);
                }
              },
            ]
          );
        });
    
    if (!confirmDelete) {
      console.log('🔵 Delete cancelled by user');
      return;
    }
    
    console.log('🔵 Delete confirmed, starting deletion...');
    try {
      // Extract filename from full URL
      const filename = photoUrl.split('/').pop();
      if (!filename) {
        throw new Error('Invalid photo URL');
      }
      
      console.log('🔵 Deleting photo:', filename, 'from property:', propertyId);
      
      const result = await propertiesAPI.deletePhoto(propertyId, filename);
      console.log('🟢 Delete successful:', result);

      if (Platform.OS === 'web') {
        window.alert('Zdjęcie zostało usunięte');
      } else {
        Alert.alert('Sukces', 'Zdjęcie zostało usunięte');
      }
      loadProperty();
    } catch (error: any) {
      console.error('🔴 Failed to delete photo:', error);
      console.error('🔴 Error details:', error.response?.data || error.message);
      if (Platform.OS === 'web') {
        window.alert('Nie udało się usunąć zdjęcia');
      } else {
        Alert.alert('Błąd', 'Nie udało się usunąć zdjęcia');
      }
    }
  };

  const pickDocument = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.doc,.docx,.xls,.xlsx,image/*';
      input.onchange = async (e: any) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploadingDoc(true);
        try {
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('document', file);

            await propertiesAPI.uploadDocument(propertyId, formData);
          }

          if (Platform.OS === 'web') {
            window.alert('Dokumenty zostały dodane');
          } else {
            Alert.alert('Sukces', 'Dokumenty zostały dodane');
          }
          loadProperty();
        } catch (error) {
          console.error('Failed to upload documents:', error);
          Alert.alert('Błąd', 'Nie udało się dodać dokumentów');
        } finally {
          setUploadingDoc(false);
        }
      };
      input.click();
    } else {
      // Mobile - użyj DocumentPicker (wymaga instalacji expo-document-picker)
      Alert.alert('Info', 'Dodawanie dokumentów jest dostępne tylko w wersji webowej');
    }
  };

  const deleteDocument = async (filename: string) => {
    const confirmDelete = Platform.OS === 'web'
      ? window.confirm('Czy na pewno chcesz usunąć ten dokument?')
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Usuń dokument',
            'Czy na pewno chcesz usunąć ten dokument?',
            [
              { text: 'Anuluj', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Usuń', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmDelete) return;

    try {
      await propertiesAPI.deleteDocument(propertyId, filename);
      
      if (Platform.OS === 'web') {
        window.alert('Dokument został usunięty');
      } else {
        Alert.alert('Sukces', 'Dokument został usunięty');
      }
      loadProperty();
    } catch (error) {
      console.error('Failed to delete document:', error);
      Alert.alert('Błąd', 'Nie udało się usunąć dokumentu');
    }
  };

  const deleteProperty = async () => {
    const confirmDelete = Platform.OS === 'web'
      ? window.confirm('Czy na pewno chcesz usunąć to mieszkanie? Ta operacja jest nieodwracalna.')
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Usuń mieszkanie',
            'Czy na pewno chcesz usunąć to mieszkanie? Ta operacja jest nieodwracalna.',
            [
              { text: 'Anuluj', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Usuń', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmDelete) return;

    try {
      await propertiesAPI.delete(propertyId);
      
      if (Platform.OS === 'web') {
        window.alert('Mieszkanie zostało usunięte');
      } else {
        Alert.alert('Sukces', 'Mieszkanie zostało usunięte');
      }
      navigation.goBack();
    } catch (error) {
      console.error('Failed to delete property:', error);
      Alert.alert('Błąd', 'Nie udało się usunąć mieszkania');
    }
  };

  const removeTenant = async (tenantId: string) => {
    const confirmDelete = Platform.OS === 'web'
      ? window.confirm('Czy na pewno chcesz usunąć tego najemcę z mieszkania?')
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Usuń najemcę',
            'Czy na pewno chcesz usunąć tego najemcę z mieszkania?',
            [
              { text: 'Anuluj', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Usuń', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmDelete) return;

    try {
      await userManagementAPI.removeTenant(propertyId, tenantId);
      
      if (Platform.OS === 'web') {
        window.alert('Najemca został usunięty');
      } else {
        Alert.alert('Sukces', 'Najemca został usunięty');
      }
      loadProperty();
    } catch (error) {
      console.error('Failed to remove tenant:', error);
      Alert.alert('Błąd', 'Nie udało się usunąć najemcy');
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf':
        return 'document-text';
      case 'doc':
      case 'docx':
        return 'document';
      case 'xls':
      case 'xlsx':
        return 'grid';
      case 'jpg':
      case 'jpeg':
      case 'png':
        return 'image';
      default:
        return 'document-attach';
    }
  };

  const openDocument = (doc: any) => {
    const ext = doc.filename.toLowerCase().split('.').pop();
    if (['jpg', 'jpeg', 'png'].includes(ext || '')) {
      setSelectedDocument({ url: doc.url, name: doc.originalName, type: 'image' });
    } else if (ext === 'pdf') {
      setSelectedDocument({ url: doc.url, name: doc.originalName, type: 'pdf' });
    } else {
      // Download file
      if (Platform.OS === 'web') {
        window.open(doc.url, '_blank');
      } else {
        Alert.alert('Info', 'Pobieranie pliku dostępne tylko w wersji webowej');
      }
    }
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
        <View style={styles.headerButtons}>
          {isOwner && (
            <>
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
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={deleteProperty}
              >
                <Ionicons 
                  name="trash" 
                  size={24} 
                  color={Colors.error} 
                />
              </TouchableOpacity>
            </>
          )}
        </View>
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
          {isOwner && (
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
          )}
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
                {isOwner && (
                  <TouchableOpacity
                    style={styles.deletePhotoButton}
                    onPress={() => deletePhoto(photo)}
                  >
                    <Ionicons name="trash" size={18} color="#fff" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>Brak zdjęć</Text>
          )}
        </View>
      </View>

      {/* Dokumenty */}
      <View style={styles.card}>
        <View style={styles.photosHeader}>
          <Text style={Typography.h3}>Dokumenty</Text>
          {isOwner && (
            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={pickDocument}
              disabled={uploadingDoc}
            >
              {uploadingDoc ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="document-attach" size={24} color={Colors.primary} />
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.documentsContainer}>
          {property.documents && property.documents.length > 0 ? (
            property.documents.map((doc, index) => (
              <TouchableOpacity
                key={index}
                style={styles.documentItem}
                onPress={() => openDocument(doc)}
              >
                <View style={styles.documentInfo}>
                  <Ionicons 
                    name={getFileIcon(doc.filename) as any} 
                    size={32} 
                    color={Colors.primary} 
                  />
                  <View style={styles.documentText}>
                    <Text style={styles.documentName} numberOfLines={1}>
                      {doc.originalName}
                    </Text>
                    <Text style={styles.documentDate}>
                      {new Date(doc.uploadedAt).toLocaleDateString('pl-PL')}
                    </Text>
                  </View>
                </View>
                {isOwner && (
                  <TouchableOpacity
                    onPress={() => deleteDocument(doc.filename)}
                    style={styles.documentDeleteButton}
                  >
                    <Ionicons name="trash-outline" size={20} color={Colors.error} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>Brak dokumentów</Text>
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
              {isOwner && (
                <TouchableOpacity
                  style={styles.tenantDeleteButton}
                  onPress={() => removeTenant(tenant.tenantId)}
                >
                  <Ionicons name="trash-outline" size={20} color={Colors.error} />
                </TouchableOpacity>
              )}
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

      {/* Document Viewer Modal */}
      <Modal
        visible={selectedDocument !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedDocument(null)}
      >
        <View style={styles.lightboxContainer}>
          <TouchableOpacity
            style={styles.lightboxClose}
            onPress={() => setSelectedDocument(null)}
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {selectedDocument && (
            <>
              {selectedDocument.type === 'image' ? (
                <Image
                  source={{ uri: selectedDocument.url }}
                  style={styles.lightboxImage}
                  resizeMode="contain"
                />
              ) : selectedDocument.type === 'pdf' && Platform.OS === 'web' ? (
                <iframe
                  src={selectedDocument.url}
                  style={{
                    width: '90%',
                    height: '90%',
                    border: 'none',
                    backgroundColor: 'white',
                  }}
                  title={selectedDocument.name}
                />
              ) : (
                <View style={styles.documentPreviewPlaceholder}>
                  <Ionicons name="document-text" size={64} color="#fff" />
                  <Text style={styles.documentPreviewText}>{selectedDocument.name}</Text>
                  <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        window.open(selectedDocument.url, '_blank');
                      }
                    }}
                  >
                    <Text style={styles.downloadButtonText}>Pobierz plik</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
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
  headerButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  editButton: {
    padding: Spacing.sm,
  },
  deleteButton: {
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
  tenantDeleteButton: {
    padding: Spacing.sm,
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
  documentsContainer: {
    gap: Spacing.sm,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  documentText: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  documentDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  documentDeleteButton: {
    padding: Spacing.sm,
  },
  documentPreviewPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  documentPreviewText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  downloadButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    marginTop: Spacing.lg,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
