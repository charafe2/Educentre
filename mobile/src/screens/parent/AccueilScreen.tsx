import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, spacing } from '../../theme';
import { Avatar, Card, ChildSwitchBack, SectionTitle, StatCard } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { DAYS_FR } from '../../data/demo';
import {
  formatDateFR, studentAttendance, studentAverage, studentGrades, studentSessions,
} from '../../data/selectors';

export default function AccueilScreen() {
  const { parentStudent: student, parentChildren, switchChild } = useAuth();
  const { t } = useI18n();
  if (!student) return null;

  const average = studentAverage(student.id);
  const presenceRatio = student.totalSessions
    ? Math.round(((student.totalSessions - student.absenceCount) / student.totalSessions) * 100)
    : 0;
  const nextSessions = studentSessions(student).filter(s => !s.isCancelled).slice(0, 3);
  const lastGrade = studentGrades(student.id)[0];
  const lastAttendance = studentAttendance(student.id)[0];

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
        <View style={styles.header}>
          <Avatar name={`${student.firstName} ${student.lastName}`} color={student.avatarColor} size={52} />
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>{t('accueil.following')}</Text>
            <Text style={styles.name}>{student.firstName} {student.lastName}</Text>
            <Text style={styles.school}>{student.school} · {student.level}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            label={t('accueil.average')}
            value={average !== null ? `${average}/20` : '-'}
            hint={lastGrade ? t('accueil.lastGrade', { score: lastGrade.score }) : undefined}
            hintColor={colors.success}
            icon="trending-up-outline" iconColor={colors.teal} iconBg={colors.tealBg}
          />
          <StatCard
            label={t('accueil.attendance')}
            value={`${presenceRatio}%`}
            hint={`${student.absenceCount} ${student.absenceCount > 1 ? t('common.absences') : t('common.absence')}`}
            hintColor={student.absenceCount > 2 ? colors.danger : colors.gray500}
            icon="checkmark-circle-outline" iconColor={colors.blue} iconBg={colors.blueLight}
          />
        </View>

        <SectionTitle title={t('accueil.nextCourses')} />
        <Card style={{ padding: 0 }}>
          {nextSessions.map((s, i) => (
            <View key={s.id} style={[styles.sessionRow, i > 0 && styles.rowBorder]}>
              <View style={[styles.dayBadge, { backgroundColor: s.classe.bgColor }]}>
                <Text style={[styles.dayBadgeText, { color: s.classe.color }]}>
                  {DAYS_FR[s.day].slice(0, 3)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionName}>{s.classe.subject}</Text>
                <Text style={styles.sessionMeta}>{s.classe.teacherName} · {s.classe.roomName}</Text>
              </View>
              <Text style={styles.sessionTime}>{s.startHour}h–{s.endHour}h</Text>
            </View>
          ))}
        </Card>

        {lastAttendance ? (
          <>
            <SectionTitle title={t('accueil.lastActivity')} />
            <Card>
              <View style={styles.activityRow}>
                <View style={[
                  styles.activityIcon,
                  { backgroundColor: lastAttendance.status === 'present' ? colors.successBg : lastAttendance.status === 'absent' ? colors.dangerBg : colors.warningBg },
                ]}>
                  <Ionicons
                    name={lastAttendance.status === 'present' ? 'checkmark' : lastAttendance.status === 'absent' ? 'close' : 'time-outline'}
                    size={18}
                    color={lastAttendance.status === 'present' ? colors.success : lastAttendance.status === 'absent' ? colors.danger : colors.warning}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityTitle}>
                    {lastAttendance.status === 'present' ? t('accueil.present')
                      : lastAttendance.status === 'absent' ? t('accueil.absent')
                      : lastAttendance.status === 'late' ? t('accueil.late') : t('accueil.excused')}
                  </Text>
                  <Text style={styles.activityMeta}>
                    {lastAttendance.classe?.subject} · {formatDateFR(lastAttendance.attendedOn)}
                  </Text>
                </View>
              </View>
            </Card>
          </>
        ) : null}

        <View style={styles.secureNote}>
          <Ionicons name="shield-checkmark-outline" size={15} color={colors.gray500} />
          <Text style={styles.secureText}>
            {t('accueil.secure')}
          </Text>
        </View>
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  hello: { fontSize: font.tiny + 1, color: colors.gray500 },
  name: { fontSize: font.h2, fontWeight: '800', color: colors.black, letterSpacing: -0.3 },
  school: { fontSize: font.tiny + 1, color: colors.gray500, marginTop: 1 },
  statsGrid: { flexDirection: 'row', gap: spacing.md },
  sessionRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.base, paddingVertical: spacing.md, minHeight: 58,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.gray100 },
  dayBadge: {
    width: 46, height: 40, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  dayBadgeText: { fontSize: font.tiny + 1, fontWeight: '800' },
  sessionName: { fontSize: font.body, fontWeight: '600', color: colors.black },
  sessionMeta: { fontSize: font.tiny + 1, color: colors.gray500, marginTop: 1 },
  sessionTime: { fontSize: font.small, fontWeight: '700', color: colors.blue, fontVariant: ['tabular-nums'] },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  activityIcon: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  activityTitle: { fontSize: font.body, fontWeight: '600', color: colors.black },
  activityMeta: { fontSize: font.tiny + 1, color: colors.gray500, marginTop: 1 },
  secureNote: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: spacing.xl,
  },
  secureText: { fontSize: font.tiny + 1, color: colors.gray500 },
});
