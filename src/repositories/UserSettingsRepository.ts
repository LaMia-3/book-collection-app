import storageService from '@/services/storage/StorageService';
import { getStoredAuthToken } from '@/lib/auth-storage';
import { userSettingsApi } from '@/lib/apiClient';
import { UserSettings, defaultSettings, mergeUserSettings } from '@/types/user-settings';

const isAuthenticatedSession = (): boolean => Boolean(getStoredAuthToken());

export class UserSettingsRepository {
  async get(): Promise<UserSettings | null> {
    if (isAuthenticatedSession()) {
      const settings = await userSettingsApi.get();
      return mergeUserSettings(defaultSettings, settings);
    }

    const settings = await storageService.getSettings();
    return mergeUserSettings(defaultSettings, (settings as UserSettings | null) || null);
  }

  async update(settings: UserSettings): Promise<UserSettings> {
    if (isAuthenticatedSession()) {
      const updatedSettings = await userSettingsApi.update(settings);
      return mergeUserSettings(defaultSettings, updatedSettings);
    }

    await storageService.saveSettings(settings);
    return mergeUserSettings(defaultSettings, settings);
  }
}

export const userSettingsRepository = new UserSettingsRepository();
