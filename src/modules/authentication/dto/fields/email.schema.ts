import { z } from 'zod';

/** Spaces around it are removed before the check: " ahmed@x.com " → "ahmed@x.com" · longer than 100 (com_email column) → 422 */
export const emailSchema = z
  .string()
  .trim()
  .max(100, 'Email must be at most 100 characters')
  .pipe(z.email('Email is not valid'));
