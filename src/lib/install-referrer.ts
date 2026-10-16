import { Platform } from 'react-native';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { referrerToUrl } from './links';

const CONSUMED_KEY = 'rm_install_referrer_consumed';

/**
 * Android only: the Play Store hands the `referrer` of the store link to the
 * first launch. Read it once so a later launch never jumps back to that cafe.
 */
export async function consumeInstallReferrerUrl(): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  if (await AsyncStorage.getItem(CONSUMED_KEY)) return null;
  await AsyncStorage.setItem(CONSUMED_KEY, '1');
  try {
    const referrer = await Application.getInstallReferrerAsync();
    return referrer ? referrerToUrl(referrer) : null;
  } catch {
    return null;
  }
}
