import * as z from 'zod/mini';

/*
 * Notifications de l'espace KSP (contrat `ksp-api.v1.yaml`, routes `/api/v1/notification/…`, ADR-039),
 * champ par champ : un champ obligatoire absent rend la réponse invalide, un champ ajouté est ignoré.
 * Schémas lus dans le navigateur : `zod/mini`.
 */

export const inAppNotificationSchema = z.object({
  id: z.string(),
  templateCode: z.string(),
  title: z.string(),
  body: z.string(),
  link: z.nullable(z.string()),
  createdAt: z.string(),
  readAt: z.nullable(z.string()),
});

export const notificationListSchema = z.object({
  data: z.array(inAppNotificationSchema),
  nextCursor: z.nullable(z.string()),
  unreadCount: z.int(),
});

export const unreadCountSchema = z.object({ unreadCount: z.int() });

export const markReadSchema = z.object({ notification: inAppNotificationSchema, unreadCount: z.int() });

export const markAllReadSchema = z.object({ marked: z.int(), unreadCount: z.int() });

export const preferencesSchema = z.object({
  whatsapp: z.boolean(),
  email: z.boolean(),
  updatedAt: z.nullable(z.string()),
});

export type InAppNotification = z.infer<typeof inAppNotificationSchema>;
export type NotificationList = z.infer<typeof notificationListSchema>;
export type NotificationPreferences = z.infer<typeof preferencesSchema>;
