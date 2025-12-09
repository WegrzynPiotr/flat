import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { messagesAPI } from '../../api/endpoints';
import { MessageResponse } from '../../types/api';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';
import { Typography } from '../../styles/typography';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { startSignalRConnection, stopSignalRConnection, onReceiveMessage, offReceiveMessage } from '../../services/signalrService';

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
  const token = useSelector((state: RootState) => state.auth.accessToken);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();

    let cleanup: (() => void) | undefined;

    // Połączenie SignalR
    if (token) {
      console.log('🔌 Initializing SignalR for conversation with:', userId);
      startSignalRConnection(token)
        .then(() => {
          console.log('📡 SignalR connected in Conversation');
          
          // Nasłuchuj na nowe wiadomości
          cleanup = onReceiveMessage((message: MessageResponse) => {
            console.log('📨 New message received via SignalR:', message);
            console.log('📨 Current conversation userId:', userId);
            console.log('📨 Current user ID:', currentUserId);
            
            // Dodaj wiadomość jeśli jest w tej konwersacji
            // Wiadomość należy do tej konwersacji jeśli:
            // 1. Jest od userId do mnie LUB
            // 2. Jest ode mnie do userId
            const isFromConversationPartner = message.senderId === userId && message.receiverId === currentUserId;
            const isToConversationPartner = message.senderId === currentUserId && message.receiverId === userId;
            
            if (isFromConversationPartner || isToConversationPartner) {
              console.log('✅ Message belongs to this conversation, adding to list');
              setMessages(prev => {
                // Sprawdź czy już nie mamy tej wiadomości
                if (prev.some(m => m.id === message.id)) {
                  console.log('⚠️ Message already exists in list');
                  return prev;
                }
                const newMessages = [...prev, message];
                console.log('✅ Added message, new count:', newMessages.length);
                return newMessages;
              });
              
              // Oznacz jako przeczytaną jeśli jesteśmy odbiorcą
              if (message.receiverId === currentUserId) {
                console.log('📖 Marking message as read');
                messagesAPI.markAsRead(message.id).catch(console.error);
              }
              
              // Scroll do końca
              setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
            } else {
              console.log('⚠️ Message does not belong to this conversation');
            }
          });
        })
        .catch(err => console.error('❌ SignalR connection failed:', err));
    } else {
      console.log('⚠️ No token available for SignalR connection');
    }

    return () => {
      console.log('🔌 Cleaning up SignalR listeners');
      if (cleanup) cleanup();
    };
  }, [userId, token, currentUserId]);

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
      
      // Dodaj wiadomość lokalnie (SignalR też wyśle ale dla pewności)
      setMessages(prev => {
        if (prev.some(m => m.id === response.data.id)) {
          return prev;
        }
        return [...prev, response.data];
      });
      
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
