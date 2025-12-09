import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { propertyDocumentsAPI } from '../../api/endpoints';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';
import { Typography } from '../../styles/typography';
import DocumentVersionCalendar from './DocumentVersionCalendar';
import Constants from 'expo-constants';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

const API_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://193.106.130.55:5162';

// Typy dokumentów
const DOCUMENT_TYPES = [
  { key: 'Umowa', label: 'Umowa najmu', icon: 'document-text' },
  { key: 'Wodomierz', label: 'Wodomierz', icon: 'water' },
  { key: 'Prąd', label: 'Licznik prądu', icon: 'flash' },
  { key: 'Gaz', label: 'Licznik gazu', icon: 'flame' },
  { key: 'Ogrzewanie', label: 'Ogrzewanie', icon: 'thermometer' },
  { key: 'Ubezpieczenie', label: 'Ubezpieczenie', icon: 'shield-checkmark' },
  { key: 'Remont', label: 'Dokumenty remontu', icon: 'construct' },
  { key: 'Inne', label: 'Inne dokumenty', icon: 'folder' },
];

interface PropertyDocumentsManagerProps {
  propertyId: string;
  onClose?: () => void;
  onDocumentsChanged?: () => void;
}

export default function PropertyDocumentsManager({ propertyId, onClose, onDocumentsChanged }: PropertyDocumentsManagerProps) {
  const user = useSelector((state: RootState) => state.auth.user);
  const isOwner = user?.role === 'Wlasciciel';
  
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDocType, setCalendarDocType] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [propertyId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await propertyDocumentsAPI.getLatest(propertyId);
      setDocuments(response.data);
    } catch (error: any) {
      console.error('Error loading documents:', error);
      Alert.alert('Błąd', 'Nie udało się załadować dokumentów');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDocument = async (documentType: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      
      console.log('📤 Uploading document:', {
        documentType,
        name: file.name,
        uri: file.uri,
        mimeType: file.mimeType,
        size: file.size,
      });
      
      setUploading(true);
      
      // Convert React Native file URI to Blob for web compatibility
      console.log('🔄 Converting file to Blob...');
      const fileBlob = await fetch(file.uri).then(r => r.blob());
      console.log('✅ Blob created:', { type: fileBlob.type, size: fileBlob.size });
      
      // Tworzenie obiektu FormData poprawnie dla przeglądarki
      const formData: any = new FormData();
      formData.append('file', fileBlob, file.name);

      console.log('📤 Calling API with documentType:', documentType);
      
      // Wywołanie API - axios automatycznie zakoduje URL
      const response = await propertyDocumentsAPI.upload(propertyId, documentType, formData);
      
      console.log('✅ Upload successful:', response.data);
      
      Alert.alert('Sukces', 'Dokument został dodany');
      await loadDocuments();
      // Powiadom rodzica o zmianie dokumentów
      onDocumentsChanged?.();
    } catch (error: any) {
      console.error('❌ Error uploading document:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      Alert.alert('Błąd', error.response?.data?.error || error.response?.data?.message || 'Nie udało się przesłać dokumentu');
    } finally {
      setUploading(false);
    }
  };

  const openCalendar = (documentType: string) => {
    setCalendarDocType(documentType);
    setShowCalendar(true);
  };

  const handlePreviewDocument = (document: any) => {
    setPreviewDocument(document);
    setShowPreview(true);
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

  const getDocumentForType = (type: string) => {
    return documents.find(doc => doc.documentType === type);
  };

  const renderDocumentCard = (docType: any) => {
    const document = getDocumentForType(docType.key);

    return (
      <View key={docType.key} style={styles.documentCard}>
        <View style={styles.documentHeader}>
          <View style={styles.documentTitleRow}>
            <Ionicons name={docType.icon as any} size={24} color={Colors.primary} />
            <Text style={styles.documentTitle}>{docType.label}</Text>
          </View>
          
          <TouchableOpacity
            style={[
              styles.calendarButton,
              !document && styles.calendarButtonDisabled
            ]}
            onPress={() => openCalendar(docType.key)}
            disabled={!document}
          >
            <Ionicons 
              name="calendar" 
              size={20} 
              color={document ? Colors.primary : Colors.textSecondary} 
            />
            <Text style={[
              styles.calendarButtonText,
              !document && styles.calendarButtonTextDisabled
            ]}>
              Historia
            </Text>
          </TouchableOpacity>
        </View>

        {document ? (
          <View style={styles.documentInfo}>
            <Text style={styles.fileName} numberOfLines={1}>
              {document.fileName}
            </Text>
            <Text style={styles.documentMeta}>
              Wersja {document.version} • {new Date(document.uploadedAt).toLocaleDateString('pl-PL')}
            </Text>
            <Text style={styles.uploadedBy}>
              Dodał: {document.uploadedByName}
            </Text>
            
            <View style={styles.documentActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handlePreviewDocument(document)}
              >
                <Ionicons name="eye" size={18} color={Colors.primary} />
                <Text style={styles.actionButtonText}>Podgląd</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.uploadButton]}
                onPress={() => handleUploadDocument(docType.key)}
                disabled={uploading}
              >
                <Ionicons name="cloud-upload" size={18} color={Colors.primary} />
                <Text style={styles.actionButtonText}>Nowa wersja</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.uploadPlaceholder}
            onPress={() => handleUploadDocument(docType.key)}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={40} color={Colors.textSecondary} />
                <Text style={styles.placeholderText}>Dodaj dokument</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={Typography.h2}>Dokumenty mieszkania</Text>
          {onClose && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={28} color={Colors.text} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.subtitle}>
          Zarządzaj dokumentami z wersjonowaniem
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {DOCUMENT_TYPES.map(docType => renderDocumentCard(docType))}
        
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Modal kalendarza z wersjami */}
      <Modal
        visible={showCalendar && calendarDocType !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCalendar(false)}
      >
        {calendarDocType && (
          <DocumentVersionCalendar
            propertyId={propertyId}
            documentType={calendarDocType}
            onClose={() => setShowCalendar(false)}
            onVersionDeleted={() => {
              loadDocuments();
              onDocumentsChanged?.();
            }}
            isOwner={isOwner}
          />
        )}
      </Modal>

      {/* Modal podglądu dokumentu */}
      <Modal
        visible={showPreview}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowPreview(false)}
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
              onPress={() => setShowPreview(false)}
            >
              <Ionicons name="close" size={28} color={Colors.white} />
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
                  <Ionicons name="document-text" size={80} color={Colors.white} />
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
                    <Ionicons name="open" size={20} color={Colors.white} />
                    <Text style={styles.downloadButtonText}>Otwórz dokument</Text>
                  </TouchableOpacity>
                </View>
              )
            ) : (
              <View style={styles.previewPdfContainer}>
                <Ionicons name="document-text" size={80} color={Colors.white} />
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
                  <Ionicons name="download" size={20} color={Colors.white} />
                  <Text style={styles.downloadButtonText}>Pobierz dokument</Text>
                </TouchableOpacity>
              </View>
            )}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: Spacing.l,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    padding: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  documentCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.m,
    marginTop: Spacing.m,
    borderRadius: 12,
    padding: Spacing.m,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.m,
  },
  documentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
  },
  documentTitle: {
    ...Typography.h3,
    fontSize: 16,
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.s,
    paddingHorizontal: Spacing.m,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  calendarButtonDisabled: {
    backgroundColor: Colors.border,
    borderColor: Colors.border,
  },
  calendarButtonText: {
    ...Typography.bodyBold,
    fontSize: 13,
    color: Colors.primary,
  },
  calendarButtonTextDisabled: {
    color: Colors.textSecondary,
  },
  documentInfo: {
    gap: Spacing.xs,
  },
  fileName: {
    ...Typography.bodyBold,
    fontSize: 15,
  },
  documentMeta: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  uploadedBy: {
    ...Typography.body,
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  documentActions: {
    flexDirection: 'row',
    gap: Spacing.s,
    marginTop: Spacing.m,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.m,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  uploadButton: {
    borderColor: Colors.primary,
  },
  actionButtonText: {
    ...Typography.bodyBold,
    fontSize: 13,
    color: Colors.primary,
  },
  uploadPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  placeholderText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.s,
  },
  bottomSpacer: {
    height: Spacing.xl,
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
    ...Typography.h3,
    color: Colors.white,
    fontSize: 16,
    marginBottom: 4,
  },
  previewMeta: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
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
    ...Typography.body,
    color: Colors.white,
    fontSize: 16,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.m,
    paddingHorizontal: Spacing.xl,
    borderRadius: 8,
    marginTop: Spacing.m,
  },
  downloadButtonText: {
    ...Typography.bodyBold,
    color: Colors.white,
    fontSize: 15,
  },
});
