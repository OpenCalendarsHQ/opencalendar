import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants/theme';

interface TaskSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (task: TaskFormData) => Promise<void>;
  initialData?: TaskFormData;
}

export interface TaskFormData {
  id?: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'todo' | 'in_progress' | 'done';
}

export function TaskSheet({ visible, onClose, onSave, initialData }: TaskSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [formData, setFormData] = useState<TaskFormData>(() => ({
    title: initialData?.title || '',
    description: initialData?.description || '',
    priority: initialData?.priority || 'medium',
    status: initialData?.status || 'todo',
  }));

  const [saving, setSaving] = useState(false);

  const snapPoints = useMemo(() => ['70%'], []);

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
      console.error('Failed to save task:', error);
      alert('Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const priorities: Array<{ value: 'low' | 'medium' | 'high'; label: string; color: string }> = [
    { value: 'low', label: 'Low', color: Colors.dark.success },
    { value: 'medium', label: 'Medium', color: Colors.dark.warning },
    { value: 'high', label: 'High', color: Colors.dark.danger },
  ];

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
              {initialData?.id ? 'Edit Task' : 'New Task'}
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
              placeholder="Task title"
              placeholderTextColor={Colors.dark.textSecondary}
            />
          </View>

          {/* Priority */}
          <View style={styles.field}>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityRow}>
              {priorities.map(priority => (
                <TouchableOpacity
                  key={priority.value}
                  style={[
                    styles.priorityChip,
                    formData.priority === priority.value && [
                      styles.priorityChipActive,
                      { backgroundColor: priority.color + '20', borderColor: priority.color }
                    ]
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, priority: priority.value }))}
                >
                  <Text
                    style={[
                      styles.priorityChipText,
                      formData.priority === priority.value && { color: priority.color }
                    ]}
                  >
                    {priority.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
              numberOfLines={6}
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
    minHeight: 120,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  priorityChip: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  priorityChipActive: {
    borderWidth: 2,
  },
  priorityChipText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
