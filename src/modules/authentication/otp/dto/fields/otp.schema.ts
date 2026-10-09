import { z } from 'zod';

/** 4 digits, as the CRM plugin makes them (and the app's 4-box input). A string: "0123" must keep its leading 0. */
export const otpSchema = z
  .string()
  .regex(/^\d{4}$/, 'Code must be exactly 4 digits');
