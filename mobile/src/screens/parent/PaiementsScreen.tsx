import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, formatMAD, spacing } from '../../theme';
import { Badge, Button, Card, EmptyState, SectionTitle } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { formatMonthFR, studentPayments } from '../../data/selectors';

export default function PaiementsScreen() {
  const { parentStudent: student, logout } = useAuth();
  if (!student) return null;

  const list = studentPayments(student.id);
  const due = list.filter(p => p.status !== 'paid');
  const dueTotal = due.reduce((acc, p) => acc + p.amount, 0);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.base }} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Paiements</Text>
        <Text style={styles.subtitle}>Situation de {student.firstName}</Text>

        <Card style={[
          styles.dueCard,
          dueTotal === 0 && { backgroundColor: colors.successBg, borderColor: 'transparent' },
        ]}>
          {dueTotal === 0 ? (
            <View style={styles.dueRow}>
              <Ionicons name="checkmark-circle" size={26} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.dueTitle}>Tout est à jour !</Text>
                <Text style={styles.dueMeta}>Aucun paiement en attente. Merci pour votre confiance.</Text>
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.dueLabel}>Montant à régler</Text>
              <Text style={styles.dueValue}>{formatMAD(dueTotal)}</Text>
              <Text style={styles.dueMeta}>
                {due.length} échéance{due.length > 1 ? 's' : ''} en attente de règlement au centre.
              </Text>
            </View>
          )}
        </Card>

        <SectionTitle title="Historique" />
        {list.length === 0 ? (
          <EmptyState icon="wallet-outline" title="Aucun paiement" body="L'historique apparaîtra ici." />
        ) : (
          <Card style={{ padding: 0 }}>
            {list.map((p, i) => (
              <View key={p.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{formatMonthFR(p.periodMonth)}</Text>
                  <Text style={styles.rowMeta}>
                    {p.classe?.subject}{p.method ? ` · ${p.method}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.amount}>{formatMAD(p.amount)}</Text>
                  <Badge status={p.status} />
                </View>
              </View>
            ))}
          </Card>
        )}

        <View style={{ marginTop: spacing.xxl }}>
          <Button title="Se déconnecter" variant="ghost" onPress={logout} />
        </View>
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  title: { fontSize: font.h2, fontWeight: '800', color: colors.black, letterSpacing: -0.3 },
  subtitle: { fontSize: font.small, color: colors.gray500, marginTop: 2 },
  dueCard: { marginTop: spacing.md },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dueLabel: { fontSize: font.small, color: colors.gray500 },
  dueTitle: { fontSize: font.body + 1, fontWeight: '800', color: colors.black },
  dueValue: {
    fontSize: 32, fontWeight: '800', color: colors.black,
    marginTop: 4, letterSpacing: -0.5, fontVariant: ['tabular-nums'],
  },
  dueMeta: { fontSize: font.tiny + 1, color: colors.gray500, marginTop: 4, lineHeight: 17 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.base, paddingVertical: spacing.md, minHeight: 56,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.gray100 },
  rowTitle: { fontSize: font.body, fontWeight: '600', color: colors.black },
  rowMeta: { fontSize: font.tiny + 1, color: colors.gray500, marginTop: 1 },
  amount: { fontSize: font.body, fontWeight: '800', color: colors.black, fontVariant: ['tabular-nums'] },
});
