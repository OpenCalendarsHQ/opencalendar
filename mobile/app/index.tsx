import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAuth } from '../lib/contexts/auth-context';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSizes, FontWeights, Spacing, BorderRadius } from '../constants/theme';
import { StatusBar } from 'expo-status-bar';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      await signIn();
    } catch (error) {
      console.error('Login failed:', error);
      alert('Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Gradient Background */}
      <LinearGradient
        colors={['#000000', '#1a1a2e', '#000000']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Image
              source={require('../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>OpenCalendars</Text>
        <Text style={styles.subtitle}>
          Build better schedules with OpenCalendars
        </Text>

        {/* Sign In Button */}
        <TouchableOpacity
          style={styles.signInButton}
          onPress={handleSignIn}
          disabled={loading}
          activeOpacity={0.8}
        >
          <BlurView intensity={20} tint="light" style={styles.buttonBlur}>
            <Text style={styles.buttonText}>
              {loading ? 'Signing in...' : 'Sign in with Google'}
            </Text>
          </BlurView>
        </TouchableOpacity>

        {/* Features */}
        <View style={styles.features}>
          <FeatureItem icon="🔄" text="Sync across devices" />
          <FeatureItem icon="🎨" text="Beautiful interface" />
          <FeatureItem icon="🔔" text="Smart reminders" />
        </View>
      </View>
    </View>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  logoContainer: {
    marginBottom: Spacing.xl,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.bold,
    color: '#fff',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: Spacing.xxl,
    textAlign: 'center',
  },
  signInButton: {
    width: '100%',
    height: 56,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  buttonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: '#fff',
  },
  features: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featureIcon: {
    fontSize: 20,
  },
  featureText: {
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
