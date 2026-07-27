import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, spacing } from '../../../theme';

export interface AuthBubble {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

/**
 * Dark hero header shared by the two login screens: floating brand-color
 * accent dots, a cluster of 3 icon "avatar" bubbles with a role name-chip
 * (echoes the playful reference design without needing bespoke illustration
 * assets — icons are drawn from the same Ionicons set used across the app),
 * and a centered headline. Plays its own entrance animation on mount.
 */
export function AuthHero({ roleLabel, headline, bubbles, onBack }: {
  roleLabel: string; headline: string; bubbles: [AuthBubble, AuthBubble, AuthBubble]; onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 420, delay: 80, useNativeDriver: true }),
      Animated.timing(contentTranslateY, { toValue: 0, duration: 420, delay: 80, useNativeDriver: true }),
    ]).start();
  }, [contentOpacity, contentTranslateY]);

  return (
    <View style={styles.root}>
      <View style={styles.dots} pointerEvents="none">
        <View style={[styles.dot, { top: 18, left: 28, width: 10, height: 10, backgroundColor: colors.gold }]} />
        <View style={[styles.dot, { top: 54, right: 40, width: 14, height: 14, backgroundColor: colors.teal }]} />
        <View style={[styles.dot, { top: 118, left: 16, width: 7, height: 7, backgroundColor: colors.onNavyBorder }]} />
        <View style={[styles.dot, { bottom: 26, right: 20, width: 16, height: 16, backgroundColor: colors.onNavySoft }]} />
        <View style={[styles.dot, { bottom: 64, left: 44, width: 6, height: 6, backgroundColor: colors.gold }]} />
      </View>

      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Retour"
        hitSlop={10}
        style={[styles.backBtn, { top: insets.top + spacing.sm }]}
      >
        <Ionicons name="chevron-back" size={20} color={colors.onNavy} />
      </Pressable>

      <Animated.View
        style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }}
      >
        <View style={styles.cluster}>
          <View style={styles.clusterTopRow}>
            <Bubble bubble={bubbles[0]} size={62} />
            <Bubble bubble={bubbles[1]} size={62} />
          </View>
          <Bubble bubble={bubbles[2]} size={70} style={styles.clusterBottom} />
          <View style={styles.chip}>
            <Text style={styles.chipText}>{roleLabel}</Text>
          </View>
        </View>

        <Text style={styles.headline}>{headline}</Text>
      </Animated.View>
    </View>
  );
}

function Bubble({ bubble, size, style }: { bubble: AuthBubble; size: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        styles.bubble,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: `${bubble.color}26` },
        style,
      ]}
    >
      <Ionicons name={bubble.icon} size={size * 0.42} color={bubble.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.navy,
    paddingTop: spacing.xxxl + spacing.lg,
    paddingBottom: spacing.xxl + spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    overflow: 'hidden',
  },
  dots: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  dot: { position: 'absolute', borderRadius: 999 },
  backBtn: {
    position: 'absolute', left: spacing.lg, zIndex: 1,
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.onNavySoft,
  },
  cluster: { width: 170, height: 128, alignItems: 'center' },
  clusterTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', width: '100%',
  },
  clusterBottom: { position: 'absolute', top: 46, alignSelf: 'center' },
  bubble: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.navy,
  },
  chip: {
    position: 'absolute', bottom: 6, alignSelf: 'center',
    backgroundColor: colors.onNavySoft, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: 5,
    borderWidth: 1, borderColor: colors.onNavyBorder,
  },
  chipText: { color: colors.onNavy, fontSize: font.small, fontWeight: '800' },
  headline: {
    marginTop: spacing.lg,
    fontSize: font.h1, fontWeight: '800', color: colors.onNavy,
    letterSpacing: -0.4, lineHeight: 32, textAlign: 'center',
  },
});
