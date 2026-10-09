import { z } from 'zod';

/** Any letters/digits (no fixed format, S10); spaces around it are removed · empty → 422 · longer than 100 (com_passportnumber column) → 422 */
export const passportSchema = z
  .string()
  .trim()
  .min(1, 'Passport number is required')
  .max(100, 'Passport number must be at most 100 characters');
