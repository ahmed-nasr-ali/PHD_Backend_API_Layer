import { z } from 'zod';

/** 8 letters or digits; case is not checked (Dataverse compares case-insensitively). */
export const invitationCodeSchema = z
  .string()
  .regex(/^[A-Za-z0-9]{8}$/, 'Code must be exactly 8 letters or digits');
