import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { messagesAPI } from '../../api/endpoints';
import { MessageResponse } from '../../types/api';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';
import { Typography } from '../../styles/typography';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

interface ConversationProps {
  userId: string;
  userName: string;
  onBack: () => void;
}

export default function Conversation({ userId, userName, onBack }: ConversationProps) {
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const currentUserId = useSelector((state: RootState) => state.auth.user?.id);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000); // Odświeżaj co 5s
    return () => clearInterval(interval);
  }, [userId]);

  const loadMessages = async () => {
    try {
      const response = await messagesAPI.getConversation(userId);
      setMessages(response.data);
      
      // Oznacz jako przeczytane
      const unread = response.data.filter(m => m.receiverId === currentUserId && !m.isRead);
      for (const msg of unread) {
        await messagesAPI.markAsRead(msg.id);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const response = await messagesAPI.send(userId, newMessage.trim());
      setMessages([...messages, response.data]);
      setNewMessage('');
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Nie udało się wysłać wiadomości');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: MessageResponse }) => {
    const isMine = item.senderId === currentUserId;
    return (
      <View style={[styles.messageCard, isMine ? styles.myMessage : styles.theirMessage]}>
        <Text style={styles.messageContent}>{item.content}</Text>
        <Text style={styles.messageTime}>
          {new Date(item.sentAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
        </Text>
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
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Wróć</Text>
        </TouchableOpacity>
        <Text style={Typography.h3}>{userName}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Wpisz wiadomość..."
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, (sending || !newMessage.trim()) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={sending || !newMessage.trim()}
        >
          <Text style={styles.sendButtonText}>Wyślij</Text>
        </TouchableOpacity>
      </View>
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
    alignItems: 'center',
    padding: Spacing.m,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    marginRight: Spacing.m,
  },
  backText: {
    color: Colors.primary,
    fontSize: 16,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: Spacing.m,
  },
  messageCard: {
    maxWidth: '75%',
    padding: Spacing.m,
    borderRadius: 12,
    marginBottom: Spacing.s,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
  },
  messageContent: {
    color: Colors.text,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 10,
    color: Colors.textSecondary,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: Spacing.m,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    marginRight: Spacing.s,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.s,
    borderRadius: 20,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.textSecondary,
  },
  sendButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
});
