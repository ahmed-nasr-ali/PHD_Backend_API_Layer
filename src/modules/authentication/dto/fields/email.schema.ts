import { z } from 'zod';

/** Spaces around it are removed before the check: " ahmed@x.com " → "ahmed@x.com" */
export const emailSchema = z
  .string()
  .trim()
  .pipe(z.email('Email is not valid'));
