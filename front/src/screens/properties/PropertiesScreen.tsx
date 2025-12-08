import React, { useEffect } from 'react';
import { View, FlatList, Text, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProperties } from '../../store/slices/propertiesSlice';
import { AppDispatch, RootState } from '../../store/store';
import Loading from '../../components/common/Loading';
import { Colors } from '../../styles/colors';
import { Typography } from '../../styles/typography';
import { Spacing } from '../../styles/spacing';

export default function PropertiesScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { properties, loading } = useSelector((state: RootState) => state.properties);

  useEffect(() => {
    dispatch(fetchProperties());
  }, [dispatch]);

  if (loading && properties.length === 0) {
    return <Loading />;
  }

  const renderProperty = ({ item }: any) => (
    <View style={styles.card}>
      <Text style={Typography.h3}>{item.address}</Text>
      <Text style={styles.city}>{item.city}, {item.postalCode}</Text>
      <View style={styles.details}>
        <Text style={styles.detailText}>Pokoje: {item.roomsCount}</Text>
        <Text style={styles.detailText}>Powierzchnia: {item.area} m²</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={properties}
        keyExtractor={(item) => item.id}
        renderItem={renderProperty}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Brak mieszkań do wyświetlenia</Text>
        }
      />
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
  card: {
    backgroundColor: Colors.surface,
    padding: Spacing.l,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  city: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  details: {
    flexDirection: 'row',
    gap: Spacing.m,
    marginTop: Spacing.m,
  },
  detailText: {
    fontSize: 14,
    color: Colors.text,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.xl,
    color: Colors.textSecondary,
  },
});
