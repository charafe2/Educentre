import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, formatMAD, spacing } from '../../theme';
import { Badge, Button, Card, EmptyState, SectionTitle } from '../../components/ui';
import { ParentPageHeader } from '../../components/ParentHeader';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { formatMonthFR, studentPayments } from '../../data/selectors';

export default function PaiementsScreen() {
  const { parentStudent: student, parentChildren, switchChild, logout } = useAuth();
  const { t } = useI18n();
  if (!student) return null;

  const list = studentPayments(student.id);
  const due = list.filter(p => p.status !== 'paid');
  const dueTotal = due.reduce((acc, p) => acc + p.amount, 0);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.base }}
        showsVerticalScrollIndicator={false}
      >
        <ParentPageHeader
          title={t('paiements.title')}
          subtitle={t('paiements.subtitle', { name: student.firstName })}
          student={student}
          multiChildren={parentChildren.length > 1}
          onSwitchChild={switchChild}
        />
        <Card style={[
          styles.dueCard,
          dueTotal === 0 && { backgroundColor: colors.successBg, borderColor: 'transparent' },
        ]}>
          {dueTotal === 0 ? (
            <View style={styles.dueRow}>
              <Ionicons name="checkmark-circle" size={26} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.dueTitle}>{t('paiements.upToDate')}</Text>
                <Text style={styles.dueMeta}>{t('paiements.upToDateBody')}</Text>
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.dueLabel}>{t('paiements.toPay')}</Text>
              <Text style={styles.dueValue}>{formatMAD(dueTotal)}</Text>
              <Text style={styles.dueMeta}>
                {due.length > 1
                  ? t('paiements.dueMany', { count: due.length })
                  : t('paiements.dueOne', { count: due.length })}
              </Text>
            </View>
          )}
        </Card>

        <SectionTitle title={t('paiements.history')} />
        {list.length === 0 ? (
          <EmptyState icon="wallet-outline" title={t('paiements.empty')} body={t('paiements.emptyBody')} />
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
          <Button title={t('paiements.logout')} variant="ghost" onPress={logout} />
        </View>
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  dueCard: {},
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
