import { Capacitor } from '@capacitor/core';

export const hapticLight = () => {
  if (!Capacitor.isNativePlatform()) return;
  import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  }).catch(() => {});
};

export const hapticMedium = () => {
  if (!Capacitor.isNativePlatform()) return;
  import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => {
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
  }).catch(() => {});
};
