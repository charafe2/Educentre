import React, { useMemo, useState } from 'react';
import {
  FlatList, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, font, radius, spacing } from '../../theme';
import { Avatar, Badge, Card, EmptyState } from '../../components/ui';
import { students } from '../../data/demo';
import { Student } from '../../types';
import { AdminStackParamList } from '../../navigation/types';

type Filter = 'all' | 'paid' | 'pending' | 'overdue';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'paid', label: 'Payés' },
  { key: 'pending', label: 'En attente' },
  { key: 'overdue', label: 'En retard' },
];

type Props = NativeStackScreenProps<AdminStackParamList, 'StudentsList'>;

export default function StudentsScreen({ navigation }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter(s => {
      if (filter !== 'all' && s.paymentStatus !== filter) return false;
      if (!q) return true;
      return `${s.firstName} ${s.lastName} ${s.code} ${s.school}`.toLowerCase().includes(q);
    });
  }, [search, filter]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Étudiants</Text>
        <Text style={styles.count}>{list.length} élève{list.length > 1 ? 's' : ''}</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={colors.gray300} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un élève, un code…"
          placeholderTextColor={colors.gray300}
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Rechercher un élève"
        />
      </View>

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

      <FlatList
        data={list}
        keyExtractor={s => String(s.id)}
        contentContainerStyle={{ padding: spacing.base, paddingTop: spacing.sm }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <EmptyState
            icon="school-outline"
            title="Aucun élève trouvé"
            body="Essayez une autre recherche ou un autre filtre."
          />
        }
        renderItem={({ item }) => (
          <StudentRow
            student={item}
            onPress={() => navigation.navigate('StudentDetail', { studentId: item.id })}
          />
        )}
      />
    </SafeAreaView>
  );
}

function StudentRow({ student, onPress }: { student: Student; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${student.firstName} ${student.lastName}`}
      onPress={onPress}
      style={({ pressed }) => pressed && { opacity: 0.85 }}
    >
      <Card>
        <View style={styles.row}>
          <Avatar name={`${student.firstName} ${student.lastName}`} color={student.avatarColor} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowName}>{student.firstName} {student.lastName}</Text>
            <Text style={styles.rowMeta}>{student.code} · {student.level}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Badge status={student.paymentStatus} />
            <Text style={styles.rowMeta}>
              {student.enrolledClassIds.length} cours
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  header: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    paddingHorizontal: spacing.base, paddingTop: spacing.base,
  },
  title: { fontSize: font.h2, fontWeight: '800', color: colors.black, letterSpacing: -0.3 },
  count: { fontSize: font.small, color: colors.gray500 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray100,
    borderRadius: radius.md, marginHorizontal: spacing.base, marginTop: spacing.md,
    paddingHorizontal: spacing.md, minHeight: 46,
  },
  searchInput: { flex: 1, fontSize: font.body, color: colors.black, paddingVertical: 10 },
  filters: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.base, paddingTop: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray100,
    minHeight: 36, justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  filterText: { fontSize: font.small, fontWeight: '600', color: colors.gray500 },
  filterTextActive: { color: colors.white },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowName: { fontSize: font.body, fontWeight: '600', color: colors.black },
  rowMeta: { fontSize: font.tiny + 1, color: colors.gray500, marginTop: 1 },
});
