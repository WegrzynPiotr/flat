import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { IssueResponse } from '../../types/api';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';

interface IssueCardProps {
  issue: IssueResponse;
  onPress: () => void;
}

export default function IssueCard({ issue, onPress }: IssueCardProps) {
  const getPriorityColor = () => {
    switch (issue.priority) {
      case 'high': return Colors.error;
      case 'medium': return Colors.warning;
      case 'low': return Colors.secondary;
      default: return Colors.disabled;
    }
  };

  const firstPhoto = issue.photos && issue.photos.length > 0 ? issue.photos[0] : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {firstPhoto && (
        <Image 
          source={{ uri: firstPhoto }} 
          style={styles.photo}
          resizeMode="cover"
        />
      )}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{issue.title}</Text>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor() }]}>
            <Text style={styles.priorityText}>{issue.priority}</Text>
          </View>
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {issue.description}
        </Text>
        <Text style={styles.category}>{issue.category}</Text>
        <Text style={styles.status}>Status: {issue.status}</Text>
        {issue.assignedServicemen && issue.assignedServicemen.length > 0 && (
          <Text style={styles.servicemen}>
            Serwisanci: {issue.assignedServicemen.map(s => s.servicemanName).join(', ')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    overflow: 'hidden',
    width: '100%',
    height: '100%',
  },
  photo: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.disabled,
  },
  content: {
    padding: Spacing.m,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.s,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: Spacing.s,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.s,
  },
  category: {
    fontSize: 12,
    color: Colors.primary,
    marginBottom: 4,
  },
  status: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  servicemen: {
    fontSize: 12,
    color: Colors.success,
    marginTop: 4,
    fontWeight: '500',
  },
});
