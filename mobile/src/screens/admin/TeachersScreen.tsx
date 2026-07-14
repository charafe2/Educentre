import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, font, formatMAD, spacing } from '../../theme';
import { Avatar, Badge, Card } from '../../components/ui';
import { teachers } from '../../data/demo';
import { getClasse } from '../../data/selectors';

export default function TeachersScreen() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: spacing.base }}>
      {teachers.map(t => {
        const classNames = t.classIds
          .map(id => getClasse(id)?.name)
          .filter(Boolean)
          .join(' · ');
        const pay = t.paymentMode === 'fixed'
          ? `${formatMAD(t.fixedSalary ?? 0)} / mois (fixe)`
          : `${formatMAD(t.ratePerStudent ?? 0)} / élève`;
        return (
          <Card key={t.id} style={{ marginBottom: spacing.sm }}>
            <View style={styles.row}>
              <Avatar name={`${t.firstName} ${t.lastName}`} color={t.avatarColor} size={46} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{t.firstName} {t.lastName}</Text>
                <Text style={styles.meta}>{t.specialty}</Text>
              </View>
              <Badge status={t.status} />
            </View>
            <View style={styles.details}>
              <Text style={styles.detailLine}>📚 {classNames || 'Aucun cours attribué'}</Text>
              <Text style={styles.detailLine}>💰 {pay}</Text>
              <Text style={styles.detailLine}>📞 {t.phone}</Text>
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { fontSize: font.body + 1, fontWeight: '700', color: colors.black },
  meta: { fontSize: font.tiny + 1, color: colors.gray500, marginTop: 1 },
  details: {
    marginTop: spacing.md, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.gray100, gap: 6,
  },
  detailLine: { fontSize: font.small, color: colors.gray700, lineHeight: 19 },
});
