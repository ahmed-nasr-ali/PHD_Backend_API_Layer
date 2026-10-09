import { RegisteredAs } from '../../../../shared/domain/enums/registered-as.enum';
import { User } from '../../../domain/models/user.model';
import type { RegisterInput } from '../../register.input';

/** Every registration strategy (one per user type) must have these two things. */
export abstract class RegistrationStrategy {
  /** Which user type this strategy handles, e.g. RegisteredAs.Tenant */
  abstract readonly type: RegisteredAs;

  /** Registers the user from the input and returns the saved user. */
  abstract execute(input: RegisterInput): Promise<User>;
}
