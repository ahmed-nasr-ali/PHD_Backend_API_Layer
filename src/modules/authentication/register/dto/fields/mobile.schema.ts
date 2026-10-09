import { z } from 'zod';

/** International format: + then country code and number, e.g. +201001234567. */
export const mobileSchema = z
  .string()
  .regex(
    /^\+[1-9]\d{7,14}$/,
    'Mobile must be in international format, e.g. +201001234567',
  );
