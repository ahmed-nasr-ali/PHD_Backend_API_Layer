import { z } from 'zod';

/** Letters (any language) and spaces only · longer than 100 (com_name column) → 422 */
export const nameSchema = z
  .string()
  .trim()
  .max(100, 'Name must be at most 100 characters')
  .regex(/^[\p{L} ]+$/u, 'Name must contain letters and spaces only');
