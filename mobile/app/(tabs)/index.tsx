import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEvents } from '../../lib/hooks/useEvents';
import { useCalendars } from '../../lib/hooks/useCalendars';
import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants/theme';

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { events, loading, refetch, currentMonth, setCurrentMonth } = useEvents();
  const { calendars } = useCalendars();

  // Get visible calendar IDs
  const visibleCalendarIds = useMemo(() => {
    const ids = new Set<string>();
    calendars.forEach(account => {
      account.calendars
        .filter(cal => cal.isVisible)
        .forEach(cal => ids.add(cal.id));
    });
    return ids;
  }, [calendars]);

  // Filter events for selected date and visible calendars
  const todayEvents = useMemo(() => {
    return events.filter(
      event =>
        isSameDay(event.startTime, selectedDate) &&
        visibleCalendarIds.has(event.calendarId)
    );
  }, [events, selectedDate, visibleCalendarIds]);

  const goToPreviousMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
  };

  const goToNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Gradient Background */}
      <LinearGradient
        colors={['#000000', '#0a0a1a', '#000000']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {format(currentMonth, 'MMMM yyyy')}
          </Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
              <Text style={styles.navButtonText}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
              <Text style={styles.navButtonText}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#fff" />
          }
        >
          {/* Calendar Grid */}
          <BlurView intensity={20} tint="dark" style={styles.calendarCard}>
            <CalendarGrid
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              events={events.filter(e => visibleCalendarIds.has(e.calendarId))}
            />
          </BlurView>

          {/* Selected Day Events */}
          <View style={styles.eventsSection}>
            <Text style={styles.eventsSectionTitle}>
              {format(selectedDate, 'EEEE, MMMM d')}
            </Text>
            {todayEvents.length === 0 ? (
              <BlurView intensity={20} tint="dark" style={styles.emptyCard}>
                <Text style={styles.emptyText}>No events today</Text>
              </BlurView>
            ) : (
              todayEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))
            )}
          </View>
        </ScrollView>

        {/* Add Event Button */}
        <TouchableOpacity style={styles.fab}>
          <BlurView intensity={40} tint="dark" style={styles.fabBlur}>
            <Text style={styles.fabText}>+</Text>
          </BlurView>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

function CalendarGrid({
  currentMonth,
  selectedDate,
  onSelectDate,
  events,
}: {
  currentMonth: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  events: any[];
}) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const rows = [];
  let days = [];
  let day = startDate;

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      const currentDay = day;
      const hasEvents = events.some(event => isSameDay(event.startTime, currentDay));

      days.push(
        <TouchableOpacity
          key={day.toISOString()}
          style={[
            styles.day,
            !isSameMonth(day, monthStart) && styles.dayOutside,
            isSameDay(day, selectedDate) && styles.daySelected,
          ]}
          onPress={() => onSelectDate(currentDay)}
        >
          <Text
            style={[
              styles.dayText,
              !isSameMonth(day, monthStart) && styles.dayTextOutside,
              isSameDay(day, selectedDate) && styles.dayTextSelected,
              isSameDay(day, new Date()) && styles.dayTextToday,
            ]}
          >
            {format(day, 'd')}
          </Text>
          {hasEvents && <View style={styles.eventDot} />}
        </TouchableOpacity>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <View key={day.toISOString()} style={styles.week}>
        {days}
      </View>
    );
    days = [];
  }

  return (
    <View>
      {/* Weekday headers */}
      <View style={styles.weekdayHeader}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <Text key={i} style={styles.weekdayText}>
            {day}
          </Text>
        ))}
      </View>
      {rows}
    </View>
  );
}

function EventCard({ event }: { event: any }) {
  return (
    <BlurView intensity={20} tint="dark" style={styles.eventCard}>
      <View style={[styles.eventColorBar, { backgroundColor: event.color }]} />
      <View style={styles.eventContent}>
        <Text style={styles.eventTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.eventTime}>
          {event.isAllDay
            ? 'All day'
            : `${format(event.startTime, 'h:mm a')} - ${format(event.endTime, 'h:mm a')}`}
        </Text>
        {event.location && (
          <Text style={styles.eventLocation} numberOfLines={1}>
            📍 {event.location}
          </Text>
        )}
      </View>
    </BlurView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    color: '#fff',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: FontWeights.bold,
  },
  scrollView: {
    flex: 1,
  },
  calendarCard: {
    margin: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  weekdayHeader: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  week: {
    flexDirection: 'row',
  },
  day: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  daySelected: {
    backgroundColor: Colors.dark.tint,
    borderRadius: BorderRadius.sm,
  },
  dayOutside: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: FontSizes.md,
    color: '#fff',
  },
  dayTextSelected: {
    fontWeight: FontWeights.bold,
  },
  dayTextOutside: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  dayTextToday: {
    color: Colors.dark.tint,
    fontWeight: FontWeights.bold,
  },
  eventDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.tint,
  },
  eventsSection: {
    padding: Spacing.lg,
  },
  eventsSectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: '#fff',
    marginBottom: Spacing.md,
  },
  eventCard: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  eventColorBar: {
    width: 4,
  },
  eventContent: {
    flex: 1,
    padding: Spacing.md,
  },
  eventTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: '#fff',
    marginBottom: Spacing.xs,
  },
  eventTime: {
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: Spacing.xs,
  },
  eventLocation: {
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  emptyCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: FontWeights.light,
  },
});
