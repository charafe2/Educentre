import React from 'react';
import {
  ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps,
  View, ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, shadow, spacing, statusMeta, StatusKey } from '../theme';
import { useI18n } from '../i18n/I18nContext';

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ title, action, onAction }: {
  title: string; action?: string; onAction?: () => void;
}) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function StatCard({ label, value, hint, hintColor, icon, iconColor, iconBg }: {
  label: string; value: string; hint?: string; hintColor?: string;
  icon: keyof typeof Ionicons.glyphMap; iconColor: string; iconBg: string;
}) {
  return (
    <Card style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {hint ? <Text style={[styles.statHint, { color: hintColor ?? colors.gray500 }]}>{hint}</Text> : null}
    </Card>
  );
}

export function Avatar({ name, color, size = 42, solid = false }: {
  name: string; color: string; size?: number; solid?: boolean;
}) {
  const initials = name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: solid ? color : `${color}22`, alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: solid ? colors.white : color, fontWeight: '700', fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}

export function Badge({ status }: { status: StatusKey }) {
  const meta = statusMeta[status];
  const { t } = useI18n();
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: meta.color }]} />
      <Text style={[styles.badgeText, { color: meta.color }]}>{t(`status.${status}`)}</Text>
    </View>
  );
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, style }: {
  title: string; onPress: () => void; variant?: 'primary' | 'ghost' | 'danger';
  loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        isPrimary && styles.buttonPrimary,
        isDanger && styles.buttonDanger,
        variant === 'ghost' && styles.buttonGhost,
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        (disabled || loading) && { opacity: 0.55 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary || isDanger ? colors.white : colors.blue} />
      ) : (
        <Text style={[
          styles.buttonText,
          (isPrimary || isDanger) ? { color: colors.white } : { color: colors.blue },
        ]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({ label, error, ...inputProps }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ marginBottom: spacing.base }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.gray300}
        style={[styles.fieldInput, !!error && { borderColor: colors.danger }]}
        {...inputProps}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function ProgressBar({ ratio, color = colors.blue, height = 6 }: {
  ratio: number; color?: string; height?: number;
}) {
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: colors.gray100, overflow: 'hidden' }}>
      <View style={{
        width: `${Math.min(Math.max(ratio, 0), 1) * 100}%`,
        height: '100%', borderRadius: height / 2, backgroundColor: color,
      }} />
    </View>
  );
}

export function EmptyState({ icon, title, body }: {
  icon: keyof typeof Ionicons.glyphMap; title: string; body?: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={26} color={colors.gray300} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray100,
    padding: spacing.base,
    ...shadow.card,
  },
  sectionTitleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: spacing.xl, marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: font.h3, fontWeight: '700', color: colors.black },
  sectionAction: { fontSize: font.small, fontWeight: '600', color: colors.blue },
  statCard: { flex: 1, minWidth: 150 },
  statIcon: {
    width: 34, height: 34, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.black, letterSpacing: -0.3 },
  statLabel: { fontSize: font.small, color: colors.gray500, marginTop: 2 },
  statHint: { fontSize: font.tiny, fontWeight: '600', marginTop: spacing.xs },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing.sm + 2, paddingVertical: 4, borderRadius: radius.full,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: font.tiny, fontWeight: '700' },
  button: {
    minHeight: 48, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  buttonPrimary: { backgroundColor: colors.blue, ...shadow.raised },
  buttonDanger: { backgroundColor: colors.danger },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5, borderColor: 'rgba(0,113,227,0.3)',
  },
  buttonText: { fontSize: font.body + 1, fontWeight: '600' },
  fieldLabel: { fontSize: font.small, fontWeight: '600', color: colors.gray700, marginBottom: 6 },
  fieldInput: {
    minHeight: 48, borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.md,
    paddingHorizontal: spacing.base, fontSize: font.body + 1, color: colors.black,
    backgroundColor: colors.white,
  },
  fieldError: { fontSize: font.tiny, color: colors.danger, marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: spacing.xxxl },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.gray50,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  emptyTitle: { fontSize: font.body, fontWeight: '700', color: colors.gray700 },
  emptyBody: {
    fontSize: font.small, color: colors.gray500, textAlign: 'center',
    marginTop: spacing.xs, maxWidth: 260,
  },
});
