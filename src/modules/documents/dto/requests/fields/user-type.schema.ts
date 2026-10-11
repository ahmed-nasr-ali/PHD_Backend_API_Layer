import { z } from 'zod';
import { RegisteredAs } from '../../../../authentication/shared/domain/enums/registered-as.enum';

/**
 * The `type` field of one body shape. A multipart form sends every field as text, so the shape for owners expects "1"
 * and turns it into RegisteredAs.Owner (a number) for the input.
 * "1" → RegisteredAs.Owner · any other value → 422 from the union (Helper, unknown, or a number from a JSON body)
 */
export function userTypeSchema<T extends RegisteredAs>(type: T) {
  return z.literal(String(type)).transform((): T => type);
}
