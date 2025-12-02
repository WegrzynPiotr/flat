import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import { RootState } from '../store/store';

export default function RootNavigator() {
  const { accessToken, user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    console.log('🔴 RootNavigator - accessToken:', accessToken ? 'exists' : 'null');
    console.log('🔴 RootNavigator - user:', user ? user.email : 'null');
  }, [accessToken, user]);

  return (
    <NavigationContainer>
      {accessToken ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
