import React, { useEffect, useState, useCallback } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { RootState } from '../store/store';
import IssuesListScreen from '../screens/issues/IssuesListScreen';
import IssueDetailsScreen from '../screens/issues/IssueDetailsScreen';
import CreateIssueScreen from '../screens/issues/CreateIssueScreen';
import PropertiesScreen from '../screens/properties/PropertiesScreen';
import PropertyDetailsScreen from '../screens/properties/PropertyDetailsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import MessagesScreen from '../screens/messages/MessagesScreen';
import ManagementScreen from '../screens/management/ManagementScreen';
import { Colors } from '../styles/colors';
import { propertiesAPI } from '../api/endpoints';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function IssuesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="IssuesList"
        component={IssuesListScreen}
        options={{ title: 'Usterki' }}
      />
      <Stack.Screen
        name="IssueDetails"
        component={IssueDetailsScreen}
        options={{ title: 'Szczegóły usterki' }}
      />
      <Stack.Screen
        name="CreateIssue"
        component={CreateIssueScreen}
        options={{ title: 'Nowa usterka' }}
      />
    </Stack.Navigator>
  );
}

function PropertiesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="PropertiesList"
        component={PropertiesScreen}
        options={{ title: 'Moje mieszkania' }}
      />
      <Stack.Screen
        name="PropertyDetails"
        component={PropertyDetailsScreen}
        options={{ title: 'Szczegóły mieszkania' }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const [isPropertyOwner, setIsPropertyOwner] = useState(false);

  const checkOwnership = useCallback(async () => {
    try {
      const response = await propertiesAPI.getAll();
      // Sprawdź czy użytkownik jest właścicielem któregoś z mieszkań
      const ownedProperties = response.data.filter((p: any) => {
        // PropertyResponse nie ma pola ownerId zwracanego bezpośrednio,
        // ale możemy sprawdzić czy nie jest to wynajmowane mieszkanie
        return !p.isActiveTenant;
      });
      setIsPropertyOwner(ownedProperties.length > 0);
    } catch (error) {
      console.error('Failed to check property ownership:', error);
      setIsPropertyOwner(false);
    }
  }, []);

  // Sprawdź przy każdym focus na nawigację (np. po dodaniu mieszkania)
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        checkOwnership();
      }
    }, [userId, checkOwnership])
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => {
          let iconName: any;
          if (route.name === 'Issues') {
            iconName = focused ? 'alert-circle' : 'alert-circle-outline';
          } else if (route.name === 'Properties') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Management') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.disabled,
      })}
    >
      <Tab.Screen name="Issues" component={IssuesStack} options={{ headerShown: false, title: 'Usterki' }} />
      <Tab.Screen name="Properties" component={PropertiesStack} options={{ headerShown: false, title: 'Mieszkania' }} />
      <Tab.Screen name="Messages" component={MessagesScreen} options={{ title: 'Wiadomości' }} />
      {isPropertyOwner && (
        <Tab.Screen name="Management" component={ManagementScreen} options={{ title: 'Zarządzanie' }} />
      )}
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil' }} />
    </Tab.Navigator>
  );
}
