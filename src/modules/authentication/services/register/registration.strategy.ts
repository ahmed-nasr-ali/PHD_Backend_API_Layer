import { RegisteredAs } from '../../domain/enums/registered-as.enum';
import { User } from '../../domain/models/user.model';
import { RegisterDto } from '../../dto/register.dto';

/** Every registration strategy (one per user type) must have these two things. */
export abstract class RegistrationStrategy {
  /** Which user type this strategy handles, e.g. RegisteredAs.Tenant */
  abstract readonly type: RegisteredAs;

  /** Registers the user from the form and returns the saved user. */
  abstract execute(body: RegisterDto): Promise<User>;
}
