import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants/theme';
import { useCalendars } from '../../lib/hooks/useCalendars';
import { format } from 'date-fns';

interface EventSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (event: EventFormData) => Promise<void>;
  initialData?: EventFormData;
  selectedDate?: Date;
}

export interface EventFormData {
  id?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  location?: string;
  calendarId?: string;
  color?: string;
}

export function EventSheet({ visible, onClose, onSave, initialData, selectedDate }: EventSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { calendars } = useCalendars();

  const [formData, setFormData] = useState<EventFormData>(() => ({
    title: initialData?.title || '',
    description: initialData?.description || '',
    startTime: initialData?.startTime || selectedDate || new Date(),
    endTime: initialData?.endTime || new Date(Date.now() + 3600000),
    isAllDay: initialData?.isAllDay || false,
    location: initialData?.location || '',
    calendarId: initialData?.calendarId,
    color: initialData?.color,
  }));

  const [saving, setSaving] = useState(false);

  const snapPoints = useMemo(() => ['90%'], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  React.useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }

    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save event:', error);
      alert('Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  // Get writable calendars
  const writableCalendars = useMemo(() => {
    const cals: Array<{ id: string; name: string; color: string }> = [];
    calendars.forEach(account => {
      account.calendars
        .filter(cal => !cal.isReadOnly)
        .forEach(cal => cals.push(cal));
    });
    return cals;
  }, [calendars]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.indicator}
    >
      <BottomSheetView style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {initialData?.id ? 'Edit Event' : 'New Event'}
            </Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={styles.saveButton}
                disabled={saving}
              >
                <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(title) => setFormData(prev => ({ ...prev, title }))}
              placeholder="Event title"
              placeholderTextColor={Colors.dark.textSecondary}
            />
          </View>

          {/* Calendar Selection */}
          <View style={styles.field}>
            <Text style={styles.label}>Calendar</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.calendarList}>
              {writableCalendars.map(cal => (
                <TouchableOpacity
                  key={cal.id}
                  style={[
                    styles.calendarChip,
                    formData.calendarId === cal.id && styles.calendarChipActive
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, calendarId: cal.id }))}
                >
                  <View style={[styles.calendarDot, { backgroundColor: cal.color }]} />
                  <Text style={[
                    styles.calendarChipText,
                    formData.calendarId === cal.id && styles.calendarChipTextActive
                  ]}>
                    {cal.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* All Day */}
          <View style={styles.field}>
            <View style={styles.row}>
              <Text style={styles.label}>All Day</Text>
              <Switch
                value={formData.isAllDay}
                onValueChange={(isAllDay) => setFormData(prev => ({ ...prev, isAllDay }))}
                trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: Colors.dark.tint }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Time */}
          <View style={styles.field}>
            <Text style={styles.label}>Time</Text>
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>Start</Text>
                <Text style={styles.timeValue}>
                  {format(formData.startTime, formData.isAllDay ? 'MMM dd, yyyy' : 'MMM dd, HH:mm')}
                </Text>
              </View>
              <View style={styles.timeField}>
                <Text style={styles.timeLabel}>End</Text>
                <Text style={styles.timeValue}>
                  {format(formData.endTime, formData.isAllDay ? 'MMM dd, yyyy' : 'MMM dd, HH:mm')}
                </Text>
              </View>
            </View>
          </View>

          {/* Location */}
          <View style={styles.field}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={formData.location}
              onChangeText={(location) => setFormData(prev => ({ ...prev, location }))}
              placeholder="Add location"
              placeholderTextColor={Colors.dark.textSecondary}
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(description) => setFormData(prev => ({ ...prev, description }))}
              placeholder="Add description"
              placeholderTextColor={Colors.dark.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sheetBackground: {
    backgroundColor: Colors.dark.backgroundSecondary,
  },
  indicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  cancelButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  cancelText: {
    fontSize: FontSizes.md,
    color: Colors.dark.textSecondary,
  },
  saveButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.dark.tint,
    borderRadius: BorderRadius.sm,
  },
  saveText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: '#fff',
  },
  field: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.md,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textArea: {
    minHeight: 100,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calendarList: {
    flexDirection: 'row',
  },
  calendarChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  calendarChipActive: {
    backgroundColor: Colors.dark.tint,
    borderColor: Colors.dark.tint,
  },
  calendarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  calendarChipText: {
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  calendarChipTextActive: {
    color: '#fff',
    fontWeight: FontWeights.semibold,
  },
  timeRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  timeField: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  timeLabel: {
    fontSize: FontSizes.xs,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: Spacing.xs,
  },
  timeValue: {
    fontSize: FontSizes.md,
    color: '#fff',
    fontWeight: FontWeights.medium,
  },
});
