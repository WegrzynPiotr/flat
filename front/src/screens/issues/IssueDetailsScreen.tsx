import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchIssueById } from '../../store/slices/issuesSlice';
import { AppDispatch, RootState } from '../../store/store';
import Loading from '../../components/common/Loading';
import CommentsList from '../../components/issues/CommentsList';
import AssignServicemanForm from '../../components/userManagement/AssignServicemanForm';
import { Colors } from '../../styles/colors';
import { Typography } from '../../styles/typography';
import { Spacing } from '../../styles/spacing';

export default function IssueDetailsScreen({ route }: any) {
  const { id } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  const { selectedIssue, loading } = useSelector((state: RootState) => state.issues);
  const userRole = useSelector((state: RootState) => state.auth.user?.role);

  useEffect(() => {
    dispatch(fetchIssueById(id));
  }, [id, dispatch]);

  const handleServicemanAssigned = () => {
    dispatch(fetchIssueById(id));
  };

  if (loading || !selectedIssue) {
    return <Loading />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={Typography.h2}>{selectedIssue.title}</Text>
        
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
                <Image key={index} source={{ uri: photo }} style={styles.photo} />
              ))}
            </View>
          </>
        )}
      </View>

      {userRole === 'Wlasciciel' && (
        <View style={styles.card}>
          <AssignServicemanForm issueId={id} onAssigned={handleServicemanAssigned} />
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
});
