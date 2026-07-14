import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, spacing } from '../../theme';
import { Button, Field } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

export default function ParentLoginScreen() {
  const { loginParent } = useAuth();
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    setError('');
    const ok = loginParent(code, phone);
    if (!ok) {
      setError('Code élève introuvable ou téléphone invalide. Exemple de code : ETU-001.');
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.iconWrap}>
            <Ionicons name="people-outline" size={26} color={colors.teal} />
          </View>
          <Text style={styles.title}>Espace Parents</Text>
          <Text style={styles.sub}>
            Entrez le code élève fourni par votre centre et votre numéro de téléphone.
          </Text>

          <Field
            label="Code élève"
            placeholder="Ex : ETU-001"
            autoCapitalize="characters"
            value={code}
            onChangeText={setCode}
          />
          <Field
            label="Votre numéro de téléphone"
            placeholder="Ex : 06 12 34 56 78"
            keyboardType="phone-pad"
            autoComplete="tel"
            value={phone}
            onChangeText={setPhone}
            error={error || undefined}
          />

          <Button title="Accéder au suivi" onPress={submit} style={{ marginTop: spacing.sm }} />

          <View style={styles.demoNote}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.gray500} />
            <Text style={styles.demoText}>
              Vos données et celles de vos enfants sont 100% sécurisées.
              Mode démo : essayez ETU-001 avec n'importe quel numéro.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  content: { padding: spacing.xl, paddingTop: spacing.xxl },
  iconWrap: {
    width: 56, height: 56, borderRadius: radius.lg, backgroundColor: colors.tealBg,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.base,
  },
  title: { fontSize: font.h1, fontWeight: '800', color: colors.black, letterSpacing: -0.4 },
  sub: {
    fontSize: font.body, color: colors.gray500, lineHeight: 21,
    marginTop: spacing.sm, marginBottom: spacing.xl,
  },
  demoNote: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    backgroundColor: colors.gray50, borderRadius: radius.md,
    padding: spacing.md, marginTop: spacing.lg,
  },
  demoText: { flex: 1, fontSize: font.tiny + 1, color: colors.gray500, lineHeight: 17 },
});
