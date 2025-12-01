import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { fetchIssues } from '../../store/slices/issuesSlice';
import IssueCard from '../../components/issues/IssueCard';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';
import { AppDispatch, RootState } from '../../store/store';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';

export default function IssuesListScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { issues, loading, error } = useSelector((state: RootState) => state.issues);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchIssues({}));
  }, [dispatch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchIssues({}));
    setRefreshing(false);
  };

  if (loading && issues.length === 0) {
    return <Loading />;
  }

  return (
    <View style={styles.container}>
      {error && <ErrorMessage message={error} />}
      
      <FlatList
        data={issues}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <IssueCard
            issue={item}
            onPress={() => navigation.navigate('IssueDetails', { id: item.id })}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>Brak usterek do wyświetlenia</Text>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateIssue')}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: Spacing.m,
    gap: Spacing.m,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.xl,
    color: Colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
