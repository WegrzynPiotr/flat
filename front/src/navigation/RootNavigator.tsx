import React from 'react';
import { useSelector } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import { RootState } from '../store/store';

export default function RootNavigator() {
  const { accessToken } = useSelector((state: RootState) => state.auth);

  return (
    <NavigationContainer>
      {accessToken ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
