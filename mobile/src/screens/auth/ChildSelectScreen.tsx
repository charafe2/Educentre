import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, spacing } from '../../theme';
import { Avatar } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { Student } from '../../types';

export default function ChildSelectScreen() {
  const { parentChildren, selectChild, logout } = useAuth();
  const { t } = useI18n();
  const parentFirstName = (parentChildren[0]?.parentName ?? 'Parent').split(' ')[0];

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.hello}>{t('childSelect.hello', { name: parentFirstName })}</Text>
        <Text style={styles.title}>{t('childSelect.question')}</Text>
      </View>

      <FlatList
        data={parentChildren}
        keyExtractor={item => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <ChildCard student={item} onPress={() => selectChild(item.id)} />
        )}
      />

      <Pressable style={styles.logoutBtn} onPress={logout} accessibilityRole="button">
        <Ionicons name="log-out-outline" size={16} color={colors.gray500} />
        <Text style={styles.logoutText}>{t('childSelect.logout')}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function ChildCard({ student, onPress }: { student: Student; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${student.firstName} ${student.lastName}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <Avatar name={`${student.firstName} ${student.lastName}`} color={student.avatarColor} size={72} />
      <Text style={styles.childName} numberOfLines={1}>{student.firstName}</Text>
      <Text style={styles.childMeta} numberOfLines={1}>{student.level}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white, paddingHorizontal: spacing.xl },
  header: { marginTop: spacing.xxl, marginBottom: spacing.xl },
  hello: { fontSize: font.body, color: colors.gray500 },
  title: {
    fontSize: font.h1, fontWeight: '800', color: colors.black,
    letterSpacing: -0.4, marginTop: 2,
  },
  grid: { paddingBottom: spacing.xl, gap: spacing.lg },
  row: { gap: spacing.lg },
  card: {
    flex: 1, alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.lg, borderRadius: radius.xl,
    backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray100,
  },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  childName: { fontSize: font.body + 1, fontWeight: '700', color: colors.black },
  childMeta: { fontSize: font.tiny + 1, color: colors.gray500 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: spacing.base, marginBottom: spacing.base,
  },
  logoutText: { fontSize: font.small, fontWeight: '600', color: colors.gray500 },
});
