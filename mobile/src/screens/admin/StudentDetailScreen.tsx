import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, formatMAD, radius, spacing } from '../../theme';
import { Avatar, Badge, Card, EmptyState, ProgressBar, SectionTitle } from '../../components/ui';
import {
  formatDateFR, formatMonthFR, getStudent, studentAverage, studentClasses,
  studentGrades, studentPayments,
} from '../../data/selectors';
import { AdminStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AdminStackParamList, 'StudentDetail'>;

export default function StudentDetailScreen({ route }: Props) {
  const student = getStudent(route.params.studentId);
  if (!student) {
    return <EmptyState icon="alert-circle-outline" title="Élève introuvable" />;
  }

  const classesList = studentClasses(student);
  const gradesList = studentGrades(student.id);
  const paymentsList = studentPayments(student.id).slice(0, 6);
  const average = studentAverage(student.id);
  const presenceRatio = student.totalSessions
    ? (student.totalSessions - student.absenceCount) / student.totalSessions
    : 0;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: spacing.base }}>
      <Card>
        <View style={styles.headerRow}>
          <Avatar name={`${student.firstName} ${student.lastName}`} color={student.avatarColor} size={54} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{student.firstName} {student.lastName}</Text>
            <Text style={styles.meta}>{student.code} · {student.level}</Text>
            <Text style={styles.meta}>{student.school}</Text>
          </View>
          <Badge status={student.status} />
        </View>
        <View style={styles.contactRow}>
          <Ionicons name="call-outline" size={14} color={colors.gray500} />
          <Text style={styles.contact}>
            {student.parentName} — {student.parentPhone}
          </Text>
        </View>
      </Card>

      <View style={styles.kpis}>
        <Card style={styles.kpi}>
          <Text style={styles.kpiValue}>{Math.round(presenceRatio * 100)}%</Text>
          <Text style={styles.kpiLabel}>Présence</Text>
          <ProgressBar ratio={presenceRatio} color={presenceRatio > 0.85 ? colors.success : colors.warning} />
        </Card>
        <Card style={styles.kpi}>
          <Text style={styles.kpiValue}>{average !== null ? `${average}/20` : '—'}</Text>
          <Text style={styles.kpiLabel}>Moyenne générale</Text>
          <ProgressBar ratio={average !== null ? average / 20 : 0} color={colors.blue} />
        </Card>
      </View>

      <SectionTitle title="Cours inscrits" />
      <Card style={{ padding: 0 }}>
        {classesList.map((c, i) => (
          <View key={c.id} style={[styles.listRow, i > 0 && styles.rowBorder]}>
            <View style={[styles.dot, { backgroundColor: c.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{c.name}</Text>
              <Text style={styles.rowMeta}>{c.teacherName} · {formatMAD(c.monthlyPrice)}/mois</Text>
            </View>
          </View>
        ))}
      </Card>

      <SectionTitle title="Dernières notes" />
      {gradesList.length ? (
        <Card style={{ padding: 0 }}>
          {gradesList.map((g, i) => (
            <View key={g.id} style={[styles.listRow, i > 0 && styles.rowBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{g.label}</Text>
                <Text style={styles.rowMeta}>{g.classe?.subject} · {formatDateFR(g.date)}</Text>
              </View>
              <Text style={[
                styles.grade,
                { color: g.score >= 14 ? colors.success : g.score >= 10 ? colors.warning : colors.danger },
              ]}>
                {g.score}/20
              </Text>
            </View>
          ))}
        </Card>
      ) : (
        <Card><Text style={styles.rowMeta}>Aucune note enregistrée.</Text></Card>
      )}

      <SectionTitle title="Paiements récents" />
      <Card style={{ padding: 0 }}>
        {paymentsList.map((p, i) => (
          <View key={p.id} style={[styles.listRow, i > 0 && styles.rowBorder]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{formatMonthFR(p.periodMonth)}</Text>
              <Text style={styles.rowMeta}>{p.classe?.subject}{p.method ? ` · ${p.method}` : ''}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={styles.amount}>{formatMAD(p.amount)}</Text>
              <Badge status={p.status} />
            </View>
          </View>
        ))}
      </Card>
      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { fontSize: font.h3, fontWeight: '800', color: colors.black },
  meta: { fontSize: font.tiny + 1, color: colors.gray500, marginTop: 1 },
  contactRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: spacing.md, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.gray100,
  },
  contact: { fontSize: font.small, color: colors.gray700 },
  kpis: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  kpi: { flex: 1, gap: 6 },
  kpiValue: { fontSize: 22, fontWeight: '800', color: colors.black, fontVariant: ['tabular-nums'] },
  kpiLabel: { fontSize: font.tiny + 1, color: colors.gray500 },
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.base, paddingVertical: spacing.md, minHeight: 54,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.gray100 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowTitle: { fontSize: font.body, fontWeight: '600', color: colors.black },
  rowMeta: { fontSize: font.tiny + 1, color: colors.gray500, marginTop: 1 },
  grade: { fontSize: font.body, fontWeight: '800', fontVariant: ['tabular-nums'] },
  amount: { fontSize: font.body, fontWeight: '700', color: colors.black, fontVariant: ['tabular-nums'] },
});
