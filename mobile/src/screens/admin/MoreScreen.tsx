import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, font, radius, spacing } from '../../theme';
import { Button, Card } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { MoreStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MoreStackParamList, 'MoreHome'>;

const ITEMS: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string; bg: string;
  title: string; body: string;
  target: 'Groups' | 'Teachers' | 'Analytics';
}[] = [
  {
    icon: 'albums-outline', color: colors.teal, bg: colors.tealBg,
    title: 'Groupes & Cours', body: 'Cours, groupes et taux de remplissage',
    target: 'Groups',
  },
  {
    icon: 'people-circle-outline', color: colors.violet, bg: colors.violetBg,
    title: 'Professeurs', body: 'Équipe, spécialités et rémunérations',
    target: 'Teachers',
  },
  {
    icon: 'stats-chart-outline', color: colors.blue, bg: colors.blueLight,
    title: 'Analytiques', body: 'Revenus, présences et rétention',
    target: 'Analytics',
  },
];

export default function MoreScreen({ navigation }: Props) {
  const { adminUser, logout } = useAuth();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.base }}>
        <Text style={styles.title}>Plus</Text>

        <Card style={{ marginTop: spacing.md }}>
          <View style={styles.profileRow}>
            <View style={styles.profileAvatar}>
              <Ionicons name="person-outline" size={22} color={colors.blue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{adminUser?.name ?? 'Directeur'}</Text>
              <Text style={styles.profileEmail}>{adminUser?.email}</Text>
            </View>
          </View>
        </Card>

        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          {ITEMS.map(item => (
            <Pressable
              key={item.title}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              onPress={() => navigation.navigate(item.target)}
              style={({ pressed }) => pressed && { opacity: 0.85 }}
            >
              <Card>
                <View style={styles.itemRow}>
                  <View style={[styles.itemIcon, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemBody}>{item.body}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.gray300} />
                </View>
              </Card>
            </Pressable>
          ))}
        </View>

        <View style={{ marginTop: spacing.xxl }}>
          <Button title="Se déconnecter" variant="danger" onPress={logout} />
        </View>
        <Text style={styles.version}>Moujtahid Mobile · v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  title: { fontSize: font.h2, fontWeight: '800', color: colors.black, letterSpacing: -0.3 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  profileAvatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: colors.blueLight,
    alignItems: 'center', justifyContent: 'center',
  },
  profileName: { fontSize: font.body + 1, fontWeight: '700', color: colors.black },
  profileEmail: { fontSize: font.tiny + 1, color: colors.gray500, marginTop: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
  itemIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  itemTitle: { fontSize: font.body, fontWeight: '700', color: colors.black },
  itemBody: { fontSize: font.tiny + 1, color: colors.gray500, marginTop: 1 },
  version: {
    textAlign: 'center', fontSize: font.tiny, color: colors.gray300,
    marginTop: spacing.lg,
  },
});
