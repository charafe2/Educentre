import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, font, formatMAD, spacing } from '../../theme';
import { Avatar, Card, SectionTitle } from '../../components/ui';
import { monthlyRevenue, weeklyAttendance } from '../../data/demo';
import { attendanceRate, financeSummary, riskStudents } from '../../data/selectors';

export default function AnalyticsScreen() {
  const maxRevenue = Math.max(...monthlyRevenue.map(m => m.amount));
  const finances = financeSummary();
  const risks = riskStudents();

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: spacing.base }}>
      <SectionTitle title="Revenus mensuels" />
      <Card>
        <Text style={styles.chartHint}>
          {formatMAD(monthlyRevenue[monthlyRevenue.length - 1].amount)} ce mois-ci
        </Text>
        <View
          style={styles.chartRow}
          accessibilityLabel={`Revenus mensuels, dernier mois ${formatMAD(monthlyRevenue[monthlyRevenue.length - 1].amount)}`}
        >
          {monthlyRevenue.map((m, i) => (
            <View key={m.month} style={styles.chartCol}>
              <View style={styles.chartTrack}>
                <View style={[
                  styles.chartBar,
                  { height: `${Math.round((m.amount / maxRevenue) * 100)}%` },
                  i === monthlyRevenue.length - 1 && { backgroundColor: colors.blue },
                ]} />
              </View>
              <Text style={styles.chartLabel}>{m.month}</Text>
            </View>
          ))}
        </View>
      </Card>

      <SectionTitle title="Présences" />
      <Card>
        <View style={styles.kpiRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kpiValue}>{attendanceRate()}%</Text>
            <Text style={styles.kpiLabel}>Taux de présence global</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.kpiValue}>{weeklyAttendance[weeklyAttendance.length - 1]}%</Text>
            <Text style={styles.kpiLabel}>Cette semaine</Text>
          </View>
        </View>
      </Card>

      <SectionTitle title="Recouvrement" />
      <Card>
        <View style={styles.kpiRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kpiValue}>
              {finances.expected ? Math.round((finances.collected / finances.expected) * 100) : 0}%
            </Text>
            <Text style={styles.kpiLabel}>Paiements encaissés</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kpiValue, { color: colors.danger }]}>
              {formatMAD(finances.overdue)}
            </Text>
            <Text style={styles.kpiLabel}>Montant en retard</Text>
          </View>
        </View>
      </Card>

      <SectionTitle title="Risque d'abandon" />
      {risks.map(({ student, score }) => (
        <Card key={student.id} style={{ marginBottom: spacing.sm }}>
          <View style={styles.riskRow}>
            <Avatar name={`${student.firstName} ${student.lastName}`} color={student.avatarColor} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={styles.riskName}>{student.firstName} {student.lastName}</Text>
              <Text style={styles.riskMeta}>
                {student.absenceCount} abs. · paiement {student.paymentStatus === 'overdue' ? 'en retard' : student.paymentStatus === 'pending' ? 'en attente' : 'à jour'}
              </Text>
            </View>
            <View style={styles.gauge}>
              <Text style={[
                styles.gaugeText,
                { color: score >= 70 ? colors.danger : colors.warning },
              ]}>
                {score}%
              </Text>
              <Text style={styles.gaugeLabel}>
                {score >= 70 ? 'Élevé' : 'Modéré'}
              </Text>
            </View>
          </View>
        </Card>
      ))}
      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  chartHint: { fontSize: font.small, fontWeight: '700', color: colors.black, marginBottom: spacing.md },
  chartRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' },
  chartCol: { flex: 1, alignItems: 'center', gap: 6 },
  chartTrack: {
    height: 110, width: '100%', maxWidth: 30, borderRadius: 8,
    backgroundColor: colors.gray100, justifyContent: 'flex-end', overflow: 'hidden',
  },
  chartBar: { width: '100%', borderRadius: 8, backgroundColor: colors.gray200 },
  chartLabel: { fontSize: font.tiny, color: colors.gray500 },
  kpiRow: { flexDirection: 'row', gap: spacing.base },
  kpiValue: { fontSize: 24, fontWeight: '800', color: colors.black, fontVariant: ['tabular-nums'] },
  kpiLabel: { fontSize: font.tiny + 1, color: colors.gray500, marginTop: 2 },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  riskName: { fontSize: font.body, fontWeight: '600', color: colors.black },
  riskMeta: { fontSize: font.tiny + 1, color: colors.gray500, marginTop: 1 },
  gauge: { alignItems: 'flex-end' },
  gaugeText: { fontSize: font.body + 2, fontWeight: '800', fontVariant: ['tabular-nums'] },
  gaugeLabel: { fontSize: font.tiny, color: colors.gray500 },
});
