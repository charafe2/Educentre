import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { colors, font, formatMAD, radius, shadow, spacing } from '../../theme';
import {
  ChildSwitchCard, IOSSection, ParentGreeting, Sparkline,
} from '../../components/ParentHeader';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { DAYS_FR } from '../../data/demo';
import {
  formatMonthFR, nextUpcomingSession, studentAverage, studentGrades, studentPayments, studentSessions,
} from '../../data/selectors';
import { ParentTabParamList } from '../../navigation/types';
import { Payment } from '../../types';

export default function AccueilScreen() {
  const { parentStudent: student, parentChildren, switchChild } = useAuth();
  const { t } = useI18n();
  const navigation = useNavigation<BottomTabNavigationProp<ParentTabParamList>>();
  if (!student) return null;

  const parentName = student.parentName ?? `${student.firstName} ${student.lastName}`;
  const presenceRatio = student.totalSessions
    ? Math.round(((student.totalSessions - student.absenceCount) / student.totalSessions) * 100)
    : 0;
  const weekCourses = studentSessions(student).filter(s => !s.isCancelled).length;
  const upcoming = nextUpcomingSession(student);
  const payments = studentPayments(student.id);
  const due = payments.filter(p => p.status !== 'paid');
  const average = studentAverage(student.id);

  const dayLabel = (daysAway: number, sessionDay: number) => {
    if (daysAway === 0) return t('accueil.today');
    if (daysAway === 1) return t('accueil.tomorrow');
    return DAYS_FR[sessionDay];
  };
  const dueDateLabel = (period: string) => t('accueil.dueDate', { date: `05 ${formatMonthFR(period)}` });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.base, paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <ParentGreeting parentName={parentName} notificationCount={due.length} />

        <ChildSwitchCard
          student={student}
          multiChildren={parentChildren.length > 1}
          onSwitchChild={switchChild}
        />

        {due.length > 0 ? (
          <Pressable
            onPress={() => navigation.navigate('Paiements')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.alertBanner, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="alert-circle" size={20} color={colors.danger} />
            <Text style={styles.alertText} numberOfLines={2}>
              {due.length > 1
                ? t('accueil.unpaidMany', { count: due.length })
                : t('accueil.unpaidOne', { count: due.length })}
            </Text>
            <View style={styles.alertAction}>
              <Text style={styles.alertActionText}>{t('accueil.viewAction')}</Text>
            </View>
          </Pressable>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statTop}>
              <View style={[styles.statIcon, { backgroundColor: colors.successBg }]}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              </View>
              <Sparkline color={colors.success} />
            </View>
            <Text style={styles.statValue}>{presenceRatio}<Text style={styles.statUnit}>%</Text></Text>
            <Text style={styles.statLabel}>{t('accueil.attendanceRate')}</Text>
            <View style={styles.statHintRow}>
              <View style={[styles.statHintDot, { backgroundColor: presenceRatio >= 85 ? colors.success : presenceRatio >= 70 ? colors.warning : colors.danger }]} />
              <Text style={[styles.statHint, { color: presenceRatio >= 85 ? colors.success : presenceRatio >= 70 ? colors.warning : colors.danger }]}>
                {presenceRatio >= 85 ? t('accueil.veryGood') : presenceRatio >= 70 ? t('accueil.good') : t('accueil.toImprove')}
              </Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statTop}>
              <View style={[styles.statIcon, { backgroundColor: colors.blueLight }]}>
                <Ionicons name="book" size={18} color={colors.blue} />
              </View>
            </View>
            <Text style={styles.statValue}>{weekCourses}</Text>
            <Text style={styles.statLabel}>{t('accueil.weekCourses')}</Text>
            {upcoming ? (
              <View style={styles.statHintRow}>
                <Ionicons name="time-outline" size={13} color={colors.gray500} />
                <Text style={[styles.statHint, { color: colors.gray500 }]}>
                  {t('accueil.next')} : {dayLabel(upcoming.daysAway, upcoming.session.day)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <IOSSection icon="calendar-outline" label={t('accueil.nextCourse')} />
        {upcoming ? (
          <View style={styles.courseCard}>
            <View style={styles.courseTitleRow}>
              <Text style={styles.courseName} numberOfLines={1}>{upcoming.session.classe.name}</Text>
              <View style={[styles.subjectBadge, { backgroundColor: upcoming.session.classe.bgColor }]}>
                <Text style={[styles.subjectBadgeText, { color: upcoming.session.classe.color }]}>
                  {upcoming.session.classe.subject}
                </Text>
              </View>
            </View>
            <View style={styles.courseMetaRow}>
              <Ionicons name="time-outline" size={14} color={colors.blue} />
              <Text style={styles.courseMetaStrong}>
                {dayLabel(upcoming.daysAway, upcoming.session.day)} · {upcoming.session.startHour}h–{upcoming.session.endHour}h
              </Text>
            </View>
            <View style={styles.courseFooter}>
              <Ionicons name="person-outline" size={14} color={colors.gray500} />
              <Text style={styles.courseFooterText}>{upcoming.session.classe.teacherName}</Text>
              <Ionicons name="location-outline" size={14} color={colors.gray500} style={{ marginLeft: spacing.md }} />
              <Text style={styles.courseFooterText}>{upcoming.session.classe.roomName}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}><Text style={styles.emptyText}>{t('accueil.noCourse')}</Text></View>
        )}

        <IOSSection
          icon="card-outline"
          label={t('accueil.recentPayments')}
          action={t('accueil.seeAll')}
          onAction={() => navigation.navigate('Paiements')}
        />
        {payments.length === 0 ? (
          <View style={styles.emptyCard}><Text style={styles.emptyText}>{t('accueil.noPayments')}</Text></View>
        ) : (
          payments.slice(0, 3).map(p => <PaymentRow key={p.id} payment={p} dueDateLabel={dueDateLabel} />)
        )}

        <IOSSection icon="school-outline" label={t('accueil.average')} action={t('accueil.seeAll')} onAction={() => navigation.navigate('Notes')} />
        <View style={styles.resultCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.violetBg }]}>
            <Ionicons name="ribbon" size={18} color={colors.violet} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.resultLabel}>{t('accueil.average')}</Text>
            <Text style={styles.resultMeta}>
              {studentGrades(student.id)[0]?.classe?.subject ?? t('accueil.noGrade')}
            </Text>
          </View>
          <Text style={styles.resultValue}>
            {average !== null ? average : '-'}<Text style={styles.resultMax}>/20</Text>
          </Text>
        </View>

        <View style={styles.secureNote}>
          <Ionicons name="shield-checkmark-outline" size={15} color={colors.gray500} />
          <Text style={styles.secureText}>{t('accueil.secure')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PaymentRow({ payment, dueDateLabel }: {
  payment: Payment & { classe?: { subject: string } }; dueDateLabel: (period: string) => string;
}) {
  const { t } = useI18n();
  const isPaid = payment.status === 'paid';
  const accent = isPaid ? colors.success : colors.danger;
  const bg = isPaid ? colors.successBg : colors.dangerBg;
  return (
    <View style={[styles.payCard, { borderLeftColor: accent }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.payTitle} numberOfLines={1}>
          {formatMonthFR(payment.periodMonth)}{payment.classe ? ` · ${payment.classe.subject}` : ''}
        </Text>
        {!isPaid ? <Text style={styles.payMeta}>{dueDateLabel(payment.periodMonth)}</Text> : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 5 }}>
        <Text style={styles.payAmount}>{formatMAD(payment.amount)}</Text>
        <View style={[styles.payPill, { backgroundColor: bg }]}>
          <Text style={[styles.payPillText, { color: accent }]}>
            {isPaid ? t('accueil.paid') : t('accueil.unpaid')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const CARD = {
  backgroundColor: colors.white,
  borderRadius: radius.lg,
  borderWidth: 1,
  borderColor: colors.gray100,
  ...shadow.card,
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.dangerBg, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.md,
  },
  alertText: { flex: 1, fontSize: font.small, fontWeight: '700', color: colors.danger },
  alertAction: {
    paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full,
    backgroundColor: colors.white,
  },
  alertActionText: { fontSize: font.tiny + 1, fontWeight: '800', color: colors.danger },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  statCard: { ...CARD, flex: 1, padding: spacing.base },
  statTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.sm, minHeight: 34,
  },
  statIcon: {
    width: 34, height: 34, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontSize: 30, fontWeight: '800', color: colors.black, letterSpacing: -0.6 },
  statUnit: { fontSize: 18, fontWeight: '800', color: colors.gray300 },
  statLabel: { fontSize: font.small, color: colors.gray500, marginTop: 1 },
  statHintRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.sm },
  statHintDot: { width: 6, height: 6, borderRadius: 3 },
  statHint: { fontSize: font.tiny + 1, fontWeight: '700' },
  courseCard: { ...CARD, padding: spacing.base },
  courseTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  courseName: { flex: 1, fontSize: font.body + 1, fontWeight: '700', color: colors.black },
  subjectBadge: { paddingHorizontal: spacing.sm + 2, paddingVertical: 4, borderRadius: radius.full },
  subjectBadgeText: { fontSize: font.tiny, fontWeight: '700' },
  courseMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  courseMetaStrong: { fontSize: font.small, fontWeight: '700', color: colors.blue, fontVariant: ['tabular-nums'] },
  courseFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.gray100,
  },
  courseFooterText: { fontSize: font.tiny + 1, color: colors.gray500 },
  emptyCard: { ...CARD, padding: spacing.lg, alignItems: 'center' },
  emptyText: { fontSize: font.small, color: colors.gray500 },
  payCard: {
    ...CARD, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.base, borderLeftWidth: 4, marginBottom: spacing.sm,
  },
  payTitle: { fontSize: font.body, fontWeight: '700', color: colors.black },
  payMeta: { fontSize: font.tiny + 1, color: colors.gray500, marginTop: 2 },
  payAmount: { fontSize: font.body, fontWeight: '800', color: colors.black, fontVariant: ['tabular-nums'] },
  payPill: { paddingHorizontal: spacing.sm + 2, paddingVertical: 3, borderRadius: radius.full },
  payPillText: { fontSize: font.tiny, fontWeight: '800' },
  resultCard: {
    ...CARD, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.base,
  },
  resultLabel: { fontSize: font.body, fontWeight: '700', color: colors.black },
  resultMeta: { fontSize: font.tiny + 1, color: colors.gray500, marginTop: 2 },
  resultValue: { fontSize: 26, fontWeight: '800', color: colors.black, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  resultMax: { fontSize: font.small, color: colors.gray300, fontWeight: '700' },
  secureNote: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: spacing.xl,
  },
  secureText: { fontSize: font.tiny + 1, color: colors.gray500 },
});
