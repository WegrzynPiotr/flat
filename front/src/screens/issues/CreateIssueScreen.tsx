import React, { useState } from 'react';
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
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import { createIssue } from '../../store/slices/issuesSlice';
import { AppDispatch, RootState } from '../../store/store';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';
import { Typography } from '../../styles/typography';
import { Ionicons } from '@expo/vector-icons';

const CATEGORIES = ['Hydraulika', 'Elektryka', 'Ogrzewanie', 'OknaIDrzwi', 'AGD', 'Inne'];
const PRIORITIES = ['Niska', 'Średnia', 'Wysoka', 'Krytyczna'];

export default function CreateIssueScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((state: RootState) => state.issues);
  const { user } = useSelector((state: RootState) => state.auth);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Inne');
  const [priority, setPriority] = useState('Średnia');
  const [photos, setPhotos] = useState<any[]>([]);
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0 && photos.length < 5) {
      // keep a flat array of picked assets so we can read photo.uri later
      setPhotos((prev) => [...prev, result.assets[0]]);
    }
  };

  const handleSubmit = async () => {
    const newErrors: typeof errors = {};
    
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!description.trim()) newErrors.description = 'Description is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      // Prosty payload - tylko potrzebne dane
      const photoUris = photos
        .map((photoAsset) => photoAsset?.uri)
        .filter((uri): uri is string => Boolean(uri));
      
      const issueData = {
        title,
        description,
        category,
        priority,
        propertyId: '00000000-0000-0000-0000-000000000000', // TODO: wybór nieruchomości przez użytkownika
        photos: photoUris
      };

      await dispatch(createIssue(issueData)).unwrap();
      Alert.alert('Success', 'Issue created successfully');
      navigation.navigate('IssuesList');
    } catch (err: any) {
      Alert.alert('Error', err || 'Failed to create issue');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
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
});
