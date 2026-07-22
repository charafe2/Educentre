import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, formatMAD, radius, spacing } from '../../theme';
import { Card, ChildSwitchBack, EmptyState, SectionTitle } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { DAYS_FR } from '../../data/demo';
import { studentClasses, studentSessions } from '../../data/selectors';

export default function CoursScreen() {
  const { parentStudent: student, parentChildren, switchChild } = useAuth();
  const { t } = useI18n();
  if (!student) return null;

  const classesList = studentClasses(student);
  const sessionsList = studentSessions(student);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {parentChildren.length > 1 ? <ChildSwitchBack onPress={switchChild} /> : null}
      <ScrollView
        contentContainerStyle={[
          { padding: spacing.base },
          parentChildren.length > 1 && { paddingTop: spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t('cours.title')}</Text>
        <Text style={styles.subtitle}>
          {classesList.length > 1
            ? t('cours.countMany', { count: classesList.length, name: student.firstName })
            : t('cours.countOne', { count: classesList.length, name: student.firstName })}
        </Text>

        {classesList.length === 0 ? (
          <EmptyState icon="book-outline" title={t('cours.empty')} body={t('cours.emptyBody')} />
        ) : (
          classesList.map(c => (
            <Card key={c.id} style={{ marginTop: spacing.md }}>
              <View style={styles.headRow}>
                <View style={[styles.tag, { backgroundColor: c.bgColor }]}>
                  <Text style={[styles.tagText, { color: c.color }]}>{c.subject}</Text>
                </View>
                <Text style={styles.price}>{formatMAD(c.monthlyPrice)}{t('cours.perMonth')}</Text>
              </View>
              <Text style={styles.className}>{c.name}</Text>
              <Text style={styles.classMeta}>{t('cours.with')} {c.teacherName} · {c.roomName}</Text>
            </Card>
          ))
        )}

        <SectionTitle title={t('cours.schedule')} />
        <Card style={{ padding: 0 }}>
          {sessionsList.map((s, i) => (
            <View key={s.id} style={[styles.sessionRow, i > 0 && styles.rowBorder, s.isCancelled && { opacity: 0.5 }]}>
              <Text style={styles.day}>{DAYS_FR[s.day]}</Text>
              <View style={[styles.dot, { backgroundColor: s.classe.color }]} />
              <Text style={styles.subject}>{s.classe.subject}</Text>
              <Text style={styles.time}>
                {s.isCancelled ? t('cours.cancelled') : `${s.startHour}h–${s.endHour}h`}
              </Text>
            </View>
          ))}
        </Card>
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
  tag: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.full },
  tagText: { fontSize: font.tiny, fontWeight: '700' },
  price: { fontSize: font.small, fontWeight: '700', color: colors.gray700, fontVariant: ['tabular-nums'] },
  className: { fontSize: font.body + 1, fontWeight: '700', color: colors.black, marginTop: spacing.md },
  classMeta: { fontSize: font.tiny + 1, color: colors.gray500, marginTop: 2 },
  sessionRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.base, paddingVertical: spacing.md, minHeight: 50,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.gray100 },
  day: { width: 76, fontSize: font.small, fontWeight: '700', color: colors.black },
  dot: { width: 8, height: 8, borderRadius: 4 },
  subject: { flex: 1, fontSize: font.small, color: colors.gray700 },
  time: { fontSize: font.small, fontWeight: '700', color: colors.blue, fontVariant: ['tabular-nums'] },
});
