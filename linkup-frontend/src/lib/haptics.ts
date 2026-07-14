import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const hapticLight = () => {
  if (Capacitor.isNativePlatform()) Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
};

export const hapticMedium = () => {
  if (Capacitor.isNativePlatform()) Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
};
