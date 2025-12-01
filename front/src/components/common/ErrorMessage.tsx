import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';

interface ErrorMessageProps {
  message: string;
}

export default function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.error,
    padding: Spacing.m,
    borderRadius: 8,
    margin: Spacing.m,
  },
  text: {
    color: '#fff',
    textAlign: 'center',
  },
});
