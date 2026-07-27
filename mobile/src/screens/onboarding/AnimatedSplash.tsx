import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import { colors, font } from '../../theme';

const LOGO_SIZE = 108;
const UNDERLINE_WIDTH = 44;

/**
 * Custom JS-driven splash screen shown on top of the app while it boots.
 * Mirrors the native splash (white background + centered logo, see app.json's
 * expo-splash-screen plugin config) so the handoff from native → JS is
 * seamless, then plays a short brand entrance animation before fading out.
 *
 * The parent (App.tsx) is responsible for calling SplashScreen.hideAsync()
 * once this component has mounted, and for unmounting it via onFinish.
 */
export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkTranslateY = useRef(new Animated.Value(10)).current;
  const underlineWidth = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1, friction: 6, tension: 60, useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(wordmarkOpacity, {
          toValue: 1, duration: 380, easing: Easing.out(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(wordmarkTranslateY, {
          toValue: 0, duration: 380, easing: Easing.out(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(underlineWidth, {
          toValue: UNDERLINE_WIDTH, duration: 420, easing: Easing.out(Easing.ease), useNativeDriver: false,
        }),
      ]),
      Animated.delay(550),
      Animated.timing(overlayOpacity, {
        toValue: 0, duration: 380, easing: Easing.in(Easing.ease), useNativeDriver: true,
      }),
    ]).start(() => onFinish());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.root, { opacity: overlayOpacity }]} pointerEvents="none">
      <Animated.Image
        source={require('../../../assets/logo.png')}
        style={[
          styles.logo,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
        resizeMode="contain"
      />
      <Animated.View
        style={{ opacity: wordmarkOpacity, transform: [{ translateY: wordmarkTranslateY }] }}
      >
        <Text style={styles.wordmark}>
          Moujtahid<Text style={{ color: colors.gold }}>.</Text>
        </Text>
      </Animated.View>
      <Animated.View style={[styles.underline, { width: underlineWidth }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 999,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE, marginBottom: 14 },
  wordmark: {
    fontSize: font.h1,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.black,
    textAlign: 'center',
  },
  underline: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.teal,
    marginTop: 10,
  },
});
