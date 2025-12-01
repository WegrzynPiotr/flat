import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Issue } from '../../types/api';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';

interface IssueCardProps {
  issue: Issue;
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

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
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
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    padding: Spacing.m,
    borderRadius: 12,
    marginBottom: Spacing.m,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
});
