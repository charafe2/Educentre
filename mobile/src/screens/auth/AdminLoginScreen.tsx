import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, font, radius, spacing } from '../../theme';
import { Button } from '../../components/ui';
import { AuthHero, AuthBubble } from './components/AuthHero';
import { AuthField } from './components/AuthField';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { DEMO_MODE } from '../../api/client';

const BUBBLES: [AuthBubble, AuthBubble, AuthBubble] = [
  { icon: 'business-outline', color: colors.blue },
  { icon: 'stats-chart-outline', color: colors.teal },
  { icon: 'people-outline', color: colors.gold },
];

export default function AdminLoginScreen() {
  const { loginAdmin } = useAuth();
  const { t } = useI18n();
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(sheetOpacity, { toValue: 1, duration: 420, delay: 160, useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: 0, duration: 420, delay: 160, useNativeDriver: true }),
    ]).start();
  }, [sheetOpacity, sheetTranslateY]);

  const submit = async () => {
    setError('');
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError(t('adminLogin.emailInvalid'));
      return;
    }
    setLoading(true);
    const ok = await loginAdmin(email, password);
    setLoading(false);
    if (!ok) setError(t('adminLogin.error'));
  };

  const showForgotPassword = () => {
    Alert.alert(t('adminLogin.forgotPasswordTitle'), t('adminLogin.forgotPasswordBody'));
  };

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <AuthHero
        roleLabel={t('adminLogin.roleChip')}
        headline={t('adminLogin.heroHeadline')}
        bubbles={BUBBLES}
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          {/* Corner clipping lives on this plain (non-animated) View; the
              Animated.View inside only ever animates opacity/transform. Mixing
              overflow+borderRadius with an animated transform on the SAME node
              is unreliable across platforms (esp. web), so they're split. */}
          <View style={styles.sheet}>
            <Animated.View
              style={{ opacity: sheetOpacity, transform: [{ translateY: sheetTranslateY }] }}
            >
              <View style={styles.grabber} />

              <AuthField
                icon="mail-outline"
                placeholder={t('adminLogin.emailPlaceholder')}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <AuthField
                icon="lock-closed-outline"
                isPassword
                placeholder={t('adminLogin.passwordLabel')}
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
                error={error || undefined}
              />

              <Pressable onPress={showForgotPassword} hitSlop={8} accessibilityRole="button">
                <Text style={styles.forgot}>{t('adminLogin.forgotPassword')}</Text>
              </Pressable>

              <Button
                title={t('adminLogin.submit')}
                onPress={submit}
                loading={loading}
                style={{ backgroundColor: colors.navy, marginTop: spacing.md }}
              />

              {DEMO_MODE ? (
                <View style={styles.demoNote}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.gray500} />
                  <Text style={styles.demoText}>{t('adminLogin.demoHint')}</Text>
                </View>
              ) : null}
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy },
  sheet: {
    flex: 1, backgroundColor: colors.white,
    borderTopLeftRadius: 36, borderTopRightRadius: 36,
    overflow: 'hidden',
    marginTop: -28,
    paddingTop: spacing.lg, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl,
  },
  grabber: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: colors.gray200,
    alignSelf: 'center', marginBottom: spacing.xl,
  },
  forgot: {
    alignSelf: 'flex-end', color: colors.gray500, fontSize: font.small, fontWeight: '700',
    marginBottom: spacing.lg,
  },
  demoNote: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    backgroundColor: colors.gray50, borderRadius: radius.md,
    padding: spacing.md, marginTop: spacing.lg,
  },
  demoText: { flex: 1, fontSize: font.tiny + 1, color: colors.gray500, lineHeight: 17 },
});
