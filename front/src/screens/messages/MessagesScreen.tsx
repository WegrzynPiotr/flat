import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MessagesList from '../../components/messages/MessagesList';
import Conversation from '../../components/messages/Conversation';
import { UserRelation, ConversationUser } from '../../types/api';
import { messagesAPI } from '../../api/endpoints';

interface SelectedContact {
  userId: string;
  name: string;
}

export default function MessagesScreen() {
  const [selectedContact, setSelectedContact] = useState<SelectedContact | null>(null);
  const [contacts, setContacts] = useState<ConversationUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadContacts = useCallback(async () => {
    try {
      const response = await messagesAPI.getContacts();
      setContacts(response.data);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Odświeżaj kontakty przy każdym wejściu na ekran
  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [loadContacts])
  );

  // Pobierz aktualne relacje z contacts dla wybranego kontaktu
  const currentRelations = useMemo(() => {
    if (!selectedContact) return [];
    const contact = contacts.find(c => c.userId === selectedContact.userId);
    return contact?.relations || [];
  }, [selectedContact, contacts]);

  if (selectedContact) {
    return (
      <Conversation
        userId={selectedContact.userId}
        userName={selectedContact.name}
        relations={currentRelations}
        onBack={() => setSelectedContact(null)}
        onRefreshContacts={loadContacts}
      />
    );
  }

  return (
    <View style={styles.container}>
      <MessagesList
        contacts={contacts}
        loading={loading}
        onRefresh={loadContacts}
        onSelectContact={(userId, name) => 
          setSelectedContact({ userId, name })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
