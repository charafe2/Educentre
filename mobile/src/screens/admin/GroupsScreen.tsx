import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, formatMAD, radius, spacing } from '../../theme';
import { Card, ProgressBar } from '../../components/ui';
import { classes } from '../../data/demo';
import { classGroups, getStudent } from '../../data/selectors';

export default function GroupsScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.base }} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Groupes & Cours</Text>
        <Text style={styles.subtitle}>{classes.length} cours actifs</Text>

        {classes.map(classe => {
          const groups = classGroups(classe.id);
          const fillRatio = classe.enrolledStudentIds.length / classe.maxCapacity;
          return (
            <Card key={classe.id} style={{ marginTop: spacing.md }}>
              <View style={styles.headRow}>
                <View style={[styles.subjectTag, { backgroundColor: classe.bgColor }]}>
                  <Text style={[styles.subjectText, { color: classe.color }]}>{classe.subject}</Text>
                </View>
                <Text style={styles.price}>{formatMAD(classe.monthlyPrice)}/mois</Text>
              </View>
              <Text style={styles.className}>{classe.name}</Text>
              <Text style={styles.classMeta}>
                {classe.teacherName} · {classe.roomName}
              </Text>

              <View style={styles.fillRow}>
                <View style={{ flex: 1 }}>
                  <ProgressBar
                    ratio={fillRatio}
                    color={fillRatio >= 0.9 ? colors.warning : classe.color}
                  />
                </View>
                <Text style={styles.fillText}>
                  {classe.enrolledStudentIds.length}/{classe.maxCapacity} élèves
                </Text>
              </View>

              {groups.map(group => {
                const names = group.studentIds
                  .map(id => getStudent(id))
                  .filter(Boolean)
                  .map(s => `${s!.firstName} ${s!.lastName[0]}.`)
                  .join(', ');
                return (
                  <View key={group.id} style={styles.groupRow}>
                    <View style={styles.groupBadge}>
                      <Text style={styles.groupBadgeText}>G{group.groupNumber}</Text>
                    </View>
                    <Text style={styles.groupNames} numberOfLines={2}>
                      {names || 'Aucun élève'}
                    </Text>
                    <Text style={styles.groupCount}>
                      {group.studentIds.length}/{group.maxCapacity}
                    </Text>
                  </View>
                );
              })}
            </Card>
          );
        })}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  title: { fontSize: font.h2, fontWeight: '800', color: colors.black, letterSpacing: -0.3 },
  subtitle: { fontSize: font.small, color: colors.gray500, marginTop: 2 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subjectTag: {
    paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.full,
  },
  subjectText: { fontSize: font.tiny, fontWeight: '700' },
  price: { fontSize: font.small, fontWeight: '700', color: colors.gray700, fontVariant: ['tabular-nums'] },
  className: { fontSize: font.body + 1, fontWeight: '700', color: colors.black, marginTop: spacing.md },
  classMeta: { fontSize: font.tiny + 1, color: colors.gray500, marginTop: 2 },
  fillRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  fillText: { fontSize: font.tiny + 1, color: colors.gray500, fontVariant: ['tabular-nums'] },
  groupRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    marginTop: spacing.md, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.gray100,
  },
  groupBadge: {
    width: 34, height: 34, borderRadius: radius.md, backgroundColor: colors.gray50,
    alignItems: 'center', justifyContent: 'center',
  },
  groupBadgeText: { fontSize: font.tiny + 1, fontWeight: '800', color: colors.gray700 },
  groupNames: { flex: 1, fontSize: font.small, color: colors.gray700, lineHeight: 18 },
  groupCount: { fontSize: font.tiny + 1, fontWeight: '700', color: colors.gray500, fontVariant: ['tabular-nums'] },
});
