import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, spacing } from '../../../theme';

/**
 * Soft filled pill input used on the redesigned login screens. Distinct from
 * the app-wide <Field> (components/ui.tsx, bordered box style used across the
 * admin dashboard) so that restyling the auth screens can't affect any other
 * screen. Supports an optional leading icon and a password show/hide toggle.
 */
export function AuthField({
  icon, isPassword, error, ...inputProps
}: TextInputProps & {
  icon: keyof typeof Ionicons.glyphMap; isPassword?: boolean; error?: string;
}) {
  const [hidden, setHidden] = useState(!!isPassword);

  return (
    <View style={{ marginBottom: spacing.base }}>
      <View style={[styles.wrap, !!error && styles.wrapError]}>
        <Ionicons name={icon} size={18} color={colors.gray300} />
        <TextInput
          placeholderTextColor={colors.gray300}
          style={styles.input}
          secureTextEntry={isPassword ? hidden : undefined}
          {...inputProps}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setHidden(v => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Afficher le mot de passe' : 'Masquer le mot de passe'}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={19} color={colors.gray300} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.gray50, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.gray100,
    paddingHorizontal: spacing.base, height: 52,
  },
  wrapError: { borderColor: colors.danger },
  input: { flex: 1, fontSize: font.body + 1, color: colors.black },
  error: { fontSize: font.tiny, color: colors.danger, marginTop: 6, marginLeft: spacing.md },
});
