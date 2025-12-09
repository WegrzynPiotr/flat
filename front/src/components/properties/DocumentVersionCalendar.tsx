import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Image,
  Platform,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { propertyDocumentsAPI } from '../../api/endpoints';
import { PropertyDocumentVersion } from '../../types/api';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';
import { Typography } from '../../styles/typography';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://193.106.130.55:5162';

interface DocumentVersionCalendarProps {
  propertyId: string;
  documentType: string;
  onClose: () => void;
  onVersionDeleted: () => void;
  isOwner: boolean;
}

export default function DocumentVersionCalendar({
  propertyId,
  documentType,
  onClose,
  onVersionDeleted,
  isOwner,
}: DocumentVersionCalendarProps) {
  const [versions, setVersions] = useState<PropertyDocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<PropertyDocumentVersion | null>(null);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [showPreview, setShowPreview] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<PropertyDocumentVersion | null>(null);

  useEffect(() => {
    loadVersions();
  }, [propertyId, documentType]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const response = await propertyDocumentsAPI.getHistory(propertyId, documentType);
      setVersions(response.data);
      
      // Przygotuj zaznaczone daty
      const marks: any = {};
      response.data.forEach((version: PropertyDocumentVersion) => {
        const dateKey = version.uploadedAt.split('T')[0];
        marks[dateKey] = {
          marked: true,
          dotColor: version.isLatest ? Colors.primary : Colors.secondary,
          selected: false,
        };
      });
      setMarkedDates(marks);
    } catch (error) {
      console.error('Error loading versions:', error);
      Alert.alert('Błąd', 'Nie udało się załadować historii dokumentów');
    } finally {
      setLoading(false);
    }
  };

  const handleDatePress = (date: string) => {
    setSelectedDate(date);
    
    // Znajdź wszystkie wersje dla tej daty (może być więcej niż jedna)
    const versionsForDate = versions.filter(v => {
      const versionDate = v.uploadedAt.split('T')[0];
      return versionDate === date;
    });
    
    // Ustaw pierwszą wersję z tej daty lub null
    setSelectedVersion(versionsForDate.length > 0 ? versionsForDate[0] : null);
    
    // Zaktualizuj zaznaczenie na kalendarzu
    const newMarkedDates = { ...markedDates };
    Object.keys(newMarkedDates).forEach(key => {
      newMarkedDates[key].selected = key === date;
      newMarkedDates[key].selectedColor = Colors.primary;
    });
    setMarkedDates(newMarkedDates);
  };

  const handleVersionSelect = (version: PropertyDocumentVersion) => {
    setSelectedVersion(version);
  };

  const handleOpenDocument = (version: PropertyDocumentVersion) => {
    setPreviewVersion(version);
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

  const handleDeleteVersion = async (versionId: string) => {
    Alert.alert(
      'Usuń wersję',
      'Czy na pewno chcesz usunąć tę wersję dokumentu?',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: async () => {
            try {
              await propertyDocumentsAPI.delete(propertyId, versionId);
              Alert.alert('Sukces', 'Wersja dokumentu została usunięta');
              await loadVersions();
              onVersionDeleted();
              setSelectedVersion(null);
              setSelectedDate(null);
            } catch (error) {
              console.error('Error deleting version:', error);
              Alert.alert('Błąd', 'Nie udało się usunąć wersji');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={Typography.h2}>Historia wersji</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={Typography.h2}>Historia wersji</Text>
          <Text style={styles.subtitle}>{documentType}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {versions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>Brak historii dokumentów</Text>
          </View>
        ) : (
          <>
            <View style={styles.calendarContainer}>
              <Calendar
                markedDates={markedDates}
                onDayPress={(day) => handleDatePress(day.dateString)}
                theme={{
                  selectedDayBackgroundColor: Colors.primary,
                  todayTextColor: Colors.primary,
                  dotColor: Colors.primary,
                  arrowColor: Colors.primary,
                }}
                markingType="simple"
              />
              
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
                  <Text style={styles.legendText}>Najnowsza wersja</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.secondary }]} />
                  <Text style={styles.legendText}>Starsza wersja</Text>
                </View>
              </View>
            </View>

            {selectedVersion && (
              <View style={styles.versionDetails}>
                <View style={styles.versionHeader}>
                  <View style={styles.versionTitleRow}>
                    <Ionicons name="document-text" size={24} color={Colors.primary} />
                    <View style={styles.versionTitleContent}>
                      <Text style={styles.versionTitle}>Wersja {selectedVersion.version}</Text>
                      {selectedVersion.isLatest && (
                        <View style={styles.latestBadge}>
                          <Text style={styles.latestBadgeText}>Aktualna</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <View style={styles.versionInfo}>
                  <View style={styles.infoRow}>
                    <Ionicons name="document" size={16} color={Colors.textSecondary} />
                    <Text style={styles.infoText}>{selectedVersion.fileName}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar" size={16} color={Colors.textSecondary} />
                    <Text style={styles.infoText}>
                      {new Date(selectedVersion.uploadedAt).toLocaleString('pl-PL', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Ionicons name="person" size={16} color={Colors.textSecondary} />
                    <Text style={styles.infoText}>{selectedVersion.uploadedByName}</Text>
                  </View>

                  {selectedVersion.notes && (
                    <View style={styles.notesContainer}>
                      <Text style={styles.notesLabel}>Notatki:</Text>
                      <Text style={styles.notesText}>{selectedVersion.notes}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.versionActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.viewBtn]}
                    onPress={() => handleOpenDocument(selectedVersion)}
                  >
                    <Ionicons name="eye" size={20} color={Colors.white} />
                    <Text style={styles.actionBtnText}>Otwórz</Text>
                  </TouchableOpacity>
                  
                  {isOwner && !selectedVersion.isLatest && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.deleteBtn]}
                      onPress={() => handleDeleteVersion(selectedVersion.id)}
                    >
                      <Ionicons name="trash" size={20} color={Colors.white} />
                      <Text style={styles.actionBtnText}>Usuń</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Lista wszystkich wersji */}
            <View style={styles.allVersionsContainer}>
              <Text style={styles.sectionTitle}>Wszystkie wersje ({versions.length})</Text>
              
              {versions.map((version) => (
                <TouchableOpacity
                  key={version.id}
                  style={[
                    styles.versionItem,
                    selectedVersion?.id === version.id && styles.versionItemSelected,
                  ]}
                  onPress={() => handleVersionSelect(version)}
                >
                  <View style={styles.versionItemHeader}>
                    <View style={styles.versionItemTitle}>
                      <Text style={styles.versionNumber}>v{version.version}</Text>
                      {version.isLatest && (
                        <View style={styles.smallBadge}>
                          <Text style={styles.smallBadgeText}>Aktualna</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.versionItemDate}>
                      {new Date(version.uploadedAt).toLocaleDateString('pl-PL')}
                    </Text>
                  </View>
                  <Text style={styles.versionItemFile} numberOfLines={1}>
                    {version.fileName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>

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
              <Text style={styles.previewTitle}>{previewVersion?.fileName}</Text>
              <Text style={styles.previewMeta}>
                {previewVersion?.documentType} • Wersja {previewVersion?.version}
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
            {previewVersion && isImageFile(previewVersion.fileName) ? (
              <Image
                source={{ uri: getDocumentUrl(previewVersion.fileUrl) }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            ) : previewVersion?.fileName.toLowerCase().endsWith('.pdf') ? (
              Platform.OS === 'web' ? (
                <iframe
                  src={getDocumentUrl(previewVersion.fileUrl)}
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
                      const url = getDocumentUrl(previewVersion?.fileUrl || '');
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
                    const url = getDocumentUrl(previewVersion?.fileUrl || '');
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.l,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  closeButton: {
    padding: Spacing.s,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    marginTop: Spacing.xxl,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.m,
  },
  calendarContainer: {
    backgroundColor: Colors.white,
    padding: Spacing.m,
    marginBottom: Spacing.m,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.l,
    marginTop: Spacing.m,
    paddingTop: Spacing.m,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    ...Typography.body,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  versionDetails: {
    backgroundColor: Colors.white,
    margin: Spacing.m,
    marginTop: 0,
    borderRadius: 12,
    padding: Spacing.m,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  versionHeader: {
    marginBottom: Spacing.m,
  },
  versionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
  },
  versionTitleContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
  },
  versionTitle: {
    ...Typography.h3,
    fontSize: 18,
  },
  latestBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.s,
    paddingVertical: 4,
    borderRadius: 12,
  },
  latestBadgeText: {
    ...Typography.bodyBold,
    fontSize: 11,
    color: Colors.white,
  },
  versionInfo: {
    gap: Spacing.s,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
  },
  infoText: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  notesContainer: {
    marginTop: Spacing.s,
    padding: Spacing.m,
    backgroundColor: Colors.surface,
    borderRadius: 8,
  },
  notesLabel: {
    ...Typography.bodyBold,
    fontSize: 13,
    marginBottom: Spacing.xs,
  },
  notesText: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.text,
  },
  versionActions: {
    flexDirection: 'row',
    gap: Spacing.s,
    marginTop: Spacing.m,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.m,
    borderRadius: 8,
  },
  viewBtn: {
    backgroundColor: Colors.primary,
  },
  deleteBtn: {
    backgroundColor: Colors.error,
  },
  actionBtnText: {
    ...Typography.bodyBold,
    color: Colors.white,
  },
  allVersionsContainer: {
    backgroundColor: Colors.white,
    margin: Spacing.m,
    marginTop: 0,
    borderRadius: 12,
    padding: Spacing.m,
  },
  sectionTitle: {
    ...Typography.h3,
    fontSize: 16,
    marginBottom: Spacing.m,
  },
  versionItem: {
    padding: Spacing.m,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.s,
  },
  versionItemSelected: {
    backgroundColor: Colors.primary + '20',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  versionItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  versionItemTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
  },
  versionNumber: {
    ...Typography.bodyBold,
    fontSize: 14,
  },
  smallBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  smallBadgeText: {
    ...Typography.bodyBold,
    fontSize: 10,
    color: Colors.white,
  },
  versionItemDate: {
    ...Typography.body,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  versionItemFile: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.text,
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
