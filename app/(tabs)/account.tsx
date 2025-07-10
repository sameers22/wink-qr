import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import base64 from 'base-64';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const BACKEND_URL = 'https://legendbackend.onrender.com';

export default function AccountScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  // Load info from JWT token & storage
  useEffect(() => {
    (async () => {
      // Get email from JWT token (if available)
      const token = await AsyncStorage.getItem('token');
      if (token) {
        try {
          const payload = token.split('.')[1];
          const pad = payload.length % 4 === 0 ? '' : '='.repeat(4 - (payload.length % 4));
          const decodedPayload = base64.decode(payload + pad);
          const decoded = JSON.parse(decodedPayload);
          if (decoded.email) setEmail(decoded.email);
        } catch (e) {
          setEmail('');
        }
      }
      // Load optional fields from storage
      const savedBirthday = await AsyncStorage.getItem('birthday');
      const savedPhone = await AsyncStorage.getItem('phone');
      if (savedBirthday) setBirthday(savedBirthday);
      if (savedPhone) setPhone(savedPhone);
    })();
  }, []);

  // Save info to storage
  const handleSave = async () => {
    setLoading(true);
    await AsyncStorage.setItem('birthday', birthday.trim());
    await AsyncStorage.setItem('phone', phone.trim());
    setLoading(false);
    Alert.alert('Info saved!');
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(['token', 'birthday', 'phone']);
    Alert.alert('Logged out');
    router.replace('/login');
  };

  // --- Delete Account Handler ---
  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This will remove all your data and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const token = await AsyncStorage.getItem('token');
              await axios.delete(`${BACKEND_URL}/api/user/account`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              await AsyncStorage.multiRemove(['token', 'birthday', 'phone']);
              setLoading(false);
              Alert.alert('Account Deleted', 'Your account has been deleted.');
              router.replace('/login');
            } catch (err: any) {
              setLoading(false);
              Alert.alert('Delete Failed', err?.response?.data?.message || 'Failed to delete account.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.infoLabel}>Email:</Text>
        <Text style={styles.info}>{email || 'Loading...'}</Text>

        <Text style={styles.infoLabel}>Birthday (optional):</Text>
        <TextInput
          style={styles.input}
          value={birthday}
          onChangeText={setBirthday}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#bbb"
        />
        <Text style={styles.infoLabel}>Phone (optional):</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Enter your phone number"
          placeholderTextColor="#bbb"
          keyboardType="phone-pad"
        />
        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "Saving..." : "Save"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { backgroundColor: '#aaa', marginTop: 10 }]} onPress={handleLogout}>
          <Text style={styles.buttonText}>Log Out</Text>
        </TouchableOpacity>

        {/* Delete Account Button */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#ff4d4f', marginTop: 22 }]}
          onPress={handleDeleteAccount}
          disabled={loading}
        >
          <Text style={[styles.buttonText, { color: '#fff' }]}>
            {loading ? "Processing..." : "Delete Account"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f3f5f7" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 30,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    width: "90%",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 26,
    color: "#2196F3",
  },
  infoLabel: {
    fontSize: 16,
    color: "#888",
    marginBottom: 2,
    alignSelf: 'flex-start',
    marginLeft: 4,
  },
  info: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#333",
    width: "100%",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  input: {
    width: "100%",
    fontSize: 17,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginBottom: 16,
    color: "#222",
  },
  button: {
    marginTop: 8,
    width: "100%",
    backgroundColor: "#2196F3",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    letterSpacing: 0.5,
  },
});
