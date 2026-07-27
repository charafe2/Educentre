import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polyline } from 'react-native-svg';
import { colors, font, radius, shadow, spacing } from '../theme';
import { Avatar } from './ui';
import { useI18n } from '../i18n/I18nContext';
import { Student } from '../types';

// Petite courbe montante décorative (carte "taux de présence"), pour le côté
// premium des apps iOS. Pas de données réelles — c'est un accent visuel.
export function Sparkline({ color = colors.success, width = 54, height = 22 }: {
  color?: string; width?: number; height?: number;
}) {
  return (
    <Svg width={width} height={height}>
      <Polyline
        points="0,18 11,15 22,17 33,9 44,11 54,3"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Pilule "Changer" pour basculer d'un enfant à l'autre (fratrie).
function ChildSwitchPill({ onPress, onNavy }: { onPress: () => void; onNavy?: boolean }) {
  const { t } = useI18n();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('accueil.changeChild')}
      hitSlop={8}
      style={({ pressed }) => [
        styles.changePill,
        onNavy ? styles.changePillNavy : styles.changePillLight,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.changeText, onNavy ? { color: colors.navy } : { color: colors.blue }]}>
        {t('accueil.changeChild')}
      </Text>
      <Ionicons name="chevron-down" size={14} color={onNavy ? colors.navy : colors.blue} />
    </Pressable>
  );
}

function NotificationBell({ count, onPress }: { count: number; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Notifications"
      hitSlop={8}
      style={({ pressed }) => [styles.bell, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name="notifications-outline" size={22} color={colors.gray700} />
      {count > 0 ? (
        <View style={styles.bellBadge}>
          <Text style={styles.bellBadgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// En-tête clair de l'Accueil : avatar parent, salutation, rôle, et cloche de
// notifications — sur fond blanc, façon app iOS (le seul bloc coloré est la
// carte enfant juste en dessous).
export function ParentGreeting({ parentName, notificationCount, onPressBell }: {
  parentName: string; notificationCount: number; onPressBell?: () => void;
}) {
  const { t } = useI18n();
  return (
    <View style={styles.greetRow}>
      <Avatar name={parentName} color={colors.success} size={46} solid />
      <View style={{ flex: 1 }}>
        <Text style={styles.greetHello}>{t('accueil.greeting')}</Text>
        <Text style={styles.greetName} numberOfLines={1}>{parentName}</Text>
        <Text style={styles.greetRole}>{t('accueil.parentRole')}</Text>
      </View>
      <NotificationBell count={notificationCount} onPress={onPressBell} />
    </View>
  );
}

// Carte "enfant suivi" — bloc marine arrondi, seul élément foncé de l'écran.
export function ChildSwitchCard({ student, multiChildren, onSwitchChild }: {
  student: Student; multiChildren: boolean; onSwitchChild: () => void;
}) {
  return (
    <View style={styles.childCard}>
      <Avatar name={`${student.firstName} ${student.lastName}`} color={student.avatarColor} size={44} solid />
      <View style={{ flex: 1 }}>
        <Text style={styles.childName} numberOfLines={1}>{student.firstName} {student.lastName}</Text>
        <Text style={styles.childMeta} numberOfLines={1}>{student.level}</Text>
      </View>
      {multiChildren ? <ChildSwitchPill onPress={onSwitchChild} onNavy /> : null}
    </View>
  );
}

// Titre de section façon liste groupée iOS : petit label capitales espacé,
// précédé d'une icône, avec une action optionnelle ("Voir tout") à droite.
export function IOSSection({ icon, label, action, onAction }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; action?: string; onAction?: () => void;
}) {
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionLeft}>
        <Ionicons name={icon} size={13} color={colors.gray500} />
        <Text style={styles.sectionLabel}>{label.toUpperCase()}</Text>
      </View>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// En-tête clair réutilisé sur les autres onglets parent (Cours, Présence,
// Notes, Paiements) : grand titre + sous-titre, pilule "Changer" si fratrie.
export function ParentPageHeader({ title, subtitle, student, multiChildren, onSwitchChild }: {
  title: string; subtitle?: string; student: Student;
  multiChildren: boolean; onSwitchChild: () => void;
}) {
  return (
    <View style={styles.pageHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.pageTitle}>{title}</Text>
        {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
      </View>
      {multiChildren ? (
        <View style={styles.pageHeaderChild}>
          <Avatar name={`${student.firstName} ${student.lastName}`} color={student.avatarColor} size={34} solid />
          <ChildSwitchPill onPress={onSwitchChild} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  greetRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingTop: spacing.sm, paddingBottom: spacing.lg,
  },
  greetHello: { fontSize: font.tiny + 1, color: colors.gray500 },
  greetName: { fontSize: font.h3, fontWeight: '800', color: colors.black, letterSpacing: -0.3 },
  greetRole: { fontSize: font.tiny, color: colors.gray500, marginTop: 1 },
  bell: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.gray100,
    alignItems: 'center', justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 2, borderColor: colors.gray50,
  },
  bellBadgeText: { fontSize: 9, fontWeight: '800', color: colors.white },
  childCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.navy, borderRadius: radius.lg,
    padding: spacing.base, marginBottom: spacing.lg,
    ...shadow.card,
    shadowColor: colors.navy, shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
  },
  childName: { fontSize: font.body + 1, fontWeight: '700', color: colors.onNavy },
  childMeta: { fontSize: font.tiny + 1, color: colors.onNavyMuted, marginTop: 2 },
  changePill: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingLeft: spacing.md, paddingRight: spacing.sm, paddingVertical: 7, borderRadius: radius.full,
  },
  changePillNavy: { backgroundColor: colors.white },
  changePillLight: { backgroundColor: colors.blueLight },
  changeText: { fontSize: font.tiny + 1, fontWeight: '700' },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: spacing.xl, marginBottom: spacing.sm + 2, paddingHorizontal: 2,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionLabel: { fontSize: font.tiny + 1, fontWeight: '800', color: colors.gray500, letterSpacing: 0.7 },
  sectionAction: { fontSize: font.small, fontWeight: '700', color: colors.blue },
  pageHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingTop: spacing.sm, paddingBottom: spacing.md,
  },
  pageTitle: { fontSize: font.h1, fontWeight: '800', color: colors.black, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: font.small, color: colors.gray500, marginTop: 2 },
  pageHeaderChild: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
