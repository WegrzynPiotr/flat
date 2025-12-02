import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  Image,
  Pressable,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import { createIssue } from '../../store/slices/issuesSlice';
import { AppDispatch, RootState } from '../../store/store';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';
import { Typography } from '../../styles/typography';
import { Ionicons } from '@expo/vector-icons';
import { propertiesAPI } from '../../api/endpoints';
import { Property } from '../../types/api';

const CATEGORIES = ['Hydraulika', 'Elektryka', 'Ogrzewanie', 'OknaIDrzwi', 'AGD', 'Inne'];
const PRIORITIES = ['Niska', 'Średnia', 'Wysoka', 'Krytyczna'];

export default function CreateIssueScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((state: RootState) => state.issues);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Inne');
  const [priority, setPriority] = useState('Średnia');
  const [propertyId, setPropertyId] = useState<string>('');
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [errors, setErrors] = useState<{ title?: string; description?: string; propertyId?: string }>({});
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [showPropertyList, setShowPropertyList] = useState(false);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      setLoadingProperties(true);
      const response = await propertiesAPI.getAll();
      if (response.data) {
        setProperties(response.data);
        if (response.data.length > 0) {
          setPropertyId(response.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading properties:', error);
      Alert.alert('Error', 'Failed to load properties');
    } finally {
      setLoadingProperties(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0 && photos.length < 5) {
      setPhotos((prev) => [...prev, result.assets[0]]);
    }
  };

  const handleSubmit = async () => {
    console.log('🟡 handleSubmit started');
    const newErrors: typeof errors = {};

    if (!title.trim()) newErrors.title = 'Title is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!propertyId) newErrors.propertyId = 'Property is required';

    if (Object.keys(newErrors).length > 0) {
      console.log('🔴 Validation errors:', newErrors);
      setErrors(newErrors);
      return;
    }

    console.log('✅ Validation passed, creating FormData...');

    try {
      const formData = new FormData();
      formData.append('Title', title);
      formData.append('Description', description);
      formData.append('Category', category);
      formData.append('Priority', priority);
      formData.append('PropertyId', propertyId);

      console.log('📝 Basic fields added to FormData');

      // Handle file uploads differently for web vs native
      for (let i = 0; i < photos.length; i++) {
        const asset = photos[i];
        if (!asset.uri) {
          console.log(`⚠️ Photo ${i} has no URI, skipping`);
          continue;
        }

        const uriParts = asset.uri.split('.');
        const fileExtension = uriParts[uriParts.length - 1];
        const fileName = asset.fileName || `photo_${Date.now()}_${i}.${fileExtension}`;
        const mimeType = asset.mimeType || 'image/jpeg';

        try {
          // For web: blob URLs need to be fetched and converted to actual Blob
          if (asset.uri.startsWith('blob:')) {
            console.log('🌐 Web platform: fetching blob from URI...');
            const response = await fetch(asset.uri);
            const blob = await response.blob();
            console.log('✅ Blob fetched, size:', blob.size, 'type:', blob.type);
            formData.append('Photos', blob, fileName);
          } else {
            // For React Native mobile: use uri/name/type structure
            console.log('📱 Native platform: using uri structure');
            // @ts-ignore - React Native FormData typing
            formData.append('Photos', {
              uri: asset.uri,
              name: fileName,
              type: mimeType,
            });
          }
          
          console.log(`✅ Added photo to FormData:`, {
            uri: asset.uri.substring(0, 50) + '...',
            name: fileName,
            type: mimeType
          });
        } catch (photoError) {
          console.error(`🔴 Error processing photo ${i}:`, photoError);
          throw new Error(`Failed to process photo: ${photoError}`);
        }
      }

      // Debug: Check FormData content
      console.log('📦 Total photos in array:', photos.length);
      console.log('📤 Dispatching createIssue...');
      
      const result = await dispatch(createIssue(formData)).unwrap();
      console.log('🟢 Issue created successfully:', result);
      
      Alert.alert('Success', 'Issue created successfully');
      navigation.navigate('IssuesList');
    } catch (err: any) {
      console.error('🔴 Error creating issue:', err);
      console.error('🔴 Error stack:', err.stack);
      Alert.alert('Error', err?.message || err || 'Failed to create issue');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={Typography.label}>Nieruchomość *</Text>
          {loadingProperties ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : (
            <View>
              <Pressable
                style={[styles.input, styles.propertySelector, errors.propertyId && styles.inputError]}
                onPress={() => setShowPropertyList(!showPropertyList)}
              >
                <Text style={styles.propertySelectorText}>
                  {propertyId
                    ? properties.find((p) => p.id === propertyId)?.address || 'Wybierz nieruchomość'
                    : 'Wybierz nieruchomość'}
                </Text>
              </Pressable>
              {showPropertyList && (
                <View style={styles.propertyList}>
                  {properties.map((prop) => (
                    <Pressable
                      key={prop.id}
                      style={[
                        styles.propertyOption,
                        propertyId === prop.id && styles.propertyOptionSelected,
                      ]}
                      onPress={() => {
                        setPropertyId(prop.id);
                        setShowPropertyList(false);
                        setErrors({ ...errors, propertyId: undefined });
                      }}
                    >
                      <Text
                        style={[
                          styles.propertyOptionText,
                          propertyId === prop.id && styles.propertyOptionTextSelected,
                        ]}
                      >
                        {prop.address}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}
          {errors.propertyId && <Text style={styles.errorText}>{errors.propertyId}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={Typography.label}>Tytuł *</Text>
          <TextInput
            style={[styles.input, errors.title && styles.inputError]}
            placeholder="Np. Przecieka kran"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              setErrors({ ...errors, title: undefined });
            }}
            editable={!loading}
          />
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={Typography.label}>Opis *</Text>
          <TextInput
            style={[styles.input, styles.textarea, errors.description && styles.inputError]}
            placeholder="Opisz problem szczegółowo"
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              setErrors({ ...errors, description: undefined });
            }}
            multiline
            numberOfLines={4}
            editable={!loading}
          />
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={Typography.label}>Kategoria</Text>
            <View style={styles.picker}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.pickerItem,
                    category === cat && styles.pickerItemSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      category === cat && styles.pickerItemTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={Typography.label}>Priorytet</Text>
            <View style={styles.picker}>
              {PRIORITIES.map((pri) => (
                <TouchableOpacity
                  key={pri}
                  onPress={() => setPriority(pri)}
                  style={[
                    styles.pickerItem,
                    priority === pri && styles.pickerItemSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      priority === pri && styles.pickerItemTextSelected,
                    ]}
                  >
                    {pri}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={Typography.label}>Zdjęcia ({photos.length}/5)</Text>
          <TouchableOpacity
            style={styles.photoButton}
            onPress={pickImage}
            disabled={photos.length >= 5 || loading}
          >
            <Ionicons name="camera" size={24} color={Colors.primary} />
            <Text style={styles.photoButtonText}>Dodaj zdjęcie</Text>
          </TouchableOpacity>
          <View style={styles.photoGrid}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoItem}>
                <Image source={{ uri: photo.uri }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => setPhotos(photos.filter((_, i) => i !== index))}
                >
                  <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Zgłoś usterkę</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  form: {
    padding: Spacing.m,
    gap: Spacing.m,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.m,
    fontSize: 16,
    backgroundColor: Colors.surface,
  },
  textarea: {
    textAlignVertical: 'top',
    paddingTop: Spacing.m,
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.m,
  },
  picker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  pickerItem: {
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickerItemSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pickerItemText: {
    color: Colors.text,
    fontSize: 14,
  },
  pickerItemTextSelected: {
    color: '#fff',
  },
  photoButton: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: Spacing.l,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.s,
  },
  photoButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.s,
  },
  photoItem: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: Colors.disabled,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.m,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: Spacing.m,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  propertySelector: {
    justifyContent: 'center',
  },
  propertySelectorText: {
    color: Colors.text,
    fontSize: 16,
  },
  propertyList: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    marginTop: Spacing.xs,
    backgroundColor: Colors.surface,
    maxHeight: 200,
  },
  propertyOption: {
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  propertyOptionSelected: {
    backgroundColor: '#f0f0f0',
  },
  propertyOptionText: {
    color: Colors.text,
    fontSize: 16,
  },
  propertyOptionTextSelected: {
    fontWeight: 'bold',
    color: Colors.primary,
  },
});
