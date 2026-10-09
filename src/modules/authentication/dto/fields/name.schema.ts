import { z } from 'zod';

/** Letters (any language) and spaces only. */
export const nameSchema = z
  .string()
  .trim()
  .regex(/^[\p{L} ]+$/u, 'Name must contain letters and spaces only');
