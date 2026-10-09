import { z } from 'zod';

/** Egyptian national ID: exactly 14 digits, e.g. 29801011234567 (S10) · anything else → 422 */
export const nationalIdSchema = z
  .string()
  .regex(/^\d{14}$/, 'National ID must be exactly 14 digits');
