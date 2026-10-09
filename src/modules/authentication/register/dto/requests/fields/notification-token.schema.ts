import { z } from 'zod';

/** Firebase token of the device, saved on the user for push notifications · empty or longer than 300 (com_appnotificationtoken column) → 422 */
export const notificationTokenSchema = z
  .string()
  .min(1, 'Notification token is required')
  .max(300, 'Notification token must be at most 300 characters');
