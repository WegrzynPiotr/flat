import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../../store/slices/authSlice';
import { AppDispatch, RootState } from '../../store/store';
import { Colors } from '../../styles/colors';
import { Typography } from '../../styles/typography';
import { Spacing } from '../../styles/spacing';
import { validateEmail } from '../../utils/validation';
import Constants from 'expo-constants';

export default function LoginScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [detailedError, setDetailedError] = useState('');
  
  const apiUrl = Constants.expoConfig?.extra?.apiBaseUrl || 'http://193.106.130.55:5162/api';

  const handleLogin = async () => {
    const newErrors: typeof errors = {};
    
    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setDetailedError('');
    
    try {
      await dispatch(login({ email, password })).unwrap();
    } catch (err: any) {
      const errorMsg = JSON.stringify(err, null, 2);
      setDetailedError(`❌ ${errorMsg}\n\n🌐 API: ${apiUrl}`);
      Alert.alert('Login Error', err?.message || err || 'Failed to login');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={Typography.h1}>Flatify</Text>
        <Text style={styles.apiUrlText}>API: {apiUrl}</Text>
        <Text style={styles.subtitle}>Zaloguj się do aplikacji</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={Typography.label}>Email</Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            placeholder="jan.kowalski@example.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setErrors({ ...errors, email: undefined });
            }}
            editable={!loading}
            keyboardType="email-address"
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={Typography.label}>Hasło</Text>
          <TextInput
            style={[styles.input, errors.password && styles.inputError]}
            placeholder="Wpisz hasło"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setErrors({ ...errors, password: undefined });
            }}
            secureTextEntry
            editable={!loading}
          />
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
        </View>

        {error && <Text style={styles.apiError}>{error}</Text>}
        
        {detailedError && (
          <View style={styles.detailedErrorBox}>
            <Text style={styles.detailedErrorText}>{detailedError}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Zaloguj</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.registerLink}>Nie masz konta? Załóż nowe</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.l,
    justifyContent: 'center',
  },
  header: {
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.s,
  },
  apiUrlText: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  detailedErrorBox: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 8,
    padding: Spacing.m,
    marginVertical: Spacing.s,
  },
  detailedErrorText: {
    fontSize: 10,
    color: Colors.error,
    fontFamily: 'monospace',
  },
  form: {
    gap: Spacing.m,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.m,
    fontSize: 16,
    backgroundColor: Colors.surface,
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
  },
  apiError: {
    color: Colors.error,
    textAlign: 'center',
    marginVertical: Spacing.m,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.m,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: Spacing.m,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerLink: {
    color: Colors.primary,
    textAlign: 'center',
    marginTop: Spacing.m,
    fontSize: 14,
  },
});
