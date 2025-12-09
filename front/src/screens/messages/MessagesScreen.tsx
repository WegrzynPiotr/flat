import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import MessagesList from '../../components/messages/MessagesList';
import Conversation from '../../components/messages/Conversation';
import { UserRelation } from '../../types/api';

interface SelectedContact {
  userId: string;
  name: string;
  relations: UserRelation[];
}

export default function MessagesScreen() {
  const [selectedContact, setSelectedContact] = useState<SelectedContact | null>(null);

  if (selectedContact) {
    return (
      <Conversation
        userId={selectedContact.userId}
        userName={selectedContact.name}
        relations={selectedContact.relations}
        onBack={() => setSelectedContact(null)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <MessagesList
        onSelectContact={(userId, name, relations) => 
          setSelectedContact({ userId, name, relations })
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
