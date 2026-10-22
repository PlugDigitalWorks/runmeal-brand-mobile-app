import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isAxiosError } from 'axios';
import i18n from '@/i18n';
import { BRAND_SCOPED_PREFIX, getBrandId } from '@/lib/brand-store';
import { registerExpoPushToken, removeExpoPushToken } from '@/services/notification.service';

/** Android 8+ shows notifications only on a channel; the server sends order updates to this one. */
export const ANDROID_CHANNEL_ID = 'default';
/** Set once the app has shown its own "why notifications" screen, so it never asks twice. */
const ASKED_KEY = `${BRAND_SCOPED_PREFIX}push-permission-asked`;

export type PushPermission = 'granted' | 'denied' | 'undetermined';
export type PushRegistration = 'registered' | 'skipped' | 'guest' | 'failed';

/** The token this phone last registered, so sign-out can untie it. Never logged. */
let currentToken: string | null = null;
/** One registration at a time: overlapping calls share it instead of racing the API. */
let inFlight: Promise<PushRegistration> | null = null;
/** The device token the OS last reported, so only a real rotation registers again. */
let lastDeviceToken: string | null = null;

/** What went wrong, for the log: the API's code or status, else the error's own message. Never the token. */
function failureReason(error: unknown, code: string | undefined): string {
  if (code) return code;
  if (isAxiosError(error)) return error.response ? `HTTP ${error.response.status}` : `network: ${error.code ?? error.message}`;
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/ExponentPushToken\[[^\]]*\]/g, 'ExponentPushToken[…]');
}

const apiCode = (error: unknown): string | undefined =>
  isAxiosError(error) ? ((error.response?.data as { code?: unknown } | undefined)?.code as string | undefined) : undefined;

/** Banner and sound for a notification that arrives while the app is open, plus Android's channel. */
export async function setUpNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: i18n.t('notifications.channel'),
      importance: AndroidImportance.HIGH,
      sound: 'default',
    }).catch(() => null);
  }
}

/** Push needs a real phone and this brand's EAS project; a simulator or an unlinked build skips it. */
export function canUsePush(): boolean {
  return Device.isDevice && !!easProjectId();
}

function easProjectId(): string | undefined {
  return (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ?? Constants.easConfig?.projectId;
}

export async function getPushPermission(): Promise<PushPermission> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

/** The system prompt, shown only from the app's own explanation screen. */
export async function requestPushPermission(): Promise<PushPermission> {
  await markPermissionAsked();
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

export async function wasPermissionAsked(): Promise<boolean> {
  return (await AsyncStorage.getItem(ASKED_KEY).catch(() => null)) === '1';
}

export async function markPermissionAsked(): Promise<void> {
  await AsyncStorage.setItem(ASKED_KEY, '1').catch(() => undefined);
}

async function fetchToken(): Promise<string> {
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId: easProjectId() });
  return data;
}

/**
 * Ties this phone to the signed-in user for this brand: after sign-in, on every
 * launch and when the OS rotates the token. The caller checks for a signed-in,
 * non-guest user. Errors are logged by code only and never shown, except the
 * guest refusal, which the caller can put into words.
 */
export function registerForPush(): Promise<PushRegistration> {
  inFlight ??= register().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function register(): Promise<PushRegistration> {
  const brandId = getBrandId();
  const permission = await getPushPermission();
  if (!canUsePush() || !brandId || permission !== 'granted') {
    if (__DEV__) console.info(`[push] skipped: device=${Device.isDevice} project=${!!easProjectId()} brand=${!!brandId} permission=${permission}`);
    return 'skipped';
  }
  try {
    let token = await fetchToken();
    try {
      await registerExpoPushToken(token, brandId);
    } catch (error) {
      if (apiCode(error) !== 'PUSH_TOKEN_INVALID') throw error;
      // A stale token: ask Expo for a fresh one and try exactly once more.
      token = await fetchToken();
      await registerExpoPushToken(token, brandId);
    }
    currentToken = token;
    if (__DEV__) console.info('[push] registered');
    return 'registered';
  } catch (error) {
    const code = apiCode(error);
    if (code === 'PUSH_GUEST_NOT_ALLOWED') return 'guest';
    console.warn(`[push] registration failed (${failureReason(error, code)})`);
    return 'failed';
  }
}

/** Before sign-out: never blocks it, whatever the API answers. */
export async function unregisterFromPush(): Promise<void> {
  try {
    const token = currentToken ?? (canUsePush() && (await getPushPermission()) === 'granted' ? await fetchToken() : null);
    if (token) await removeExpoPushToken(token);
  } catch {
    // Signing out goes on; the API drops tokens nobody refreshes within 180 days.
  } finally {
    currentToken = null;
  }
}

/**
 * Calls back when the OS hands the app a different device token. Every token
 * fetch (registerForPush included) reports the current token again; reacting
 * to those would register in a loop, so the first report and repeats are only noted.
 */
export function onPushTokenChange(listener: () => void): () => void {
  const subscription = Notifications.addPushTokenListener(({ data }) => {
    const token = typeof data === 'string' ? data : JSON.stringify(data);
    const rotated = lastDeviceToken !== null && token !== lastDeviceToken;
    lastDeviceToken = token;
    if (rotated) listener();
  });
  return () => subscription.remove();
}
