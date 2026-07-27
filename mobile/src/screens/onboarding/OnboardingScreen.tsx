import React, { useRef, useState } from 'react';
import {
  Animated, Easing, ImageSourcePropType, Pressable, ScrollView, StyleSheet, Text, View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, font, radius, spacing } from '../../theme';
import { useI18n } from '../../i18n/I18nContext';

export const ONBOARDING_STORAGE_KEY = 'moujtahid.onboarded';

interface SlideData {
  image: ImageSourcePropType;
  tint: string;
  titleKey: string;
  bodyKey: string;
}

const SLIDES: SlideData[] = [
  { image: require('../../../assets/onboarding/slide-1.jpg'), tint: colors.teal, titleKey: 'onboarding.slide1Title', bodyKey: 'onboarding.slide1Body' },
  { image: require('../../../assets/onboarding/slide-2.jpg'), tint: colors.danger, titleKey: 'onboarding.slide2Title', bodyKey: 'onboarding.slide2Body' },
  { image: require('../../../assets/onboarding/slide-3.jpg'), tint: colors.gold, titleKey: 'onboarding.slide3Title', bodyKey: 'onboarding.slide3Body' },
];

/**
 * First-launch onboarding: 3 full-bleed swipeable slides, each tinted with a
 * brand color (teal / danger red / gold — matching the logo + theme tokens),
 * ending on a "Commencer" CTA that hands off to the auth flow. Persists
 * completion in AsyncStorage so it only ever shows once (see RootNavigator).
 */
export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const ctaProgress = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);

  const finish = () => {
    AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true').catch(() => {});
    onDone();
  };

  const goToIndex = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
  };

  const handleMomentumEnd = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, index));
    setActiveIndex(clamped);
    Animated.timing(ctaProgress, {
      toValue: clamped === SLIDES.length - 1 ? 1 : 0,
      duration: 320,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  };

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
        onMomentumScrollEnd={handleMomentumEnd}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide, index) => (
          <Slide
            key={index}
            slide={slide}
            index={index}
            width={width}
            height={height}
            scrollX={scrollX}
            t={t}
          />
        ))}
      </Animated.ScrollView>

      {/* Skip — fades out on the last slide, where the CTA takes over. */}
      {!isLast && (
        <Pressable
          onPress={finish}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.skip')}
          hitSlop={12}
          style={[styles.skip, { top: insets.top + spacing.sm }]}
        >
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </Pressable>
      )}

      {/* Dots + next/start control cluster, anchored bottom-right. */}
      <View style={[styles.footer, { bottom: insets.bottom + spacing.xl }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, index) => (
            <Dot key={index} index={index} scrollX={scrollX} width={width} />
          ))}
        </View>

        <NextButton
          progress={ctaProgress}
          label={t('onboarding.start')}
          onPress={() => (isLast ? finish() : goToIndex(activeIndex + 1))}
        />
      </View>
    </View>
  );
}

function Slide({ slide, index, width, height, scrollX, t }: {
  slide: SlideData; index: number; width: number; height: number;
  scrollX: Animated.Value; t: (key: string) => string;
}) {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const imageScale = scrollX.interpolate({
    inputRange, outputRange: [1.15, 1, 1.15], extrapolate: 'clamp',
  });
  const imageTranslateX = scrollX.interpolate({
    inputRange, outputRange: [width * 0.18, 0, -width * 0.18], extrapolate: 'clamp',
  });
  const textOpacity = scrollX.interpolate({
    inputRange, outputRange: [0, 1, 0], extrapolate: 'clamp',
  });
  const textTranslateY = scrollX.interpolate({
    inputRange, outputRange: [24, 0, 24], extrapolate: 'clamp',
  });

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <Animated.Image
        source={slide.image}
        style={{
          width, height,
          transform: [{ scale: imageScale }, { translateX: imageTranslateX }],
        }}
        resizeMode="cover"
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: slide.tint, opacity: 0.5 }]} />
      <View style={[StyleSheet.absoluteFill, styles.bottomShade]} />

      <Animated.View
        style={[
          styles.slideContent,
          { opacity: textOpacity, transform: [{ translateY: textTranslateY }] },
        ]}
      >
        <Text style={styles.slideTitle}>{t(slide.titleKey)}</Text>
        <Text style={styles.slideBody}>{t(slide.bodyKey)}</Text>
      </Animated.View>
    </View>
  );
}

function Dot({ index, scrollX, width }: { index: number; scrollX: Animated.Value; width: number }) {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
  const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 22, 8], extrapolate: 'clamp' });
  const dotOpacity = scrollX.interpolate({ inputRange, outputRange: [0.45, 1, 0.45], extrapolate: 'clamp' });
  return <Animated.View style={[styles.dot, { width: dotWidth, opacity: dotOpacity }]} />;
}

/** Circular "next" arrow that morphs into a wide "Commencer" pill on the last slide. */
function NextButton({ progress, label, onPress }: {
  progress: Animated.Value; label: string; onPress: () => void;
}) {
  const buttonWidth = progress.interpolate({ inputRange: [0, 1], outputRange: [52, 172] });
  const iconOpacity = progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 0, 0] });
  const labelOpacity = progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 1] });

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Animated.View style={[styles.nextButton, { width: buttonWidth }]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.nextButtonCenter, { opacity: iconOpacity }]}>
          <Ionicons name="chevron-forward" size={22} color={colors.black} />
        </Animated.View>
        <Animated.Text style={[styles.nextButtonLabel, { opacity: labelOpacity }]} numberOfLines={1}>
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  bottomShade: {
    // A vertical dark gradient would need expo-linear-gradient; a flat
    // semi-transparent scrim over the lower half keeps text legible without
    // fighting the brand color tint above.
    top: '45%',
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  slideContent: {
    position: 'absolute', left: spacing.xl, right: spacing.xl, bottom: '18%',
  },
  slideTitle: {
    fontSize: font.h1, fontWeight: '800', color: colors.white,
    letterSpacing: -0.5, lineHeight: 34, marginBottom: spacing.sm,
  },
  slideBody: {
    fontSize: font.body + 1, fontWeight: '500', color: 'rgba(255,255,255,0.92)', lineHeight: 22,
  },
  skip: {
    position: 'absolute', right: spacing.xl,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  skipText: { color: colors.white, fontWeight: '700', fontSize: font.body, opacity: 0.9 },
  footer: {
    position: 'absolute', right: spacing.xl,
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { height: 8, borderRadius: 4, backgroundColor: colors.white },
  nextButton: {
    height: 52, borderRadius: radius.full, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  nextButtonCenter: { alignItems: 'center', justifyContent: 'center' },
  nextButtonLabel: { fontSize: font.body + 1, fontWeight: '800', color: colors.black },
});
