import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, spacing } from '../../theme';
import { Card, EmptyState, ProgressBar, SectionTitle } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { formatDateFR, studentAverage, studentGrades } from '../../data/selectors';

export default function NotesScreen() {
  const { parentStudent: student } = useAuth();
  if (!student) return null;

  const gradesList = studentGrades(student.id);
  const average = studentAverage(student.id);

  // Moyenne par matière
  const bySubject = new Map<string, { total: number; count: number; color: string }>();
  gradesList.forEach(g => {
    const key = g.classe?.subject ?? 'Autre';
    const cur = bySubject.get(key) ?? { total: 0, count: 0, color: g.classe?.color ?? colors.blue };
    bySubject.set(key, { ...cur, total: cur.total + g.score, count: cur.count + 1 });
  });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.base }} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Notes</Text>
        <Text style={styles.subtitle}>Résultats de {student.firstName}</Text>

        <Card style={styles.heroCard}>
          <Text style={styles.heroLabel}>Moyenne générale</Text>
          <Text style={styles.heroValue}>{average !== null ? `${average}` : '—'}<Text style={styles.heroMax}>/20</Text></Text>
          {average !== null ? (
            <Text style={styles.heroHint}>
              {average >= 14 ? 'Excellent travail, continuez ainsi !' : average >= 10 ? 'En bonne voie — encore un effort.' : 'Un accompagnement est recommandé.'}
            </Text>
          ) : null}
        </Card>

        <SectionTitle title="Par matière" />
        <Card style={{ gap: spacing.md }}>
          {[...bySubject.entries()].map(([subject, v]) => {
            const avg = Math.round((v.total / v.count) * 10) / 10;
            return (
              <View key={subject}>
                <View style={styles.subjectRow}>
                  <Text style={styles.subjectName}>{subject}</Text>
                  <Text style={styles.subjectAvg}>{avg}/20</Text>
                </View>
                <ProgressBar ratio={avg / 20} color={v.color} />
              </View>
            );
          })}
        </Card>

        <SectionTitle title="Dernières évaluations" />
        {gradesList.length === 0 ? (
          <EmptyState icon="ribbon-outline" title="Aucune note" body="Les évaluations apparaîtront ici." />
        ) : (
          <Card style={{ padding: 0 }}>
            {gradesList.map((g, i) => (
              <View key={g.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{g.label}</Text>
                  <Text style={styles.rowMeta}>{g.classe?.subject} · {formatDateFR(g.date)}</Text>
                </View>
                <View style={[
                  styles.scoreBadge,
                  { backgroundColor: g.score >= 14 ? colors.successBg : g.score >= 10 ? colors.warningBg : colors.dangerBg },
                ]}>
                  <Text style={[
                    styles.scoreText,
                    { color: g.score >= 14 ? colors.success : g.score >= 10 ? colors.warning : colors.danger },
                  ]}>
                    {g.score}/20
                  </Text>
                </View>
              </View>
            ))}
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
  heroCard: { marginTop: spacing.md, alignItems: 'center', paddingVertical: spacing.xl },
  heroLabel: { fontSize: font.small, color: colors.gray500 },
  heroValue: {
    fontSize: 46, fontWeight: '800', color: colors.black,
    letterSpacing: -1, fontVariant: ['tabular-nums'],
  },
  heroMax: { fontSize: font.h3, color: colors.gray300, fontWeight: '700' },
  heroHint: { fontSize: font.small, color: colors.gray500, marginTop: 4, textAlign: 'center' },
  subjectRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  subjectName: { fontSize: font.body, fontWeight: '600', color: colors.black },
  subjectAvg: { fontSize: font.small, fontWeight: '800', color: colors.gray700, fontVariant: ['tabular-nums'] },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.base, paddingVertical: spacing.md, minHeight: 56,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.gray100 },
  rowTitle: { fontSize: font.body, fontWeight: '600', color: colors.black },
  rowMeta: { fontSize: font.tiny + 1, color: colors.gray500, marginTop: 1 },
  scoreBadge: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 999 },
  scoreText: { fontSize: font.small, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
