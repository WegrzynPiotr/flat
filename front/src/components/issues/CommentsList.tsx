import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { commentsAPI } from '../../api/endpoints';
import { CommentResponse } from '../../types/api';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';
import { Typography } from '../../styles/typography';

interface CommentsListProps {
  issueId: string;
}

export default function CommentsList({ issueId }: CommentsListProps) {
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [issueId]);

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
    } catch (error) {
      console.error('Failed to add comment:', error);
      alert('Nie udało się dodać komentarza');
    } finally {
      setSubmitting(false);
    }
  };

  const renderComment = ({ item }: { item: CommentResponse }) => (
    <View style={styles.commentCard}>
      <View style={styles.commentHeader}>
        <Text style={styles.authorName}>{item.authorName}</Text>
        <Text style={styles.authorRole}>{item.authorRole}</Text>
      </View>
      <Text style={styles.commentContent}>{item.content}</Text>
      <Text style={styles.commentDate}>
        {new Date(item.createdAt).toLocaleString('pl-PL')}
      </Text>
    </View>
  );

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
        data={comments}
        renderItem={renderComment}
        keyExtractor={(item) => item.id}
        style={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Brak komentarzy</Text>
        }
      />

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
            {submitting ? 'Wysyłam...' : 'Dodaj'}
          </Text>
        </TouchableOpacity>
      </View>
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
  commentCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.m,
    borderRadius: 8,
    marginBottom: Spacing.m,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.s,
  },
  authorName: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
  authorRole: {
    fontSize: 12,
    color: Colors.textSecondary,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.s,
    paddingVertical: 2,
    borderRadius: 4,
  },
  commentContent: {
    ...Typography.body,
    marginBottom: Spacing.s,
  },
  commentDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: Spacing.xl,
  },
  inputContainer: {
    marginTop: Spacing.m,
    padding: Spacing.m,
    backgroundColor: Colors.surface,
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
});
