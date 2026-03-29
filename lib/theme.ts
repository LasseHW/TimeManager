export const t = {
  // Backgrounds
  bg: '#F8F9FA',
  card: '#FFFFFF',
  cardHover: '#F3F4F6',

  // Text
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textPlaceholder: '#D1D5DB',

  // Accent
  accent: '#6366F1',
  accentLight: '#EEF2FF',
  accentBorder: '#C7D2FE',

  // Borders & Shadows
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  shadow: 'rgba(0,0,0,0.08)',
  shadowMd: 'rgba(0,0,0,0.12)',

  // Status
  green: '#22C55E',
  greenBg: '#F0FDF4',
  greenBorder: '#BBF7D0',
  yellow: '#EAB308',
  yellowBg: '#FEFCE8',
  red: '#EF4444',
  redBg: '#FEF2F2',

  // Radii
  radiusCard: 12,
  radiusInput: 8,
  radiusChip: 999,

  // Card shadow (RN compatible)
  cardShadow: {
    shadowColor: '#000' as const,
    shadowOffset: { width: 0, height: 1 } as const,
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
};
