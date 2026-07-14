import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, formatMAD, radius, spacing } from '../../theme';
import { Avatar, Badge, Card, SectionTitle, StatCard } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { DAYS_FR, weeklyAttendance } from '../../data/demo';
import {
  activeStudents, attendanceRate, financeSummary, formatMonthFR, riskStudents, sessionsOfDay,
} from '../../data/selectors';
import { CURRENT_MONTH } from '../../data/demo';

export default function DashboardScreen() {
  const { adminUser } = useAuth();
  const finances = financeSummary();
  const actifs = activeStudents();
  const presence = attendanceRate();
  const risks = riskStudents().slice(0, 3);

  // Journée simulée : lundi (les données de démo y ont des séances).
  const today = 0;
  const todaySessions = sessionsOfDay(today);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>Bonjour 👋</Text>
            <Text style={styles.name}>{adminUser?.name ?? 'Directeur'}</Text>
          </View>
          <View style={styles.monthPill}>
            <Ionicons name="calendar-outline" size={14} color={colors.blue} />
            <Text style={styles.monthText}>{formatMonthFR(CURRENT_MONTH)}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            label="Élèves actifs" value={String(actifs.length)}
            hint="▲ 2 ce mois" hintColor={colors.success}
            icon="school-outline" iconColor={colors.blue} iconBg={colors.blueLight}
          />
          <StatCard
            label="Taux de présence" value={`${presence}%`}
            hint="▲ 2,1 %" hintColor={colors.success}
            icon="checkmark-done-outline" iconColor={colors.teal} iconBg={colors.tealBg}
          />
        </View>
        <View style={styles.statsGrid}>
          <StatCard
            label="Encaissé ce mois" value={formatMAD(finances.collected)}
            hint={`${finances.paidCount}/${finances.count} paiements`}
            icon="wallet-outline" iconColor={colors.gold} iconBg={colors.goldBg}
          />
          <StatCard
            label="Impayés" value={formatMAD(finances.overdue)}
            hint="À relancer" hintColor={colors.danger}
            icon="alert-circle-outline" iconColor={colors.danger} iconBg={colors.dangerBg}
          />
        </View>

        <SectionTitle title="Présences — 7 dernières semaines" />
        <Card>
          <View style={styles.chartRow} accessibilityLabel={`Présences hebdomadaires, dernière semaine ${weeklyAttendance[weeklyAttendance.length - 1]} pour cent`}>
            {weeklyAttendance.map((v, i) => (
              <View key={i} style={styles.chartCol}>
                <View style={styles.chartBarTrack}>
                  <View style={[
                    styles.chartBar,
                    { height: `${v}%` },
                    i === weeklyAttendance.length - 1 && { backgroundColor: colors.blue },
                  ]} />
                </View>
                <Text style={styles.chartValue}>{v}</Text>
              </View>
            ))}
          </View>
        </Card>

        <SectionTitle title={`Séances du jour — ${DAYS_FR[today]}`} />
        <Card style={{ padding: 0 }}>
          {todaySessions.map((s, i) => (
            <View key={s.id} style={[styles.sessionRow, i > 0 && styles.rowBorder]}>
              <View style={[styles.sessionDot, { backgroundColor: s.classe.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionName}>{s.classe.name}</Text>
                <Text style={styles.sessionMeta}>
                  {s.classe.teacherName} · {s.classe.roomName}
                </Text>
              </View>
              <Text style={styles.sessionTime}>{s.startHour}h–{s.endHour}h</Text>
            </View>
          ))}
        </Card>

        <SectionTitle title="Élèves à risque" />
        {risks.map(({ student, score }) => (
          <Card key={student.id} style={{ marginBottom: spacing.sm }}>
            <View style={styles.riskRow}>
              <Avatar name={`${student.firstName} ${student.lastName}`} color={student.avatarColor} />
              <View style={{ flex: 1 }}>
                <Text style={styles.riskName}>{student.firstName} {student.lastName}</Text>
                <Text style={styles.riskMeta}>
                  {student.absenceCount} absences / {student.totalSessions} séances
                </Text>
              </View>
              <View style={styles.riskScoreWrap}>
                <Text style={[
                  styles.riskScore,
                  { color: score >= 70 ? colors.danger : colors.warning },
                ]}>
                  {score}%
                </Text>
                <Badge status={student.paymentStatus} />
              </View>
            </View>
          </Card>
        ))}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  content: { padding: spacing.base },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  hello: { fontSize: font.small, color: colors.gray500 },
  name: { fontSize: font.h2, fontWeight: '800', color: colors.black, letterSpacing: -0.3 },
  monthPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.blueLight, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: 6,
  },
  monthText: { fontSize: font.tiny + 1, fontWeight: '700', color: colors.blue },
  statsGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  chartRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' },
  chartCol: { flex: 1, alignItems: 'center', gap: 6 },
  chartBarTrack: {
    height: 96, width: '100%', maxWidth: 26, borderRadius: 7,
    backgroundColor: colors.gray100, justifyContent: 'flex-end', overflow: 'hidden',
  },
  chartBar: { width: '100%', borderRadius: 7, backgroundColor: colors.gray200 },
  chartValue: { fontSize: font.tiny, color: colors.gray500, fontVariant: ['tabular-nums'] },
  sessionRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.base, paddingVertical: spacing.md, minHeight: 56,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.gray100 },
  sessionDot: { width: 10, height: 10, borderRadius: 5 },
  sessionName: { fontSize: font.body, fontWeight: '600', color: colors.black },
  sessionMeta: { fontSize: font.tiny + 1, color: colors.gray500, marginTop: 1 },
  sessionTime: { fontSize: font.small, fontWeight: '700', color: colors.blue, fontVariant: ['tabular-nums'] },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  riskName: { fontSize: font.body, fontWeight: '600', color: colors.black },
  riskMeta: { fontSize: font.tiny + 1, color: colors.gray500, marginTop: 1 },
  riskScoreWrap: { alignItems: 'flex-end', gap: 4 },
  riskScore: { fontSize: font.body + 1, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
