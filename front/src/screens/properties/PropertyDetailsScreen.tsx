import React, { useState, useEffect, useCallback } from 'react';
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
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { propertiesAPI, userManagementAPI, propertyDocumentsAPI } from '../../api/endpoints';
import { PropertyResponse } from '../../types/api';
import { Colors } from '../../styles/colors';
import { Typography } from '../../styles/typography';
import { Spacing } from '../../styles/spacing';
import { storage } from '../../utils/storage';
import Constants from 'expo-constants';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import PropertyDocumentsManager from '../../components/properties/PropertyDocumentsManager';
import { capitalize } from '../../utils/textFormatters';
import PropertyMap from '../../components/common/PropertyMap';

const API_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://193.106.130.55:5162/api';

export default function PropertyDetailsScreen({ route, navigation }: any) {
  const { propertyId } = route.params;
  const user = useSelector((state: RootState) => state.auth.user);
  
  const [property, setProperty] = useState<PropertyResponse | null>(null);
  
  // Sprawdź czy użytkownik jest faktycznym właścicielem TEJ nieruchomości (nie tylko ma rolę Wlasciciel)
  const isActualOwner = property?.ownerId === user?.id;
  // Dla kompatybilności wstecznej - używane w niektórych miejscach
  const isOwner = isActualOwner;
  const isTenant = !isActualOwner && property?.tenants?.some(t => t.tenantId === user?.id);
  
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{ url: string; name: string; type: string } | null>(null);
  const [mainPhoto, setMainPhoto] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showDocumentsManager, setShowDocumentsManager] = useState(false);
  const [latestDocuments, setLatestDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<any>(null);
  const [showDocPreview, setShowDocPreview] = useState(false);
  
  // Sprawdź czy najemca ma nieaktywny najem
  const isInactiveTenant = isTenant && property?.isActiveTenant === false;
  const canEdit = isOwner || (isTenant && !isInactiveTenant);
  
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
    loadLatestDocuments();
  }, [propertyId]);

  // Odśwież dane przy powrocie na ekran (np. po przypisaniu najemców)
  useFocusEffect(
    useCallback(() => {
      loadProperty();
      loadLatestDocuments();
    }, [propertyId])
  );

  const loadLatestDocuments = async () => {
    try {
      setLoadingDocuments(true);
      const response = await propertyDocumentsAPI.getLatest(propertyId);
      setLatestDocuments(response.data);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const getDocumentIcon = (documentType: string): any => {
    const iconMap: { [key: string]: any } = {
      'Umowa': 'document-text',
      'Wodomierz': 'water',
      'Prąd': 'flash',
      'Gaz': 'flame',
      'Ogrzewanie': 'thermometer',
      'Ubezpieczenie': 'shield-checkmark',
      'Remont': 'construct',
      'Inne': 'folder',
    };
    return iconMap[documentType] || 'document';
  };

  const getDocumentUrl = (fileUrl: string) => {
    if (fileUrl.startsWith('http')) {
      return fileUrl;
    }
    return `${API_URL}/${fileUrl.replace(/\\/g, '/')}`;
  };

  const isImageFile = (fileName: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  const handlePreviewDocument = (doc: any) => {
    setPreviewDocument(doc);
    setShowDocPreview(true);
  };

  const loadProperty = async () => {
    try {
      const response = await propertiesAPI.getById(propertyId);
      setProperty(response.data);
      if (response.data.photos && response.data.photos.length > 0) {
        setMainPhoto(response.data.photos[0]);
      }
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

      {/* Ostrzeżenie o nieaktywnym najmie */}
      {isInactiveTenant && (
        <View style={styles.inactiveWarning}>
          <Ionicons name="information-circle" size={24} color={Colors.error} />
          <View style={styles.inactiveWarningText}>
            <Text style={styles.inactiveWarningTitle}>Najem zakończony</Text>
            <Text style={styles.inactiveWarningSubtitle}>
              Możesz przeglądać dokumenty z okresu swojego najmu, ale nie możesz edytować ani zgłaszać usterek.
            </Text>
          </View>
        </View>
      )}

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
          {isOwner && !isInactiveTenant && (
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

        {property.photos && property.photos.length > 0 ? (
          <>
            {/* Główne zdjęcie */}
            <TouchableOpacity
              style={styles.mainPhotoContainer}
              onPress={() => {
                const index = property.photos?.indexOf(mainPhoto || '') || 0;
                setLightboxIndex(index);
                setSelectedPhoto(mainPhoto);
              }}
            >
              <Image source={{ uri: mainPhoto || property.photos[0] }} style={styles.mainPhoto} />
              {isOwner && mainPhoto && !isInactiveTenant && (
                <TouchableOpacity
                  style={styles.mainPhotoDeleteButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    deletePhoto(mainPhoto);
                  }}
                >
                  <Ionicons name="trash" size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {/* Miniatury */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailsContainer}>
              {property.photos.map((photo, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.thumbnailContainer,
                    mainPhoto === photo && styles.thumbnailSelected
                  ]}
                  onPress={() => setMainPhoto(photo)}
                >
                  <Image source={{ uri: photo }} style={styles.thumbnail} />
                  {isOwner && !isInactiveTenant && (
                    <TouchableOpacity
                      style={styles.thumbnailDeleteButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        deletePhoto(photo);
                      }}
                    >
                      <Ionicons name="close-circle" size={20} color="#fff" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        ) : (
          <Text style={styles.emptyText}>Brak zdjęć</Text>
        )}
      </View>

      {/* Informacje o nieruchomości */}
      <View style={styles.card}>
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
      </View>

      {/* Mapa lokalizacji */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="map" size={24} color={Colors.primary} />
          <Text style={[Typography.h3, { marginLeft: 8 }]}>Lokalizacja</Text>
        </View>
        <PropertyMap
          latitude={property.latitude}
          longitude={property.longitude}
          address={`${property.address}, ${property.city}`}
          height={250}
        />
      </View>

      {/* Dokumenty z wersjonowaniem */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={Typography.h3}>Dokumenty mieszkania</Text>
          <Text style={styles.sectionSubtitle}>
            Najnowsze wersje dokumentów z pełną historią zmian
          </Text>
        </View>

        {loadingDocuments ? (
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: Spacing.m }} />
        ) : latestDocuments.length > 0 ? (
          <View style={styles.documentsGrid}>
            {latestDocuments.map((doc) => (
              <TouchableOpacity 
                key={doc.id} 
                style={styles.documentItem}
                onPress={() => handlePreviewDocument(doc)}
              >
                <View style={styles.documentItemHeader}>
                  <Ionicons 
                    name={getDocumentIcon(doc.documentType)} 
                    size={20} 
                    color={Colors.primary} 
                  />
                  <Text style={styles.documentItemType}>{doc.documentType}</Text>
                </View>
                <Text style={styles.documentItemName} numberOfLines={1}>
                  {doc.fileName}
                </Text>
                <Text style={styles.documentItemMeta}>
                  v{doc.version} • {new Date(doc.uploadedAt).toLocaleDateString('pl-PL')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyDocumentsText}>
            Brak dokumentów. {isOwner ? 'Dodaj pierwsze dokumenty w menadżerze.' : isInactiveTenant ? 'Nie ma dokumentów z Twojego okresu najmu.' : 'Dokumenty będą tutaj widoczne.'}
          </Text>
        )}

        <TouchableOpacity
          style={styles.documentsButton}
          onPress={() => setShowDocumentsManager(true)}
        >
          <View style={styles.documentsButtonContent}>
            <Ionicons name="folder-open" size={24} color={Colors.primary} />
            <View style={styles.documentsButtonText}>
              <Text style={styles.documentsButtonTitle}>
                {isInactiveTenant ? 'Przeglądaj dokumenty z Twojego najmu' : 'Otwórz menadżer dokumentów'}
              </Text>
              <Text style={styles.documentsButtonSubtitle}>
                {isOwner ? 'Zarządzaj wszystkimi typami dokumentów' : isInactiveTenant ? 'Tylko dokumenty z Twojego okresu wynajmu' : 'Przeglądaj dokumenty'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Właściciel - widoczny dla najemców */}
      {isTenant && property.owner && (
        <View style={styles.card}>
          <Text style={Typography.h3}>Właściciel</Text>
          <View style={styles.ownerInfo}>
            <View style={styles.ownerRow}>
              <Ionicons name="person" size={20} color={Colors.primary} />
              <Text style={styles.ownerName}>{property.owner.name}</Text>
            </View>
            {property.owner.email && (
              <TouchableOpacity 
                style={styles.ownerRow}
                onPress={() => Linking.openURL(`mailto:${property.owner?.email}`)}
              >
                <Ionicons name="mail" size={20} color={Colors.primary} />
                <Text style={styles.ownerContact}>{property.owner.email}</Text>
              </TouchableOpacity>
            )}
            {property.owner.phoneNumber && (
              <TouchableOpacity 
                style={styles.ownerRow}
                onPress={() => Linking.openURL(`tel:${property.owner?.phoneNumber}`)}
              >
                <Ionicons name="call" size={20} color={Colors.primary} />
                <Text style={styles.ownerContact}>{property.owner.phoneNumber}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Najemcy */}
      {isOwner && (
          <TouchableOpacity 
            style={styles.card}
            onPress={() => {
              navigation.navigate('Management', { tab: 'assign', propertyId: property.id });
            }}
            activeOpacity={0.7}
          >
            <View style={styles.tenantsHeader}>
              <Text style={Typography.h3}>Najemcy ({property.tenants?.length || 0})</Text>
              <View style={styles.editTenantsHint}>
                <Ionicons name="pencil" size={16} color={Colors.primary} />
                <Text style={styles.editTenantsText}>Zarządzaj</Text>
              </View>
            </View>
            {property.tenants && property.tenants.length > 0 ? (
              property.tenants.map((tenant, index) => (
                <View key={index} style={styles.tenantItem}>
                  <View style={styles.tenantAvatar}>
                    <Ionicons name="person" size={20} color={Colors.white} />
                  </View>
                  <View style={styles.tenantInfo}>
                    <Text style={styles.tenantName}>{capitalize(tenant.tenantName)}</Text>
                    <Text style={styles.tenantDate}>
                      {new Date(tenant.startDate).toLocaleDateString('pl-PL')}
                      {tenant.endDate ? ` - ${new Date(tenant.endDate).toLocaleDateString('pl-PL')}` : ' - obecnie'}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.noTenantsContainer}>
                <Ionicons name="person-add-outline" size={32} color={Colors.textSecondary} />
                <Text style={styles.noTenantsText}>Brak przypisanych najemców</Text>
                <Text style={styles.noTenantsHint}>Kliknij, aby przypisać najemcę</Text>
              </View>
            )}
          </TouchableOpacity>
      )}

      {/* Najemcy - widok dla najemcy (nie właściciela) */}
      {!isOwner && property.tenants && property.tenants.length > 0 && (
          <View style={styles.card}>
            <View style={styles.tenantsHeader}>
              <Text style={Typography.h3}>Najemcy ({property.tenants.length})</Text>
            </View>
            {property.tenants.map((tenant, index) => (
              <View key={index} style={styles.tenantItem}>
                <View style={styles.tenantAvatar}>
                  <Ionicons name="person" size={20} color={Colors.white} />
                </View>
                <View style={styles.tenantInfo}>
                  <Text style={styles.tenantName}>{capitalize(tenant.tenantName)}</Text>
                  <Text style={styles.tenantDate}>
                    {new Date(tenant.startDate).toLocaleDateString('pl-PL')}
                    {tenant.endDate ? ` - ${new Date(tenant.endDate).toLocaleDateString('pl-PL')}` : ' - obecnie'}
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
          
          {property.photos && property.photos.length > 1 && (
            <>
              <TouchableOpacity
                style={styles.lightboxNavLeft}
                onPress={() => {
                  const newIndex = (lightboxIndex - 1 + property.photos!.length) % property.photos!.length;
                  setLightboxIndex(newIndex);
                  setSelectedPhoto(property.photos![newIndex]);
                }}
              >
                <Ionicons name="chevron-back" size={40} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.lightboxNavRight}
                onPress={() => {
                  const newIndex = (lightboxIndex + 1) % property.photos!.length;
                  setLightboxIndex(newIndex);
                  setSelectedPhoto(property.photos![newIndex]);
                }}
              >
                <Ionicons name="chevron-forward" size={40} color="#fff" />
              </TouchableOpacity>
            </>
          )}
          
          {selectedPhoto && (
            <>
              <Image
                source={{ uri: selectedPhoto }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />
              {property.photos && property.photos.length > 1 && (
                <View style={styles.lightboxCounter}>
                  <Text style={styles.lightboxCounterText}>
                    {lightboxIndex + 1} / {property.photos.length}
                  </Text>
                </View>
              )}
            </>
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

      {/* Documents Manager Modal */}
      <Modal
        visible={showDocumentsManager}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowDocumentsManager(false)}
      >
        <PropertyDocumentsManager 
          propertyId={propertyId}
          onClose={() => setShowDocumentsManager(false)}
          onDocumentsChanged={loadLatestDocuments}
        />
      </Modal>

      {/* Document Preview Modal */}
      <Modal
        visible={showDocPreview}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDocPreview(false)}
      >
        <View style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <View style={styles.previewHeaderInfo}>
              <Text style={styles.previewTitle}>{previewDocument?.fileName}</Text>
              <Text style={styles.previewMeta}>
                {previewDocument?.documentType} • Wersja {previewDocument?.version}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.previewCloseButton}
              onPress={() => setShowDocPreview(false)}
            >
              <Ionicons name="close" size={28} color={'#FFFFFF'} />
            </TouchableOpacity>
          </View>

          <View style={styles.previewContent}>
            {previewDocument && isImageFile(previewDocument.fileName) ? (
              <Image
                source={{ uri: getDocumentUrl(previewDocument.fileUrl) }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            ) : previewDocument?.fileName.toLowerCase().endsWith('.pdf') ? (
              Platform.OS === 'web' ? (
                <iframe
                  src={getDocumentUrl(previewDocument.fileUrl)}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                  title="PDF Preview"
                />
              ) : (
                <View style={styles.previewPdfContainer}>
                  <Ionicons name="document-text" size={80} color={'#FFFFFF'} />
                  <Text style={styles.previewPdfText}>
                    Podgląd PDF dostępny po otwarciu
                  </Text>
                  <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={() => {
                      const url = getDocumentUrl(previewDocument?.fileUrl);
                      Linking.openURL(url);
                    }}
                  >
                    <Ionicons name="open" size={20} color={'#FFFFFF'} />
                    <Text style={styles.downloadButtonText}>Otwórz dokument</Text>
                  </TouchableOpacity>
                </View>
              )
            ) : (
              <View style={styles.previewPdfContainer}>
                <Ionicons name="document-text" size={80} color={'#FFFFFF'} />
                <Text style={styles.previewPdfText}>
                  Podgląd niedostępny dla tego typu pliku
                </Text>
                <TouchableOpacity
                  style={styles.downloadButton}
                  onPress={() => {
                    const url = getDocumentUrl(previewDocument?.fileUrl);
                    if (Platform.OS === 'web') {
                      window.open(url, '_blank');
                    } else {
                      Linking.openURL(url);
                    }
                  }}
                >
                  <Ionicons name="download" size={20} color={'#FFFFFF'} />
                  <Text style={styles.downloadButtonText}>Pobierz dokument</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
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
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: Spacing.s,
  },
  editButton: {
    padding: Spacing.s,
  },
  deleteButton: {
    padding: Spacing.s,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: Spacing.l,
    marginTop: Spacing.l,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
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
    marginTop: Spacing.l,
  },
  description: {
    fontSize: 14,
    color: Colors.text,
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  label: {
    ...Typography.body,
    fontWeight: '600',
    marginTop: Spacing.m,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.m,
    backgroundColor: Colors.background,
    fontSize: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  photosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.m,
  },
  addPhotoButton: {
    padding: Spacing.s,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.s,
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
  mainPhotoContainer: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#F0F0F0',
  },
  mainPhoto: {
    width: '100%',
    height: '100%',
  },
  mainPhotoDeleteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  thumbnailsContainer: {
    flexDirection: 'row',
  },
  thumbnailContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#F0F0F0',
  },
  thumbnailSelected: {
    borderColor: Colors.primary,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailDeleteButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
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
    gap: 12,
    padding: 12,
    marginTop: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
  },
  tenantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tenantsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editTenantsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editTenantsText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
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
    padding: Spacing.s,
  },
  noTenantsContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.l,
    gap: 8,
  },
  noTenantsText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  noTenantsHint: {
    fontSize: 13,
    color: Colors.primary,
  },
  ownerInfo: {
    marginTop: Spacing.m,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: Spacing.m,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  ownerContact: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  lightboxNavLeft: {
    position: 'absolute',
    left: 20,
    top: '50%',
    zIndex: 10,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  lightboxNavRight: {
    position: 'absolute',
    right: 20,
    top: '50%',
    zIndex: 10,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  lightboxCounter: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  lightboxCounterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  lightboxImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  documentsContainer: {
    gap: Spacing.s,
  },
  documentListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.m,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.m,
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
    padding: Spacing.s,
  },
  documentPreviewPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.l,
  },
  documentPreviewText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginTop: Spacing.m,
  },
  downloadButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.m,
    borderRadius: 8,
    marginTop: Spacing.l,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.m,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  inactiveWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff5f5',
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
    padding: Spacing.m,
    marginHorizontal: Spacing.m,
    marginBottom: Spacing.m,
    borderRadius: 8,
    gap: Spacing.s,
  },
  inactiveWarningText: {
    flex: 1,
  },
  inactiveWarningTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.error,
    marginBottom: 4,
  },
  inactiveWarningSubtitle: {
    fontSize: 13,
    color: '#b91c1c',
    lineHeight: 18,
  },
  documentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 12,
  },
  documentsButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.m,
    flex: 1,
  },
  documentsButtonText: {
    flex: 1,
  },
  documentsButtonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  documentsButtonSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  documentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.m,
    marginBottom: Spacing.m,
  },
  documentItem: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  documentItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  documentItemType: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  documentItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  documentItemMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  emptyDocumentsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.l,
    fontStyle: 'italic',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.l,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  previewHeaderInfo: {
    flex: 1,
    marginRight: Spacing.m,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  previewMeta: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  previewCloseButton: {
    padding: Spacing.s,
    zIndex: 1000,
  },
  previewContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewPdfContainer: {
    alignItems: 'center',
    gap: Spacing.l,
  },
  previewPdfText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  closeManagerButton: {
    position: 'absolute',
    bottom: 40,
    left: Spacing.l,
    right: Spacing.l,
    backgroundColor: Colors.primary,
    padding: Spacing.l,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeManagerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

