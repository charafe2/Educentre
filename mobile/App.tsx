import React, { useCallback, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { I18nProvider } from './src/i18n/I18nContext';
import { NotificationProvider } from './src/notifications/NotificationProvider';
import RootNavigator from './src/navigation/RootNavigator';
import { AnimatedSplash } from './src/screens/onboarding/AnimatedSplash';

// Keep the native splash (white bg + logo, see app.json's expo-splash-screen
// plugin) visible until AnimatedSplash has mounted below, so there is no gap
// or flash between the native splash and our JS-driven brand animation.
void SplashScreen.preventAutoHideAsync();

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashReady = useCallback(() => {
    void SplashScreen.hideAsync();
  }, []);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <SafeAreaProvider onLayout={handleSplashReady}>
      <I18nProvider>
        <AuthProvider>
          <NotificationProvider />
          <StatusBar style="dark" />
          <RootNavigator />
        </AuthProvider>
      </I18nProvider>
      {showSplash && <AnimatedSplash onFinish={handleSplashFinish} />}
    </SafeAreaProvider>
  );
}
