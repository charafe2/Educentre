import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, font, radius, shadow, spacing } from '../../theme';
import { AuthStackParamList } from '../../navigation/types';
import { useI18n } from '../../i18n/I18nContext';
import { LanguageSwitcher } from '../../i18n/LanguageSwitcher';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  const { t } = useI18n();
  return (
    <SafeAreaView style={styles.root}>
      <LanguageSwitcher style={{ marginTop: spacing.md }} />
      <View style={styles.hero}>
        <Text style={styles.logo}>
          Moujtahid<Text style={{ color: colors.blue }}>.</Text>
        </Text>
        <Text style={styles.tagline}>
          {t('welcome.tagline')} <Text style={{ color: colors.blue }}>{t('welcome.taglineAccent')}</Text>
        </Text>
        <Text style={styles.sub}>
          {t('welcome.sub')}
        </Text>
      </View>

      <View style={styles.cards}>
        <RoleCard
          icon="business-outline"
          title={t('welcome.directorTitle')}
          body={t('welcome.directorBody')}
          onPress={() => navigation.navigate('AdminLogin')}
        />
        <RoleCard
          icon="people-outline"
          title={t('welcome.parentTitle')}
          body={t('welcome.parentBody')}
          onPress={() => navigation.navigate('ParentLogin')}
        />
      </View>

      <Text style={styles.footer}>{t('welcome.footer')}</Text>
    </SafeAreaView>
  );
}

function RoleCard({ icon, title, body, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; title: string; body: string; onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.roleCard, pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 }]}
    >
      <View style={styles.roleIcon}>
        <Ionicons name={icon} size={24} color={colors.blue} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.roleTitle}>{title}</Text>
        <Text style={styles.roleBody}>{body}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.gray300} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white, paddingHorizontal: spacing.xl },
  hero: { flex: 1, justifyContent: 'center' },
  logo: { fontSize: 34, fontWeight: '800', color: colors.black, letterSpacing: -0.5 },
  tagline: {
    fontSize: font.h1, fontWeight: '800', color: colors.black,
    marginTop: spacing.xl, letterSpacing: -0.5, lineHeight: 34,
  },
  sub: { fontSize: font.body + 1, color: colors.gray500, marginTop: spacing.md, lineHeight: 23 },
  cards: { gap: spacing.md, paddingBottom: spacing.xl },
  roleCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.base,
    backgroundColor: colors.white, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.gray100,
    padding: spacing.lg, ...shadow.card,
  },
  roleIcon: {
    width: 48, height: 48, borderRadius: radius.lg, backgroundColor: colors.blueLight,
    alignItems: 'center', justifyContent: 'center',
  },
  roleTitle: { fontSize: font.body + 2, fontWeight: '700', color: colors.black },
  roleBody: { fontSize: font.small, color: colors.gray500, marginTop: 2, lineHeight: 18 },
  footer: {
    textAlign: 'center', color: colors.gray300, fontSize: font.tiny,
    paddingBottom: spacing.base,
  },
});
