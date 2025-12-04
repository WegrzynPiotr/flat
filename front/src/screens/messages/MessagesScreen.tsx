import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import MessagesList from '../../components/messages/MessagesList';
import Conversation from '../../components/messages/Conversation';

export default function MessagesScreen() {
  const [selectedContact, setSelectedContact] = useState<{ userId: string; name: string } | null>(null);

  if (selectedContact) {
    return (
      <Conversation
        userId={selectedContact.userId}
        userName={selectedContact.name}
        onBack={() => setSelectedContact(null)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <MessagesList
        onSelectContact={(userId, name) => setSelectedContact({ userId, name })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
