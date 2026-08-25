import { NativeBiometric, BiometryType } from 'capacitor-native-biometric';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

const PREF_KEY = 'linkup_biometric_enabled';

export { BiometryType };

export async function isBiometricAvailable(): Promise<{ available: boolean; type: BiometryType }> {
  if (!Capacitor.isNativePlatform()) return { available: false, type: BiometryType.NONE };
  try {
    const result = await NativeBiometric.isAvailable({ useFallback: false });
    return { available: result.isAvailable, type: result.biometryType };
  } catch {
    return { available: false, type: BiometryType.NONE };
  }
}

export async function verifyBiometric(): Promise<void> {
  if (!Capacitor.isNativePlatform()) throw new Error('Biometrics not available on web');
  await NativeBiometric.verifyIdentity({
    reason: 'Unlock LinkUp',
    title: 'LinkUp',
    useFallback: true,
  });
}

export async function getBiometricEnabled(): Promise<boolean> {
  const { value } = await Preferences.get({ key: PREF_KEY });
  return value === 'true';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await Preferences.set({ key: PREF_KEY, value: String(enabled) });
}
