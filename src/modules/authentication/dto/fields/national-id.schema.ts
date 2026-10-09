import { z } from 'zod';

export const nationalIdSchema = z
  .string()
  .regex(/^\d{14}$/, 'National ID must be exactly 14 digits');
