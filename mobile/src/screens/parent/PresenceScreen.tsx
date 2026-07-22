import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, spacing } from '../../theme';
import { Badge, Card, ChildSwitchBack, EmptyState, ProgressBar, SectionTitle } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { formatDateFR, studentAttendance } from '../../data/selectors';
import { AttendanceStatus } from '../../types';

const STATUS_ICON: Record<AttendanceStatus, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  present: { icon: 'checkmark', color: colors.success, bg: colors.successBg },
  absent: { icon: 'close', color: colors.danger, bg: colors.dangerBg },
  late: { icon: 'time-outline', color: colors.warning, bg: colors.warningBg },
  excused: { icon: 'document-text-outline', color: colors.gray500, bg: colors.gray100 },
};

export default function PresenceScreen() {
  const { parentStudent: student, parentChildren, switchChild } = useAuth();
  const { t } = useI18n();
  if (!student) return null;

  const history = studentAttendance(student.id);
  const ratio = student.totalSessions
    ? (student.totalSessions - student.absenceCount) / student.totalSessions
    : 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {parentChildren.length > 1 ? <ChildSwitchBack onPress={switchChild} /> : null}
      <ScrollView
        contentContainerStyle={[
          { padding: spacing.base },
          parentChildren.length > 1 && { paddingTop: spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t('presence.title')}</Text>
        <Text style={styles.subtitle}>{t('presence.subtitle', { name: student.firstName })}</Text>

        <Card style={{ marginTop: spacing.md }}>
          <View style={styles.summaryRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bigValue}>{Math.round(ratio * 100)}%</Text>
              <Text style={styles.bigLabel}>{t('presence.rate')}</Text>
            </View>
            <View style={styles.summaryStats}>
              <Text style={styles.summaryLine}>
                <Text style={{ fontWeight: '800', color: colors.black }}>
                  {student.totalSessions - student.absenceCount}
                </Text> {t('presence.presences')}
              </Text>
              <Text style={styles.summaryLine}>
                <Text style={{ fontWeight: '800', color: colors.danger }}>
                  {student.absenceCount}
                </Text> {t('presence.absences')}
              </Text>
            </View>
          </View>
          <View style={{ marginTop: spacing.md }}>
            <ProgressBar
              ratio={ratio}
              color={ratio > 0.85 ? colors.success : ratio > 0.7 ? colors.warning : colors.danger}
              height={8}
            />
          </View>
        </Card>

        <SectionTitle title={t('presence.history')} />
        {history.length === 0 ? (
          <EmptyState icon="calendar-outline" title={t('presence.empty')} body={t('presence.emptyBody')} />
        ) : (
          <Card style={{ padding: 0 }}>
            {history.map((a, i) => {
              const meta = STATUS_ICON[a.status];
              return (
                <View key={a.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                  <View style={[styles.rowIcon, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon} size={16} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{a.classe?.subject ?? 'Cours'}</Text>
                    <Text style={styles.rowMeta}>
                      {formatDateFR(a.attendedOn)}{a.note ? ` · ${a.note}` : ''}
                    </Text>
                  </View>
                  <Badge status={a.status} />
                </View>
              );
            })}
          </Card>
        )}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  title: { fontSize: font.h2, fontWeight: '800', color: colors.black, letterSpacing: -0.3 },
  subtitle: { fontSize: font.small, color: colors.gray500, marginTop: 2 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  bigValue: { fontSize: 34, fontWeight: '800', color: colors.black, fontVariant: ['tabular-nums'] },
  bigLabel: { fontSize: font.tiny + 1, color: colors.gray500 },
  summaryStats: { gap: 4, alignItems: 'flex-end' },
  summaryLine: { fontSize: font.small, color: colors.gray500 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.base, paddingVertical: spacing.md, minHeight: 56,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.gray100 },
  rowIcon: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { fontSize: font.body, fontWeight: '600', color: colors.black },
  rowMeta: { fontSize: font.tiny + 1, color: colors.gray500, marginTop: 1 },
});
