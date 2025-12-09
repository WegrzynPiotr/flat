import React from 'react';
import { View, StyleSheet, Dimensions, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../styles/colors';

// Import MapView only on native platforms
let MapView: any;
let Marker: any;
let PROVIDER_GOOGLE: any;

if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
}

interface PropertyMapProps {
  latitude?: number;
  longitude?: number;
  address: string;
  height?: number;
}

const PropertyMap: React.FC<PropertyMapProps> = ({ 
  latitude, 
  longitude, 
  address,
  height = 300 
}) => {
  // If running on web, show a message
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.placeholderContainer}>
          <Ionicons name="globe-outline" size={48} color={Colors.textSecondary} />
          <Text style={styles.placeholderText}>
            Mapa dostępna tylko w aplikacji mobilnej
          </Text>
          <Text style={styles.placeholderSubtext}>
            {latitude && longitude 
              ? `Współrzędne: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
              : 'Współrzędne nie zostały ustawione'}
          </Text>
        </View>
      </View>
    );
  }

  // Jeśli brak współrzędnych, pokaż placeholder
  if (!latitude || !longitude) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.placeholderContainer}>
          <Ionicons name="location-outline" size={48} color={Colors.textSecondary} />
          <Text style={styles.placeholderText}>
            Brak danych o lokalizacji
          </Text>
          <Text style={styles.placeholderSubtext}>
            Współrzędne geograficzne nie zostały ustawione dla tej nieruchomości
          </Text>
        </View>
      </View>
    );
  }

  const region = {
    latitude,
    longitude,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        style={styles.map}
        initialRegion={region}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={false}
        showsMyLocationButton={false}
        zoomEnabled={true}
        scrollEnabled={true}
      >
        <Marker
          coordinate={{
            latitude,
            longitude,
          }}
          title={address}
          description="Lokalizacja nieruchomości"
        >
          <View style={styles.markerContainer}>
            <Ionicons name="home" size={32} color={Colors.primary} />
          </View>
        </Marker>
      </MapView>
      <View style={styles.addressBanner}>
        <Ionicons name="location" size={16} color={Colors.primary} />
        <Text style={styles.addressText} numberOfLines={1}>
          {address}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.background,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: Colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  addressBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  addressText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    padding: 24,
  },
  placeholderText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  placeholderSubtext: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default PropertyMap;
