import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { Colors } from '../../styles/colors';
import { Spacing } from '../../styles/spacing';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  onPress,
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? Colors.primary : '#fff'} />
      ) : (
        <Text style={[styles.text, styles[`text_${variant}`], textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.m,
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.secondary,
  },
  outline: {
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  size_small: {
    paddingVertical: Spacing.s,
  },
  size_medium: {
    paddingVertical: Spacing.m,
  },
  size_large: {
    paddingVertical: Spacing.l,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  text_primary: {
    color: '#fff',
  },
  text_secondary: {
    color: '#fff',
  },
  text_outline: {
    color: Colors.primary,
  },
});
