import { Platform } from 'react-native';
import * as Location from 'expo-location';
import type { Coordinates } from './branches';

/**
 * Asks for "while using" location and reads it; null when denied or unavailable.
 * When the phone's location is off, Android offers its own "turn on" dialog;
 * iOS has none, so the branch sheet offers Settings instead.
 */
export async function getUserLocation(): Promise<Coordinates | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    if (!(await Location.hasServicesEnabledAsync())) {
      if (Platform.OS !== 'android') return null;
      await Location.enableNetworkProviderAsync();
    }
    const position =
      (await Location.getLastKnownPositionAsync()) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return position ? { latitude: position.coords.latitude, longitude: position.coords.longitude } : null;
  } catch {
    return null;
  }
}

/** Whether asking again can still show the system prompt, or only Settings can turn location on. */
export async function canAskForLocation(): Promise<boolean> {
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    return permission.status !== 'denied' || permission.canAskAgain;
  } catch {
    return false;
  }
}
