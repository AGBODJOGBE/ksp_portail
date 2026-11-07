import { api, parseResponse } from '@/lib/api';
import {
  markAllReadSchema,
  markReadSchema,
  type NotificationList,
  type NotificationPreferences,
  notificationListSchema,
  preferencesSchema,
  unreadCountSchema,
} from './schemas';

/** Centre de notifications de l'espace KSP (session requise, ADR-038). */
const NOTIFICATIONS = '/api/v1/notification/notifications';
const PREFERENCES = '/api/v1/notification/preferences';

export const PAGE_SIZE = 20;

/** Les plus récentes d'abord ; `unreadOnly` : seulement les non lues. */
export async function listNotifications(cursor?: string, unreadOnly = false): Promise<NotificationList> {
  return parseResponse(
    notificationListSchema,
    await api.get(NOTIFICATIONS, {
      query: { limit: PAGE_SIZE, cursor, unread: unreadOnly ? 'true' : undefined },
    }),
  );
}

export async function countUnread(): Promise<number> {
  return parseResponse(unreadCountSchema, await api.get(`${NOTIFICATIONS}/unread-count`)).unreadCount;
}

export async function markRead(id: string) {
  return parseResponse(markReadSchema, await api.post(`${NOTIFICATIONS}/${encodeURIComponent(id)}/read`));
}

export async function markAllRead() {
  return parseResponse(markAllReadSchema, await api.post(`${NOTIFICATIONS}/read-all`));
}

export async function getPreferences(): Promise<NotificationPreferences> {
  return parseResponse(preferencesSchema, await api.get(PREFERENCES));
}

export async function updatePreferences(input: {
  whatsapp: boolean;
  email: boolean;
}): Promise<NotificationPreferences> {
  return parseResponse(preferencesSchema, await api.put(PREFERENCES, input));
}
