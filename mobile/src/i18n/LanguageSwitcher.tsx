import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '../theme';
import { Lang, LANGUAGES, useI18n } from './I18nContext';

// Compact 3-way language segmented control. Drop it anywhere; it reads and
// writes the active language via the i18n context.
export function LanguageSwitcher({ style }: { style?: object }) {
  const { lang, setLang } = useI18n();

  return (
    <View style={[styles.row, style]}>
      {LANGUAGES.map(item => {
        const active = item.code === lang;
        return (
          <Pressable
            key={item.code}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => setLang(item.code as Lang)}
            style={[styles.pill, active && styles.pillActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.gray50,
    borderRadius: radius.full,
    padding: 3,
    alignSelf: 'center',
  },
  pill: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  pillActive: {
    backgroundColor: colors.white,
    ...({
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    }),
  },
  label: { fontSize: font.small, fontWeight: '600', color: colors.gray500 },
  labelActive: { color: colors.blue },
});
