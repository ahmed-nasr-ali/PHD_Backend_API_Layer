import { z } from 'zod';

/**
 * Date only, e.g. 1995-02-01 → a `Date` (UTC midnight) after validation
 * · not YYYY-MM-DD → 422 (one message, the future check is skipped) · a future date → 422
 */
export const birthDateSchema = z.iso
  .date({ error: 'Birth date must be YYYY-MM-DD', abort: true })
  .refine(
    (value) => new Date(value) <= new Date(),
    'Birth date cannot be in the future',
  )
  .transform((value) => new Date(value));
