import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, spacing } from '../../theme';
import { Button, Field } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { DEMO_MODE } from '../../api/client';

export default function AdminLoginScreen() {
  const { loginAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Adresse e-mail invalide.');
      return;
    }
    setLoading(true);
    const ok = await loginAdmin(email, password);
    setLoading(false);
    if (!ok) setError('Identifiants incorrects. Vérifiez votre e-mail et votre mot de passe.');
  };

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.iconWrap}>
            <Ionicons name="business-outline" size={26} color={colors.blue} />
          </View>
          <Text style={styles.title}>Espace Directeur</Text>
          <Text style={styles.sub}>
            Connectez-vous pour piloter votre centre : élèves, groupes, finances et analyses.
          </Text>

          <Field
            label="Adresse e-mail"
            placeholder="vous@moncentre.ma"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Field
            label="Mot de passe"
            placeholder="••••••••"
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
            error={error || undefined}
          />

          <Button title="Se connecter" onPress={submit} loading={loading} style={{ marginTop: spacing.sm }} />

          {DEMO_MODE ? (
            <View style={styles.demoNote}>
              <Ionicons name="information-circle-outline" size={16} color={colors.gray500} />
              <Text style={styles.demoText}>
                Mode démo : utilisez n'importe quel e-mail valide et un mot de passe
                d'au moins 4 caractères.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  content: { padding: spacing.xl, paddingTop: spacing.xxl },
  iconWrap: {
    width: 56, height: 56, borderRadius: radius.lg, backgroundColor: colors.blueLight,
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
