import { z } from 'zod';
import { IdentityKind } from '../../domain/enums/identity-kind.enum';
import { nationalIdSchema } from './national-id.schema';
import { passportSchema } from './passport.schema';

/** National ID or passport, exactly one: kind national → nationalIdSchema · kind passport → passportSchema */
export const identitySchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal(IdentityKind.National),
    number: nationalIdSchema,
  }),
  z.strictObject({
    kind: z.literal(IdentityKind.Passport),
    number: passportSchema,
  }),
]);
