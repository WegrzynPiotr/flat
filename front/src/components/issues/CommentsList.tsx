import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { commentsAPI, serviceRequestsAPI } from '../../api/endpoints';
import { CommentResponse, IssueResponse, ServiceRequestHistoryItem } from '../../types/api';
import { RootState } from '../../store/store';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';
import { Typography } from '../../styles/typography';

interface CommentsListProps {
  issueId: string;
  issue: IssueResponse;
  onPhotoAdded: () => void;
  uploadingPhoto: boolean;
  onIssueUpdated?: () => void;
  disableComments?: boolean; // Jeśli true, ukrywa input komentarza (np. dla serwisanta który nie zaakceptował jeszcze zaproszenia)
}

interface HistoryItem {
  id: string;
  type: 'created' | 'serviceman' | 'serviceman_resigned' | 'serviceman_cancelled' | 'status' | 'comment' | 'photo' | 'addPhoto';
  date: string;
  data: any;
}

export default function CommentsList({ issueId, issue, onPhotoAdded, uploadingPhoto, onIssueUpdated, disableComments }: CommentsListProps) {
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [serviceRequestHistory, setServiceRequestHistory] = useState<ServiceRequestHistoryItem[]>([]);
  
  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const isOwner = userRole === 'Wlasciciel' && issue?.property?.ownerId === userId;

  useEffect(() => {
    loadComments();
    if (isOwner) {
      loadServiceRequestHistory();
    }
  }, [issueId]);

  useEffect(() => {
    buildHistory();
  }, [comments, issue, serviceRequestHistory]);

  const loadServiceRequestHistory = async () => {
    try {
      const response = await serviceRequestsAPI.getForIssue(issueId);
      setServiceRequestHistory(response.data);
    } catch (error) {
      console.log('Failed to load service request history:', error);
    }
  };

  const buildHistory = () => {
    const items: HistoryItem[] = [];

    // Zgłoszenie utworzone
    items.push({
      id: `created-${issue.id}`,
      type: 'created',
      date: issue.reportedAt,
      data: {
        reportedByName: issue.reportedByName || 'Nieznany użytkownik',
      },
    });

    // Historia serwisantów z ServiceRequests (dla właściciela)
    if (isOwner && serviceRequestHistory.length > 0) {
      serviceRequestHistory.forEach((request) => {
        // Dodaj wpis tylko o zaakceptowanych, zrezygnowanych i anulowanych (usunięcie serwisanta)
        // Odrzucone zaproszenia nie powinny pojawiać się w historii zgłoszenia
        if (request.status === 'Zaakceptowane') {
          items.push({
            id: `serviceman-accepted-${request.id}`,
            type: 'serviceman',
            date: request.respondedAt || request.createdAt,
            data: {
              servicemanId: request.servicemanId,
              servicemanName: request.servicemanName,
              servicemanFirstName: request.servicemanFirstName,
              servicemanLastName: request.servicemanLastName,
              assignedAt: request.respondedAt || request.createdAt,
            },
          });
        } else if (request.status === 'Zrezygnowano') {
          items.push({
            id: `serviceman-resigned-${request.id}`,
            type: 'serviceman_resigned',
            date: request.respondedAt || request.createdAt,
            data: {
              servicemanName: request.servicemanName,
              responseMessage: request.responseMessage,
              respondedAt: request.respondedAt,
            },
          });
        } else if (request.status === 'Anulowane' && request.responseMessage) {
          // Tylko anulowane z wiadomością (usunięcie serwisanta po akceptacji)
          // Anulowanie oczekującego zaproszenia nie powinno się pokazywać
          items.push({
            id: `serviceman-cancelled-${request.id}`,
            type: 'serviceman_cancelled',
            date: request.respondedAt || request.createdAt,
            data: {
              servicemanName: request.servicemanName,
              responseMessage: request.responseMessage,
              respondedAt: request.respondedAt,
            },
          });
        }
      });
    } else if (issue.assignedServicemen) {
      // Fallback dla nie-właścicieli - pokazuj tylko przypisanych serwisantów
      issue.assignedServicemen.forEach((serviceman) => {
        items.push({
          id: `serviceman-${serviceman.servicemanId}`,
          type: 'serviceman',
          date: serviceman.assignedAt,
          data: serviceman,
        });
      });
    }

    // Komentarze
    comments.forEach((comment) => {
      items.push({
        id: `comment-${comment.id}`,
        type: 'comment',
        date: comment.createdAt,
        data: comment,
      });
    });

    // Zdjęcia z metadanymi
    if (issue.photosWithMetadata) {
      issue.photosWithMetadata.forEach((photo) => {
        items.push({
          id: `photo-${photo.id}`,
          type: 'photo',
          date: photo.uploadedAt,
          data: photo,
        });
      });
    }

    // Status (jeśli jest rozwiązane lub ma inny status)
    if (issue.status && issue.status !== 'Nowe') {
      items.push({
        id: `status-${issue.id}`,
        type: 'status',
        date: issue.resolvedAt || issue.reportedAt,
        data: { status: issue.status },
      });
    }

    // Przycisk dodawania zdjęć (zawsze na końcu)
    items.push({
      id: 'add-photo',
      type: 'addPhoto',
      date: new Date().toISOString(),
      data: {},
    });

    // Sortuj chronologicznie (oprócz przycisku dodawania zdjęć)
    const sortedItems = items
      .filter(item => item.type !== 'addPhoto')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Dodaj przycisk na końcu
    const addPhotoItem = items.find(item => item.type === 'addPhoto');
    if (addPhotoItem) {
      sortedItems.push(addPhotoItem);
    }

    setHistoryItems(sortedItems);
  };

  const loadComments = async () => {
    setLoading(true);
    try {
      const response = await commentsAPI.getByIssue(issueId);
      setComments(response.data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const response = await commentsAPI.create(issueId, newComment.trim());
      setComments([...comments, response.data]);
      setNewComment('');
      
      // Jeśli status się zmienił (np. wznowiono zgłoszenie), odśwież issue
      if (response.data.statusChanged && onIssueUpdated) {
        onIssueUpdated();
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
      alert('Nie udało się dodać komentarza');
    } finally {
      setSubmitting(false);
    }
  };

  const renderHistoryItem = ({ item }: { item: HistoryItem }) => {
    switch (item.type) {
      case 'created':
        return (
          <View style={styles.historyItem}>
            <View style={[styles.historyDot, styles.dotCreated]} />
            <View style={styles.historyContent}>
              <Text style={styles.historyText}>
                Zgłoszenie utworzone przez <Text style={styles.historyBold}>{item.data.reportedByName}</Text>
              </Text>
              <Text style={styles.historyDate}>
                {new Date(item.date).toLocaleString('pl-PL', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          </View>
        );

      case 'serviceman':
        return (
          <View style={styles.historyItem}>
            <View style={[styles.historyDot, styles.dotServiceman]} />
            <View style={styles.historyContent}>
              <Text style={styles.historyText}>
                Przypisano serwisanta: <Text style={styles.historyBold}>{item.data.servicemanName}</Text>
              </Text>
              <Text style={styles.historyDate}>
                {new Date(item.date).toLocaleString('pl-PL', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          </View>
        );

      case 'serviceman_resigned':
        return (
          <View style={styles.historyItem}>
            <View style={[styles.historyDot, { backgroundColor: '#f59e0b' }]} />
            <View style={styles.historyContent}>
              <Text style={styles.historyText}>
                <Text style={styles.historyBold}>{item.data.servicemanName}</Text> zrezygnował ze zgłoszenia
              </Text>
              {item.data.responseMessage && (
                <Text style={styles.historySubtext}>Powód: {item.data.responseMessage}</Text>
              )}
              <Text style={styles.historyDate}>
                {new Date(item.date).toLocaleString('pl-PL', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          </View>
        );

      case 'serviceman_cancelled':
        return (
          <View style={styles.historyItem}>
            <View style={[styles.historyDot, { backgroundColor: '#6b7280' }]} />
            <View style={styles.historyContent}>
              <Text style={styles.historyText}>
                Anulowano przypisanie serwisanta: <Text style={styles.historyBold}>{item.data.servicemanName}</Text>
              </Text>
              {item.data.responseMessage && (
                <Text style={styles.historySubtext}>Powód: {item.data.responseMessage}</Text>
              )}
              <Text style={styles.historyDate}>
                {new Date(item.date).toLocaleString('pl-PL', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          </View>
        );

      case 'comment':
        // Sprawdź czy to systemowa wiadomość o zmianie statusu
        const isStatusChange = item.data.content?.includes('Status zmieniony');
        
        if (isStatusChange) {
          // Wyciągnij nazwy statusów z tekstu
          const statusMatch = item.data.content.match(/Status zmieniony z "([^"]+)" na "([^"]+)"/);
          const newStatus = statusMatch ? statusMatch[2] : '';
          
          const getStatusColor = (status: string) => {
            switch (status) {
              case 'Rozwiązane':
                return '#10b981'; // zielony
              case 'W trakcie':
                return '#3b82f6'; // niebieski
              case 'Przypisane':
                return '#8b5cf6'; // fioletowy
              case 'Oczekuje na części':
                return '#f59e0b'; // pomarańczowy
              default:
                return '#6b7280'; // szary
            }
          };

          return (
            <View style={styles.historyItem}>
              <View style={[styles.historyDot, { backgroundColor: getStatusColor(newStatus) }]} />
              <View style={styles.historyContent}>
                <Text style={styles.historyText}>
                  {item.data.content.replace(/Status zmieniony z "([^"]+)" na "([^"]+)"/, (match, oldStatus, newStatus) => 
                    `Status zmieniony z "${oldStatus}" na "${newStatus}"`
                  )}
                </Text>
                <Text style={styles.historyDate}>
                  {new Date(item.date).toLocaleString('pl-PL', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            </View>
          );
        }
        
        // Zwykły komentarz
        return (
          <View style={styles.commentCard}>
            <View style={styles.commentHeader}>
              <View style={styles.commentHeaderLeft}>
                <Ionicons name="chatbubble" size={16} color={Colors.primary} style={styles.commentIcon} />
                <Text style={styles.authorName}>{item.data.authorName}</Text>
                <Text style={styles.authorRole}>{item.data.authorRole}</Text>
              </View>
            </View>
            <Text style={styles.commentContent}>{item.data.content}</Text>
            <Text style={styles.commentDate}>
              {new Date(item.date).toLocaleString('pl-PL')}
            </Text>
          </View>
        );

      case 'photo':
        return (
          <View style={styles.photoHistoryItem}>
            <View style={styles.historyItem}>
              <View style={[styles.historyDot, styles.dotPhoto]} />
              <View style={styles.historyContent}>
                <Text style={styles.historyText}>
                  Dodano zdjęcie przez <Text style={styles.historyBold}>{item.data.uploadedByName}</Text>
                </Text>
                <Text style={styles.historyDate}>
                  {new Date(item.date).toLocaleString('pl-PL', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              onPress={() => setSelectedImage(item.data.url)}
              activeOpacity={0.9}
            >
              <Image 
                source={{ uri: item.data.url }} 
                style={styles.historyPhoto}
                resizeMode="cover"
              />
            </TouchableOpacity>
          </View>
        );

      case 'status':
        const getStatusColor = (status: string) => {
          switch (status) {
            case 'Rozwiązane':
              return '#10b981'; // zielony
            case 'W trakcie':
              return '#3b82f6'; // niebieski
            case 'Przypisane':
              return '#8b5cf6'; // fioletowy
            default:
              return '#6b7280'; // szary
          }
        };

        const getStatusText = (status: string) => {
          switch (status) {
            case 'Rozwiązane':
              return 'Usterka rozwiązana';
            case 'W trakcie':
              return 'Status zmieniony na: W trakcie';
            case 'Przypisane':
              return 'Status zmieniony na: Przypisane';
            default:
              return `Status zmieniony na: ${status}`;
          }
        };

        return (
          <View style={styles.historyItem}>
            <View style={[styles.historyDot, { backgroundColor: getStatusColor(item.data.status) }]} />
            <View style={styles.historyContent}>
              <Text style={styles.historyText}>
                {getStatusText(item.data.status)}
              </Text>
              <Text style={styles.historyDate}>
                {new Date(item.date).toLocaleString('pl-PL', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          </View>
        );

      case 'addPhoto':
        return (
          <TouchableOpacity
            style={styles.addPhotoButton}
            onPress={onPhotoAdded}
            disabled={uploadingPhoto}
            activeOpacity={0.7}
          >
            {uploadingPhoto ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <Ionicons name="camera" size={24} color={Colors.primary} />
                <Text style={styles.addPhotoText}>Dodaj zdjęcie do historii</Text>
              </>
            )}
          </TouchableOpacity>
        );

      default:
        return null;
    }
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
      <Text style={Typography.h3}>Historia zgłoszenia</Text>
      
      <FlatList
        data={historyItems}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Brak historii</Text>
        }
      />

      {disableComments ? (
        <View style={styles.disabledCommentsContainer}>
          <Ionicons name="lock-closed" size={20} color={Colors.textSecondary} />
          <Text style={styles.disabledCommentsText}>
            Musisz zaakceptować zaproszenie, aby móc dodawać komentarze
          </Text>
        </View>
      ) : (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Dodaj komentarz..."
            value={newComment}
            onChangeText={setNewComment}
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting || !newComment.trim()}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Wysyłam...' : 'Dodaj komentarz'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Lightbox Modal */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.lightboxContainer}>
          <TouchableOpacity 
            style={styles.lightboxClose}
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    marginTop: Spacing.m,
  },
  historyItem: {
    flexDirection: 'row',
    marginBottom: Spacing.l,
    paddingLeft: Spacing.xs,
  },
  historyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.m,
    marginTop: 4,
  },
  dotCreated: {
    backgroundColor: Colors.primary,
  },
  dotServiceman: {
    backgroundColor: Colors.secondary,
  },
  dotPhoto: {
    backgroundColor: '#f59e0b', // amber/pomarańczowy
  },
  historyContent: {
    flex: 1,
  },
  historyText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  historyBold: {
    fontWeight: '600',
    color: Colors.primary,
  },
  historyDate: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  historySubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  photoHistoryItem: {
    marginBottom: Spacing.l,
  },
  historyPhoto: {
    maxWidth: 400,
    width: '92%',
    height: 200,
    borderRadius: 8,
    marginTop: Spacing.s,
    marginLeft: 24, // Wyrównanie z tekstem (12px dot + 12px margin)
  },
  commentCard: {
    backgroundColor: Colors.background,
    padding: Spacing.m,
    borderRadius: 8,
    marginBottom: Spacing.m,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.s,
  },
  commentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  commentIcon: {
    marginRight: Spacing.xs,
  },
  authorName: {
    ...Typography.bodyBold,
    color: Colors.text,
    marginRight: Spacing.s,
  },
  authorRole: {
    fontSize: 12,
    color: Colors.textSecondary,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.s,
    paddingVertical: 2,
    borderRadius: 4,
  },
  commentContent: {
    ...Typography.body,
    marginBottom: Spacing.s,
    marginLeft: Spacing.l,
  },
  commentDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: Spacing.l,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.m,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    backgroundColor: Colors.background,
    marginBottom: Spacing.m,
    gap: Spacing.s,
  },
  addPhotoText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: Spacing.xl,
  },
  inputContainer: {
    marginTop: Spacing.m,
    padding: Spacing.m,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.m,
    marginBottom: Spacing.m,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: Colors.white,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.m,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.textSecondary,
  },
  submitButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  lightboxContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
  disabledCommentsContainer: {
    marginTop: Spacing.m,
    padding: Spacing.m,
    backgroundColor: Colors.background,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  disabledCommentsText: {
    color: Colors.textSecondary,
    fontSize: 14,
    flex: 1,
  },
});
