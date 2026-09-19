import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, spacing } from '../../theme';
import { Card, EmptyState } from '../../components/ui';
import { DAYS_FR } from '../../data/demo';
import { sessionsOfDay } from '../../data/selectors';

export default function CalendarScreen() {
  const [day, setDay] = useState(0);
  const list = sessionsOfDay(day);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={{ paddingHorizontal: spacing.base, paddingTop: spacing.base }}>
        <Text style={styles.title}>Calendrier</Text>
        <Text style={styles.subtitle}>Planning hebdomadaire du centre</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.days}
        style={{ flexGrow: 0 }}
      >
        {DAYS_FR.map((label, i) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityState={{ selected: day === i }}
            onPress={() => setDay(i)}
            style={[styles.dayChip, day === i && styles.dayChipActive]}
          >
            <Text style={[styles.dayText, day === i && styles.dayTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: spacing.base }} showsVerticalScrollIndicator={false}>
        {list.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title={`Aucune séance le ${DAYS_FR[day].toLowerCase()}`}
            body="Les séances planifiées apparaîtront ici."
          />
        ) : (
          list.map(s => (
            <Card key={s.id} style={[styles.sessionCard, s.isCancelled && { opacity: 0.55 }]}>
              <View style={styles.timeCol}>
                <Text style={styles.timeStart}>{s.startHour}h</Text>
                <View style={styles.timeLine} />
                <Text style={styles.timeEnd}>{s.endHour}h</Text>
              </View>
              <View style={[styles.colorBar, { backgroundColor: s.classe.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionName}>{s.classe.name}</Text>
                <Text style={styles.sessionMeta}>
                  {s.classe.teacherName} · {s.classe.roomName} · {s.classe.enrolledStudentIds.length} élèves
                </Text>
                {s.isCancelled ? (
                  <View style={styles.cancelRow}>
                    <Ionicons name="close-circle" size={14} color={colors.danger} />
                    <Text style={styles.cancelText}>Annulée - {s.cancelReason}</Text>
                  </View>
                ) : null}
              </View>
            </Card>
          ))
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
  days: { gap: spacing.sm, paddingHorizontal: spacing.base, paddingVertical: spacing.md },
  dayChip: {
    paddingHorizontal: spacing.base, borderRadius: radius.full,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray100,
    minHeight: 38, justifyContent: 'center',
  },
  dayChipActive: { backgroundColor: colors.black, borderColor: colors.black },
  dayText: { fontSize: font.small, fontWeight: '600', color: colors.gray500 },
  dayTextActive: { color: colors.white },
  sessionCard: {
    flexDirection: 'row', gap: spacing.md, alignItems: 'stretch',
    marginBottom: spacing.sm,
  },
  timeCol: { alignItems: 'center', width: 34 },
  timeStart: { fontSize: font.small, fontWeight: '800', color: colors.black, fontVariant: ['tabular-nums'] },
  timeEnd: { fontSize: font.tiny + 1, color: colors.gray500, fontVariant: ['tabular-nums'] },
  timeLine: { flex: 1, width: 1.5, backgroundColor: colors.gray100, marginVertical: 4 },
  colorBar: { width: 4, borderRadius: 2 },
  sessionName: { fontSize: font.body, fontWeight: '700', color: colors.black },
  sessionMeta: { fontSize: font.tiny + 1, color: colors.gray500, marginTop: 3, lineHeight: 17 },
  cancelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  cancelText: { fontSize: font.tiny + 1, color: colors.danger, fontWeight: '600' },
});
