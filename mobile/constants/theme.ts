export const Colors = {
  light: {
    background: '#FFFFFF',
    backgroundSecondary: '#F5F5F7',
    text: '#000000',
    textSecondary: '#6E6E73',
    border: '#D1D1D6',
    card: 'rgba(255, 255, 255, 0.7)',
    blur: 'rgba(255, 255, 255, 0.5)',
    tint: '#007AFF',
    danger: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
  },
  dark: {
    background: '#000000',
    backgroundSecondary: '#1C1C1E',
    text: '#FFFFFF',
    textSecondary: '#98989D',
    border: '#38383A',
    card: 'rgba(28, 28, 30, 0.7)',
    blur: 'rgba(28, 28, 30, 0.5)',
    tint: '#0A84FF',
    danger: '#FF453A',
    success: '#32D74B',
    warning: '#FF9F0A',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const FontWeights = {
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const calendarColors = [
  { name: 'Red', value: '#FF3B30' },
  { name: 'Orange', value: '#FF9500' },
  { name: 'Yellow', value: '#FFCC00' },
  { name: 'Green', value: '#34C759' },
  { name: 'Teal', value: '#5AC8FA' },
  { name: 'Blue', value: '#007AFF' },
  { name: 'Purple', value: '#AF52DE' },
  { name: 'Pink', value: '#FF2D55' },
  { name: 'Gray', value: '#8E8E93' },
];
