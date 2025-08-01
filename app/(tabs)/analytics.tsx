import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Button, Title } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import eventBus from '../../utils/event-bus';

import mapStyle from '../../assets/mapStyle.json'; // adjust path as needed

const BACKEND_URL = 'https://legendbackend.onrender.com';

export default function AnalyticsScreen() {
  const { text: rawText, name: rawName } = useLocalSearchParams();
  const text = typeof rawText === 'string' ? rawText : '';
  const name = typeof rawName === 'string' ? rawName : '';
  const router = useRouter();

  const [qrColor, setQrColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [scanEvents, setScanEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const qrRef = useRef<React.ComponentRef<typeof ViewShot>>(null);

  // Default to 'direct' QR mode
  const [qrMode, setQrMode] = useState<'tracked' | 'direct'>('direct');

  // --- Map state ---
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.0902, // USA center default
    longitude: -95.7129,
    latitudeDelta: 40,
    longitudeDelta: 40,
  });

  // Only scanEvents with lat/lon
  const scanMarkers = (scanEvents || []).filter(
    e => e.location && typeof e.location.lat === 'number' && typeof e.location.lon === 'number'
  );
  const firstMarker = scanMarkers.length > 0 ? scanMarkers[0] : null;

  // Auto-center on first scan marker
  useEffect(() => {
    if (firstMarker) {
      setMapRegion({
        latitude: firstMarker.location.lat,
        longitude: firstMarker.location.lon,
        latitudeDelta: 12,
        longitudeDelta: 12,
      });
    }
  }, [scanEvents.length]);

  // Dynamic QR value
  const qrValue =
    qrMode === 'tracked' && projectId
      ? `${BACKEND_URL}/track/${projectId}`
      : text;

  const isURL = /^https?:\/\//i.test(text);
  const linkToOpen = isURL
    ? text
    : `https://www.google.com/search?q=${encodeURIComponent(text)}`;

  const getToken = async () => {
    return await AsyncStorage.getItem('token');
  };

  // Load project info and scan analytics (always use JWT)
  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      // Fetch all projects for current user
      const res = await fetch(`${BACKEND_URL}/api/get-projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const match = data.projects?.find((p: any) => p.name === name && p.text === text);
      if (match) {
        setProjectId(match.id);
        setQrColor(match.qrColor || '#000000');
        setBgColor(match.bgColor || '#ffffff');
        // Fetch scan analytics for this project
        const analyticsRes = await fetch(`${BACKEND_URL}/api/get-scan-analytics/${match.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const analyticsData = await analyticsRes.json();
        setScanCount(analyticsData.scanCount || 0);
        setScanEvents(analyticsData.scanEvents || []);
      }
    } catch (err) {
      console.error('❌ Failed to load analytics:', err);
      Alert.alert('Error', 'Failed to load project analytics.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAnalytics();
    const handler = (payload: { name: string; text: string }) => {
      if (payload.name === name && payload.text === text) {
        loadAnalytics();
      }
    };
    eventBus.on('customizationUpdated', handler);
    return () => {
      eventBus.off('customizationUpdated', handler);
    };
  }, [name, text]);

  const handleShareQR = async () => {
    const ref = qrRef.current;
    if (!ref || typeof ref.capture !== 'function') {
      Alert.alert('QR not ready to share');
      return;
    }
    const uri = await ref.capture();
    await Sharing.shareAsync(uri);
  };

  // Pass projectId to Customize screen!
  const handleCustomizePress = () => {
    router.push({
      pathname: '/customize',
      params: { name, text, projectId },
    });
  };

  const handleOpenLink = async () => {
    try {
      await Linking.openURL(linkToOpen);
    } catch (err) {
      Alert.alert('Failed to open', 'Could not launch the URL or search.');
    }
  };

  // Handler for tracked QR mode toggle
  const handleEnableTrackedQR = () => {
    if (qrMode !== 'tracked') {
      Alert.alert(
        "Inform Your Users",
        "When you enable tracking, make sure to inform the people using the QR code that you are tracking the location and number of scans.",
        [
          {
            text: "OK",
            onPress: () => setQrMode('tracked'),
          },
          {
            text: "Cancel",
            style: "cancel"
          }
        ]
      );
    }
  };

  if (!text || !name) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          Missing QR data. Please go back and select a project.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={{ color: '#888', fontSize: 17 }}>Loading project...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Title style={styles.title}>{name}</Title>

      {/* --- QR Mode Toggle --- */}
      <View style={styles.qrModeToggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, qrMode === 'tracked' && styles.toggleActive]}
          onPress={handleEnableTrackedQR}
        >
          <Text style={{ color: qrMode === 'tracked' ? '#fff' : '#2196F3', fontWeight: '700' }}>Tracked QR</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, qrMode === 'direct' && styles.toggleActive]}
          onPress={() => setQrMode('direct')}
        >
          <Text style={{ color: qrMode === 'direct' ? '#fff' : '#2196F3', fontWeight: '700' }}>Direct QR</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.qrModeDesc}>
        {qrMode === 'tracked'
          ? 'Scan count and analytics will be recorded. QRs open through your backend and then redirect.'
          : 'Encodes the raw text/URL. No analytics or tracking.'}
      </Text>

      <Text style={styles.label}>QR Code:</Text>
      <View style={styles.qrWrapper}>
        <ViewShot ref={qrRef}>
          <QRCode value={qrValue} size={200} color={qrColor} backgroundColor={bgColor} />
        </ViewShot>
      </View>

      {/* Share + Open buttons in same row */}
      <View style={styles.shareRow}>
        <Button
          mode="outlined"
          onPress={handleShareQR}
          style={styles.shareButton}
          textColor="#2196F3"
        >
          Share QR
        </Button>
        <Button
          mode="outlined"
          onPress={handleOpenLink}
          style={styles.shareButton}
          textColor="#2196F3"
        >
          {isURL ? 'Open Link' : 'Search Online'}
        </Button>
      </View>

      <View style={styles.buttonRow}>
        <Button mode="contained" onPress={handleCustomizePress} style={styles.button} buttonColor="#2196F3">
          Customize
        </Button>
      </View>

      <Text style={styles.label}>Encoded Content:</Text>
      <Text style={styles.content}>{qrValue}</Text>

      <Text style={styles.label}>Scan Analytics</Text>
      <Button
        mode="text"
        onPress={loadAnalytics}
        style={{ alignSelf: 'flex-end', marginBottom: 0, marginTop: 2 }}
        textColor="#2196F3"
        icon="refresh"
      >
        Refresh
      </Button>
      <Text style={styles.scanCount}>
        Total scans: <Text style={{ fontWeight: 'bold' }}>{scanCount}</Text>
      </Text>

      {/* ----------- MAP VIEW FOR SCAN EVENTS ----------- */}
      {scanMarkers.length > 0 && (
        <View style={styles.mapContainer}>
          <Text style={styles.label}>Scan Locations Map</Text>
          <MapView
            style={styles.map}
            region={mapRegion}
            onRegionChangeComplete={setMapRegion}
            showsUserLocation={false}
            customMapStyle={mapStyle}
          >
            {scanMarkers.map((event, idx) => {
              // Round coordinates to 1 decimal for privacy
              const markerLat = typeof event.location.lat === "number" ? Math.round(event.location.lat * 10) / 10 : event.location.lat;
              const markerLon = typeof event.location.lon === "number" ? Math.round(event.location.lon * 10) / 10 : event.location.lon;

              return (
                <Marker
                  key={idx}
                  coordinate={{
                    latitude: markerLat,
                    longitude: markerLon,
                  }}
                  title={
                    event.location.city || event.location.country
                      ? `${event.location.city || ''}${event.location.city && event.location.country ? ', ' : ''}${event.location.country || ''}`
                      : 'Scan Location'
                  }
                  description={`Scanned: ${new Date(event.timestamp).toLocaleString()}`}
                />
              );
            })}
          </MapView>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
    // REMOVE justifyContent: 'center'
    minHeight: '100%', // Optional but recommended
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#222',
    marginBottom: 20,
    textAlign: 'center',
  },
  qrModeToggle: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 6,
    gap: 0,
    backgroundColor: '#eaf4fb',
    borderRadius: 12,
    overflow: 'hidden',
  },
  toggleBtn: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#2196F3',
  },
  qrModeDesc: {
    color: '#888',
    fontSize: 13,
    marginBottom: 4,
    marginTop: -3,
    alignSelf: 'center',
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    color: '#444',
    alignSelf: 'flex-start',
  },
  content: {
    fontSize: 14,
    marginTop: 8,
    color: '#555',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  qrWrapper: {
    marginTop: 16,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  shareRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  shareButton: {
    flex: 1,
    borderColor: '#2196F3',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
    gap: 12,
  },
  button: {
    flex: 1,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  scanCount: {
    fontSize: 17,
    color: '#2196F3',
    marginTop: 8,
    fontWeight: '600',
    marginBottom: 10,
  },
  mapContainer: {
    width: '100%',
    height: 320,
    marginTop: 18,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#eee',
    alignSelf: 'center',
    borderWidth: 2,            // <-- Blue border thickness
    borderColor: '#2196F3',    // <-- Blue color (Material Blue)
  },
  map: {
    width: '100%',
    height: '100%',
  },
  row: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    shadowColor: '#2196F3',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    borderColor: '#eee',
    borderWidth: 1,
    width: Dimensions.get('window').width - 70,
    alignSelf: 'center',
  },
  eventTime: { fontWeight: '600', fontSize: 15, color: '#333' },
  eventDevice: { fontSize: 12, color: '#888', marginTop: 2 },
  eventLocation: { fontSize: 12, color: '#498', marginTop: 2 },
  eventIp: { fontSize: 11, color: '#bbb', marginTop: 2 },
});
