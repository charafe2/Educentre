import { createNavigationContainerRef } from '@react-navigation/native';

// RootNavigator swaps entire navigator trees based on auth role rather than
// using one unified root stack, so there's no single shared param-list type
// to type this ref against precisely. Kept loosely typed on purpose —
// callers (see notifications service) only navigate to screens that exist
// in the currently-mounted tree, and no-op harmlessly otherwise.
export const navigationRef = createNavigationContainerRef<Record<string, object | undefined>>();

export function navigateFromNotification(name: string, params?: object): void {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate(name, params);
}
