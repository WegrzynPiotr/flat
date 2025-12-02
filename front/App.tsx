import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store/store';
import RootNavigator from './src/navigation/RootNavigator';
import { initializeAuth } from './src/store/slices/authSlice';
import { setStoreDispatch } from './src/utils/storeHelpers';

function AppContent() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Zapisz dispatch do globalnego singletona (dla interceptorów axios)
    setStoreDispatch(dispatch);
    
    // Inicjalizuj sesję przy starcie aplikacji
    // @ts-ignore
    dispatch(initializeAuth());
  }, [dispatch]);

  return (
    <SafeAreaProvider>
      <RootNavigator />
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AppContent />
      </PersistGate>
    </Provider>
  );
}
