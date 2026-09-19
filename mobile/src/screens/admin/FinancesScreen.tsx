import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, formatMAD, radius, spacing } from '../../theme';
import { Avatar, Badge, Card, EmptyState } from '../../components/ui';
import { CURRENT_MONTH } from '../../data/demo';
import {
  financeSummary, formatMonthFR, getClasse, getStudent, monthPayments,
} from '../../data/selectors';
import { PaymentStatus } from '../../types';

type Filter = 'all' | PaymentStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'paid', label: 'Payés' },
  { key: 'pending', label: 'En attente' },
  { key: 'overdue', label: 'En retard' },
];

export default function FinancesScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const summary = financeSummary();

  const list = useMemo(() => {
    const all = monthPayments().slice().sort((a, b) => {
      const order: Record<PaymentStatus, number> = { overdue: 0, pending: 1, paid: 2 };
      return order[a.status] - order[b.status];
    });
    return filter === 'all' ? all : all.filter(p => p.status === filter);
  }, [filter]);

  const collectRatio = summary.expected ? summary.collected / summary.expected : 0;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <FlatList
        data={list}
        keyExtractor={p => String(p.id)}
        contentContainerStyle={{ padding: spacing.base }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Finances</Text>
            <Text style={styles.subtitle}>{formatMonthFR(CURRENT_MONTH)}</Text>

            <Card style={styles.heroCard}>
              <Text style={styles.heroLabel}>Encaissé ce mois</Text>
              <Text style={styles.heroValue}>{formatMAD(summary.collected)}</Text>
              <Text style={styles.heroSub}>
                sur {formatMAD(summary.expected)} attendus · {Math.round(collectRatio * 100)}%
              </Text>
              <View style={styles.heroBar}>
                <View style={[styles.heroBarFill, { width: `${Math.round(collectRatio * 100)}%` }]} />
              </View>
              <View style={styles.heroSplit}>
                <View style={styles.heroSplitItem}>
                  <View style={[styles.splitDot, { backgroundColor: colors.warning }]} />
                  <Text style={styles.splitText}>En attente : {formatMAD(summary.pending)}</Text>
                </View>
                <View style={styles.heroSplitItem}>
                  <View style={[styles.splitDot, { backgroundColor: colors.danger }]} />
                  <Text style={styles.splitText}>Impayés : {formatMAD(summary.overdue)}</Text>
                </View>
              </View>
            </Card>

            <View style={styles.filters}>
              {FILTERS.map(f => (
                <Pressable
                  key={f.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === f.key }}
                  onPress={() => setFilter(f.key)}
                  style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
                >
                  <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon="wallet-outline" title="Aucun paiement" body="Aucun paiement ne correspond à ce filtre." />
        }
        renderItem={({ item }) => {
          const student = getStudent(item.studentId);
          const classe = getClasse(item.classeId);
          if (!student) return null;
          return (
            <Card>
              <View style={styles.payRow}>
                <Avatar name={`${student.firstName} ${student.lastName}`} color={student.avatarColor} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.payName}>{student.firstName} {student.lastName}</Text>
                  <Text style={styles.payMeta}>
                    {classe?.subject}{item.method ? ` · ${item.method}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.payAmount}>{formatMAD(item.amount)}</Text>
                  <Badge status={item.status} />
                </View>
              </View>
            </Card>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  title: { fontSize: font.h2, fontWeight: '800', color: colors.black, letterSpacing: -0.3 },
  subtitle: { fontSize: font.small, color: colors.gray500, marginTop: 2 },
  heroCard: { marginTop: spacing.md, backgroundColor: colors.black, borderColor: colors.black },
  heroLabel: { fontSize: font.small, color: 'rgba(255,255,255,0.65)' },
  heroValue: {
    fontSize: 32, fontWeight: '800', color: colors.white,
    marginTop: 4, letterSpacing: -0.5, fontVariant: ['tabular-nums'],
  },
  heroSub: { fontSize: font.tiny + 1, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  heroBar: {
    height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.18)',
    marginTop: spacing.md, overflow: 'hidden',
  },
  heroBarFill: { height: '100%', borderRadius: 4, backgroundColor: colors.success },
  heroSplit: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md },
  heroSplitItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  splitDot: { width: 8, height: 8, borderRadius: 4 },
  splitText: { fontSize: font.tiny + 1, color: 'rgba(255,255,255,0.8)' },
  filters: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.base, marginBottom: spacing.sm },
  filterChip: {
    paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray100,
    minHeight: 36, justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  filterText: { fontSize: font.small, fontWeight: '600', color: colors.gray500 },
  filterTextActive: { color: colors.white },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  payName: { fontSize: font.body, fontWeight: '600', color: colors.black },
  payMeta: { fontSize: font.tiny + 1, color: colors.gray500, marginTop: 1 },
  payAmount: { fontSize: font.body, fontWeight: '800', color: colors.black, fontVariant: ['tabular-nums'] },
});
