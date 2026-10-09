import { z } from 'zod';

/** 8 to 100 characters (com_password column), with a digit, a lower-case letter, an upper-case letter and a symbol. */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be at most 100 characters')
  .regex(
    /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).+$/,
    'Password must contain a digit, a lower-case letter, an upper-case letter and a symbol',
  );
