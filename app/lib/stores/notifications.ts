import { create } from 'zustand';
import {
  NotificationSettings,
  DEFAULT_SETTINGS,
  loadNotificationSettings,
  saveNotificationSettings,
  scheduleNotifications,
  scheduleReengagementNudge,
  cancelAllNotifications,
  pickAndPersistDayWord,
  getPermissionStatus,
} from '@/lib/notifications';
import { getDb } from '@/lib/db/migrations';

interface NotificationState {
  settings: NotificationSettings;
  permissionStatus: 'granted' | 'denied' | 'undetermined' | null; // null = not checked yet
  initialized: boolean;

  /** Load settings from SQLite + check OS permission. Call once after sign-in. */
  initialize: (userId: string) => Promise<void>;

  /** Update one or more settings fields, persist, and reschedule. */
  updateSettings: (userId: string, patch: Partial<NotificationSettings>) => Promise<void>;

  /** Run the full schedule flow (called on app launch and after settings change). */
  runSchedule: (userId: string) => Promise<void>;

  /** Refresh the OS permission status (e.g. after returning from OS Settings). */
  refreshPermission: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  permissionStatus: null,
  initialized: false,

  initialize: async (userId) => {
    const [settings, status] = await Promise.all([
      loadNotificationSettings(userId),
      getPermissionStatus(),
    ]);
    set({ settings, permissionStatus: status, initialized: true });
  },

  updateSettings: async (userId, patch) => {
    const next = { ...get().settings, ...patch };
    set({ settings: next });
    await saveNotificationSettings(userId, next);
    await get().runSchedule(userId);
  },

  runSchedule: async (userId) => {
    const { settings } = get();

    // Count saved words to check library size.
    const db = await getDb();
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM saved_words WHERE user_id = ? AND deleted = 0`,
      [userId],
    );
    const wordCount = row?.count ?? 0;

    if (!settings.enabled || wordCount < 5) {
      await cancelAllNotifications();
      if (wordCount < 5) {
        await scheduleReengagementNudge(settings.morningTime, userId);
      }
      return;
    }

    const word = await pickAndPersistDayWord(userId);
    if (!word) {
      await cancelAllNotifications();
      return;
    }

    await scheduleNotifications(settings, word);
  },

  refreshPermission: async () => {
    const status = await getPermissionStatus();
    set({ permissionStatus: status });
  },
}));
