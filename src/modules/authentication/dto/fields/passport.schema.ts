import { z } from 'zod';

export const passportSchema = z
  .string()
  .trim()
  .min(1, 'Passport number is required');
