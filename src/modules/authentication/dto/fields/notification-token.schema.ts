import { z } from 'zod';

/** Firebase token of the device, saved on the user for push notifications. */
export const notificationTokenSchema = z
  .string()
  .min(1, 'Notification token is required');
