import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store/store';
import RootNavigator from './src/navigation/RootNavigator';
import * as SecureStore from 'expo-secure-store';

export default function App() {
  useEffect(() => {
    // Initialize app on startup
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        console.log('User is authenticated');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <RootNavigator />
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}
