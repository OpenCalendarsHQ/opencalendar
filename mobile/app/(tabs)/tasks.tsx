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
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../lib/api/client';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '../../constants/theme';

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  priority?: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'done';
  calendarId?: string;
}

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getTasks();
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const toggleTask = async (task: Task) => {
    try {
      const newStatus = task.status === 'done' ? 'todo' : 'done';
      await apiClient.updateTask({ id: task.id, status: newStatus });
      await fetchTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const doneTasks = tasks.filter(t => t.status === 'done');

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
          <Text style={styles.headerTitle}>Tasks</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchTasks} tintColor="#fff" />
          }
        >
          {/* Todo Tasks */}
          <TaskSection title="To Do" tasks={todoTasks} onToggleTask={toggleTask} />

          {/* In Progress Tasks */}
          <TaskSection title="In Progress" tasks={inProgressTasks} onToggleTask={toggleTask} />

          {/* Done Tasks */}
          <TaskSection title="Done" tasks={doneTasks} onToggleTask={toggleTask} />
        </ScrollView>

        {/* Add Task Button */}
        <TouchableOpacity style={styles.fab}>
          <BlurView intensity={40} tint="dark" style={styles.fabBlur}>
            <Text style={styles.fabText}>+</Text>
          </BlurView>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

function TaskSection({
  title,
  tasks,
  onToggleTask,
}: {
  title: string;
  tasks: Task[];
  onToggleTask: (task: Task) => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {tasks.map(task => (
        <TaskCard key={task.id} task={task} onToggle={() => onToggleTask(task)} />
      ))}
    </View>
  );
}

function TaskCard({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const priorityColors = {
    low: '#34C759',
    medium: '#FF9500',
    high: '#FF3B30',
  };

  return (
    <BlurView intensity={20} tint="dark" style={styles.taskCard}>
      <TouchableOpacity onPress={onToggle} style={styles.checkbox}>
        <View
          style={[
            styles.checkboxInner,
            task.status === 'done' && styles.checkboxChecked,
          ]}
        >
          {task.status === 'done' && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>

      <View style={styles.taskContent}>
        <Text
          style={[
            styles.taskTitle,
            task.status === 'done' && styles.taskTitleDone,
          ]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        {task.description && (
          <Text style={styles.taskDescription} numberOfLines={1}>
            {task.description}
          </Text>
        )}
        {task.priority && (
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: priorityColors[task.priority] + '20' },
            ]}
          >
            <Text
              style={[
                styles.priorityText,
                { color: priorityColors[task.priority] },
              ]}
            >
              {task.priority.toUpperCase()}
            </Text>
          </View>
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
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: '#fff',
    marginBottom: Spacing.md,
  },
  taskCard: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  checkbox: {
    marginRight: Spacing.md,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.dark.tint,
    borderColor: Colors.dark.tint,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: FontWeights.bold,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    color: '#fff',
    marginBottom: Spacing.xs,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  taskDescription: {
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: Spacing.xs,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: BorderRadius.sm,
  },
  priorityText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
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
