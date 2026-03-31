import { NativeModule } from 'expo';
import { resolveNativeModule } from '@expo-pico/platform-service-common';

declare class ExpoPicoNotificationsModule extends NativeModule {
  readonly notificationsSdkAvailable: boolean;
  readonly notificationsSdkVersion: string;

  getPermissionStatus(): string;
  requestPermissions(): Promise<Record<string, unknown>>;
}

const { available, nativeModule } = resolveNativeModule<ExpoPicoNotificationsModule>('ExpoPicoNotifications');

export const NativeNotifications = available ? nativeModule : null;
export const notificationsNativeAvailable = available;
