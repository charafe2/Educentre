// Design tokens - mirror the Moujtahid web landing (src/app/pages/hero/hero.component.css)
export const colors = {
  white: '#FFFFFF',
  black: '#1D1D1F',
  blue: '#0071E3',
  blueDark: '#0057B3',
  blueLight: 'rgba(0, 113, 227, 0.08)',
  gray50: '#F5F5F7',
  gray100: '#E8E8ED',
  gray200: '#D2D2D7',
  gray300: '#AEAEB2',
  gray500: '#6E6E73',
  gray700: '#3D3D3F',
  success: '#34C759',
  successBg: 'rgba(52, 199, 89, 0.12)',
  warning: '#FF9500',
  warningBg: 'rgba(255, 149, 0, 0.12)',
  danger: '#FF3B30',
  dangerBg: 'rgba(255, 59, 48, 0.12)',
  violet: '#9B55E6',
  violetBg: 'rgba(155, 85, 230, 0.12)',
  teal: '#22B58D',
  tealBg: 'rgba(34, 181, 141, 0.13)',
  gold: '#ECA72C',
  goldBg: 'rgba(236, 167, 44, 0.15)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 28,
  full: 9999,
};

export const font = {
  h1: 28,
  h2: 22,
  h3: 18,
  body: 15,
  small: 13,
  tiny: 11,
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  raised: {
    shadowColor: '#0071E3',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
};

export const statusMeta = {
  paid: { label: 'Payé', color: colors.success, bg: colors.successBg },
  pending: { label: 'En attente', color: colors.warning, bg: colors.warningBg },
  overdue: { label: 'En retard', color: colors.danger, bg: colors.dangerBg },
  present: { label: 'Présent', color: colors.success, bg: colors.successBg },
  absent: { label: 'Absent', color: colors.danger, bg: colors.dangerBg },
  late: { label: 'Retard', color: colors.warning, bg: colors.warningBg },
  excused: { label: 'Excusé', color: colors.gray500, bg: colors.gray100 },
  active: { label: 'Actif', color: colors.success, bg: colors.successBg },
  inactive: { label: 'Inactif', color: colors.gray500, bg: colors.gray100 },
} as const;

export type StatusKey = keyof typeof statusMeta;

export const formatMAD = (n: number): string =>
  `${n.toLocaleString('fr-FR')} DH`;
