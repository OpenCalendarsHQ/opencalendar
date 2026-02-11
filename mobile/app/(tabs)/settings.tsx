import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Switch,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../lib/contexts/auth-context';
import { useCalendars } from '../../lib/hooks/useCalendars';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants/theme';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { calendars, updateCalendar } = useCalendars();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Sign out error:', error);
            }
          },
        },
      ]
    );
  };

  const toggleCalendarVisibility = async (calendarId: string, currentVisibility: boolean) => {
    try {
      await updateCalendar(calendarId, { isVisible: !currentVisibility });
    } catch (error) {
      console.error('Failed to toggle calendar:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#000000', '#0a0a1a', '#000000']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <ScrollView style={styles.scrollView}>
          {/* Account Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <BlurView intensity={20} tint="dark" style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{user?.email || 'Not signed in'}</Text>
              </View>
            </BlurView>
          </View>

          {/* Calendars Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Calendars</Text>
            {calendars.map(account => (
              <View key={account.id} style={styles.accountGroup}>
                <Text style={styles.accountLabel}>{account.email}</Text>
                {account.calendars.map(calendar => (
                  <BlurView
                    key={calendar.id}
                    intensity={20}
                    tint="dark"
                    style={[styles.card, styles.calendarCard]}
                  >
                    <View style={styles.calendarRow}>
                      <View style={styles.calendarInfo}>
                        <View
                          style={[
                            styles.colorIndicator,
                            { backgroundColor: calendar.color },
                          ]}
                        />
                        <Text style={styles.calendarName}>{calendar.name}</Text>
                      </View>
                      <Switch
                        value={calendar.isVisible}
                        onValueChange={() =>
                          toggleCalendarVisibility(calendar.id, calendar.isVisible)
                        }
                        trackColor={{
                          false: 'rgba(255, 255, 255, 0.2)',
                          true: Colors.dark.tint,
                        }}
                        thumbColor="#fff"
                      />
                    </View>
                  </BlurView>
                ))}
              </View>
            ))}
          </View>

          {/* App Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <BlurView intensity={20} tint="dark" style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.label}>Version</Text>
                <Text style={styles.value}>1.0.0</Text>
              </View>
            </BlurView>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
            <BlurView intensity={20} tint="dark" style={styles.signOutBlur}>
              <Text style={styles.signOutText}>Sign Out</Text>
            </BlurView>
          </TouchableOpacity>

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: '#fff',
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  card: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: FontSizes.md,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  value: {
    fontSize: FontSizes.md,
    color: '#fff',
    fontWeight: FontWeights.medium,
  },
  accountGroup: {
    marginBottom: Spacing.md,
  },
  accountLabel: {
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    fontWeight: FontWeights.semibold,
  },
  calendarCard: {
    marginBottom: Spacing.xs,
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calendarInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  calendarName: {
    fontSize: FontSizes.md,
    color: '#fff',
    flex: 1,
  },
  signOutButton: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  signOutBlur: {
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  signOutText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.dark.danger,
  },
});
