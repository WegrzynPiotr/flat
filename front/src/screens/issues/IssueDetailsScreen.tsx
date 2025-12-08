import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Modal, Dimensions, Alert, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { fetchIssueById, fetchIssues } from '../../store/slices/issuesSlice';
import { AppDispatch, RootState } from '../../store/store';
import Loading from '../../components/common/Loading';
import CommentsList from '../../components/issues/CommentsList';
import AssignServicemanForm from '../../components/userManagement/AssignServicemanForm';
import UpdateStatusForm from '../../components/issues/UpdateStatusForm';
import { issuesAPI } from '../../api/endpoints';
import { Colors } from '../../styles/colors';
import { Typography } from '../../styles/typography';
import { Spacing } from '../../styles/spacing';

export default function IssueDetailsScreen({ route, navigation }: any) {
  const { id } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  const { selectedIssue, loading } = useSelector((state: RootState) => state.issues);
  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const isOwner = userRole === 'Wlasciciel' && selectedIssue?.property?.ownerId === userId;

  useEffect(() => {
    dispatch(fetchIssueById(id));
  }, [id, dispatch]);

  const handleServicemanAssigned = () => {
    dispatch(fetchIssueById(id));
    // Odśwież też listę zgłoszeń w tle
    dispatch(fetchIssues({}));
  };

  const handleStatusUpdated = () => {
    dispatch(fetchIssueById(id));
    // Odśwież też listę zgłoszeń w tle
    dispatch(fetchIssues({}));
  };

  const handleDeleteIssue = async () => {
    const confirmDelete = Platform.OS === 'web'
      ? window.confirm('Czy na pewno chcesz usunąć tę usterkę? Tej operacji nie można cofnąć.')
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Usuń usterkę',
            'Czy na pewno chcesz usunąć tę usterkę? Tej operacji nie można cofnąć.',
            [
              { text: 'Anuluj', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Usuń', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmDelete) return;

    try {
      await issuesAPI.delete(id);
      dispatch(fetchIssues({}));
      navigation.goBack();
      Alert.alert('Sukces', 'Usterka została usunięta');
    } catch (error: any) {
      console.error('Error deleting issue:', error);
      Alert.alert('Błąd', error.response?.data?.message || 'Nie udało się usunąć usterki');
    }
  };

  if (loading || !selectedIssue) {
    return <Loading />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={[Typography.h2, styles.flexTitle]}>{selectedIssue.title}</Text>
          {isOwner && (
            <TouchableOpacity onPress={handleDeleteIssue} style={styles.deleteButton}>
              <Ionicons name="trash" size={24} color={Colors.error} />
            </TouchableOpacity>
          )}
        </View>

        {selectedIssue.property?.address && (
          <View style={styles.propertyRow}>
            <Ionicons name="home" size={16} color={Colors.primary} />
            <Text style={styles.propertyText}>{selectedIssue.property.address}</Text>
          </View>
        )}
        
        <View style={styles.row}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{selectedIssue.priority}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: Colors.secondary }]}>
            <Text style={styles.badgeText}>{selectedIssue.status}</Text>
          </View>
        </View>

        <Text style={[Typography.label, styles.marginTop]}>Opis</Text>
        <Text style={styles.description}>{selectedIssue.description}</Text>

        <Text style={[Typography.label, styles.marginTop]}>Kategoria</Text>
        <Text style={Typography.body}>{selectedIssue.category}</Text>

        <Text style={[Typography.label, styles.marginTop]}>Zgłoszone przez</Text>
        <Text style={Typography.body}>{selectedIssue.reportedByName || 'Nieznany użytkownik'}</Text>

        <Text style={[Typography.label, styles.marginTop]}>Data zgłoszenia</Text>
        <Text style={Typography.body}>{new Date(selectedIssue.reportedAt).toLocaleDateString('pl-PL')}</Text>

        {selectedIssue.assignedServicemen && selectedIssue.assignedServicemen.length > 0 && (
          <>
            <Text style={[Typography.label, styles.marginTop]}>Przypisani serwisanci</Text>
            {selectedIssue.assignedServicemen.map((serviceman) => (
              <Text key={serviceman.servicemanId} style={Typography.body}>
                {serviceman.servicemanName} - {new Date(serviceman.assignedAt).toLocaleDateString('pl-PL')}
              </Text>
            ))}
          </>
        )}

        {selectedIssue.photos && selectedIssue.photos.length > 0 && (
          <>
            <Text style={[Typography.label, styles.marginTop]}>Zdjęcia</Text>
            <View style={styles.photosGrid}>
              {selectedIssue.photos.map((photo, index) => (
                <TouchableOpacity 
                  key={index} 
                  onPress={() => setSelectedPhoto(photo)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: photo }} style={styles.photo} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>

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
            activeOpacity={0.8}
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

      {userRole === 'Wlasciciel' && (
        <>
          <View style={styles.card}>
            <AssignServicemanForm issueId={id} onAssigned={handleServicemanAssigned} />
          </View>
          <View style={styles.card}>
            <UpdateStatusForm 
              issueId={id} 
              currentStatus={selectedIssue.status} 
              onStatusUpdated={handleStatusUpdated} 
            />
          </View>
        </>
      )}

      {userRole === 'Serwisant' && (
        <View style={styles.card}>
          <UpdateStatusForm 
            issueId={id} 
            currentStatus={selectedIssue.status} 
            onStatusUpdated={handleStatusUpdated} 
          />
        </View>
      )}

      <View style={styles.card}>
        <CommentsList issueId={id} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  card: {
    backgroundColor: Colors.surface,
    padding: Spacing.l,
    margin: Spacing.m,
    borderRadius: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.m,
  },
  flexTitle: {
    flex: 1,
    marginBottom: 0,
  },
  deleteButton: {
    padding: Spacing.s,
  },
  propertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.s,
    borderRadius: 8,
    marginBottom: Spacing.m,
    gap: Spacing.xs,
  },
  propertyText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.s,
    marginTop: Spacing.m,
  },
  badge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  marginTop: {
    marginTop: Spacing.l,
  },
  description: {
    fontSize: 16,
    color: Colors.text,
    marginTop: Spacing.xs,
    lineHeight: 24,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.s,
    marginTop: Spacing.s,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
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
