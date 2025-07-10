import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Button, TextInput, Title } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import ColorPicker from 'react-native-wheel-color-picker';
import eventBus from '../utils/event-bus';

const BACKEND_URL = 'https://legendbackend.onrender.com';

export default function CustomizeScreen() {
  const { text: rawText, name: rawName, projectId: rawProjectId } = useLocalSearchParams();
  const text = typeof rawText === 'string' ? rawText : '';
  const name = typeof rawName === 'string' ? rawName : '';
  const initialProjectId = typeof rawProjectId === 'string' ? rawProjectId : '';
  const router = useRouter();

  const [qrColor, setQrColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [projectId, setProjectId] = useState(initialProjectId);
  const [showQRPicker, setShowQRPicker] = useState(false);
  const [showBGPicker, setShowBGPicker] = useState(false);
  const [loading, setLoading] = useState(!initialProjectId);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const viewShotRef = useRef<React.ComponentRef<typeof ViewShot>>(null);

  // Get token (helper, called as needed)
  const getToken = async () => {
    return await AsyncStorage.getItem('token');
  };

  // Fetch project info if we don't have projectId yet
  useEffect(() => {
    if (initialProjectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const fetchProject = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${BACKEND_URL}/api/get-projects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        // Find the project by name and text (could also pass projectId!)
        const match = data.projects?.find((p: any) => p.name === name && p.text === text);
        if (match) {
          setProjectId(match.id);
          setQrColor(match.qrColor || '#000000');
          setBgColor(match.bgColor || '#ffffff');
        }
      } catch (err) {
        Alert.alert('Error', 'Could not load project for customization');
      }
      setLoading(false);
    };
    fetchProject();
  }, [name, text, initialProjectId]);

  const updateColorsAndImage = async (qrColorValue: string, bgColorValue: string) => {
    if (!projectId || !viewShotRef.current) {
      Alert.alert('Missing project ID or QR view');
      return;
    }
    try {
      const token = await getToken();
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) {
        Alert.alert('Failed to capture QR image');
        return;
      }
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await fetch(`${BACKEND_URL}/api/update-color/${projectId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qrColor: qrColorValue,
          bgColor: bgColorValue,
          qrImage: base64,
        }),
      });
      eventBus.emit('customizationUpdated', { name, text });
    } catch (err) {
      Alert.alert('Failed to update project');
    }
  };

  const handleSave = async () => {
    await updateColorsAndImage(qrColor, bgColor);
    router.back();
  };

  const handleResetToDefault = async () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(async () => {
      const defaultQR = '#000000';
      const defaultBG = '#ffffff';
      setQrColor(defaultQR);
      setBgColor(defaultBG);
      await updateColorsAndImage(defaultQR, defaultBG);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Title style={styles.title}>Customize Your QR Code</Title>

      {/* QR Code Preview */}
      <Animated.View style={[styles.previewContainer, { opacity: fadeAnim }]}>
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }}>
          <QRCode value={text} size={220} color={qrColor} backgroundColor={bgColor} />
        </ViewShot>
      </Animated.View>

      {/* QR Color Picker */}
      <Text style={styles.label}>QR Code Color</Text>
      <View style={styles.colorRow}>
        <TextInput
          mode="outlined"
          value={qrColor}
          onChangeText={setQrColor}
          style={styles.colorInput}
        />
        <View style={[styles.swatch, { backgroundColor: qrColor }]} />
      </View>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Show Color Picker</Text>
        <Switch value={showQRPicker} onValueChange={setShowQRPicker} />
      </View>
      {showQRPicker && (
        <View style={styles.colorPickerWrapper}>
          <ColorPicker
            color={qrColor}
            onColorChangeComplete={setQrColor}
            thumbSize={28}
            sliderSize={28}
          />
        </View>
      )}

      {/* BG Color Picker */}
      <Text style={styles.label}>Background Color</Text>
      <View style={styles.colorRow}>
        <TextInput
          mode="outlined"
          value={bgColor}
          onChangeText={setBgColor}
          style={styles.colorInput}
        />
        <View style={[styles.swatch, { backgroundColor: bgColor }]} />
      </View>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Show Color Picker</Text>
        <Switch value={showBGPicker} onValueChange={setShowBGPicker} />
      </View>
      {showBGPicker && (
        <View style={styles.colorPickerWrapper}>
          <ColorPicker
            color={bgColor}
            onColorChangeComplete={setBgColor}
            thumbSize={28}
            sliderSize={28}
          />
        </View>
      )}

      {/* Save / Reset */}
      <Button
        mode="contained"
        icon="check"
        onPress={handleSave}
        style={styles.saveButton}
        buttonColor="#2196F3"
        labelStyle={{ fontWeight: '600' }}
        disabled={!projectId || loading}
      >
        {loading || !projectId ? 'Loading...' : 'Save & Return'}
      </Button>

      <Button
        mode="outlined"
        icon="refresh"
        onPress={handleResetToDefault}
        style={styles.resetButton}
        textColor="#2196F3"
        disabled={!projectId || loading}
      >
        Reset to Default
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 72,
    backgroundColor: '#f2f5f8',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 28,
    color: '#222',
  },
  label: {
    fontSize: 16,
    marginTop: 24,
    fontWeight: '600',
    color: '#333',
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  colorInput: {
    flex: 1,
    marginRight: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  toggleLabel: {
    fontSize: 14,
    color: '#555',
  },
  colorPickerWrapper: {
    marginVertical: 16,
    alignSelf: 'center',
    width: '100%',
    minHeight: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  saveButton: {
    marginTop: 32,
    borderRadius: 8,
    paddingVertical: 10,
  },
  resetButton: {
    marginTop: 16,
    borderRadius: 8,
    borderColor: '#2196F3',
    borderWidth: 1.5,
    paddingVertical: 10,
  },
});
