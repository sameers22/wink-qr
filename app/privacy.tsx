import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from 'react-native-paper';

const privacyPolicyText = `
Privacy Policy for Wink QR

Effective date: July 2024

Wink QR, we respects your privacy. This policy explains how we collect, use, and protect your information.

Information We Collect:
- Account Information: When you create an account, we collect your email and password.
- Optional Profile Information: You may optionally provide your birthday and phone number.
- QR Project Data: When you generate or save QR codes, we store the project data (text, project name, QR image).
- Analytics (If Used): If you enable analytics, we may collect anonymized scan counts and locations, when you enable tracking, make sure to inform the people using the QR code that you are tracking the location and number of scans.

How We Use Information:
- To provide app features and allow you to generate, save, and manage QR codes.
- To improve app functionality and your experience.
- (If tracking is enabled) For anonymous analytics only after user consent.

Data Sharing:
- We do not sell your data.
- Data may be shared with service providers only to operate the app (e.g., cloud hosting, email for password resets).

Data Deletion:
- You can delete your account at any time in the app’s Account page. This will permanently remove your account and all related data from our systems.

Children’s Privacy:
- The app is not intended for children under 13. We do not knowingly collect information from children.

Changes to This Policy:
- We may update this policy. Any changes will be posted here and in-app.

Contact:
For questions about privacy, contact us at: info@bizpivots.com

[Delete your data: Go to the Account page in the app and tap "Delete Account".]
`;

export default function PrivacyScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const acceptPolicy = async () => {
    setLoading(true);
    await AsyncStorage.setItem('privacyAccepted', 'true');
    setLoading(false);
    router.replace('/'); // Go to home (tabs) after accept
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outer}>
        <View style={styles.card}>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={styles.heading}>Privacy Policy</Text>
            <Text style={styles.body}>{privacyPolicyText}</Text>
          </ScrollView>
        </View>
        <Button
          mode="contained"
          onPress={acceptPolicy}
          style={styles.button}
          loading={loading}
          contentStyle={{ paddingVertical: 12 }}
          labelStyle={{ fontWeight: 'bold', fontSize: 17, letterSpacing: 0.5 }}
        >
          Accept & Continue
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  outer: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-end',
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#2196F3',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    marginBottom: 28,
  },
  heading: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 16,
    alignSelf: 'center',
    letterSpacing: 0.2,
  },
  body: {
    fontSize: 16,
    color: '#222',
    lineHeight: 25,
    paddingBottom: 12,
  },
  button: {
    borderRadius: 18,
    backgroundColor: '#2196F3',
    marginBottom: 12,
    marginHorizontal: 5,
    elevation: 2,
  },
});
