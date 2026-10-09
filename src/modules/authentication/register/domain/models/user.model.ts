import { RegisteredAs } from '../../../shared/domain/enums/registered-as.enum';
import { UserState, UserStatus } from '../../../shared/domain/enums/user-status.enum';
import { UserIdentity } from './user-identity.model';
import { UserProps } from './user.props';

export class User {
  readonly id: string;
  readonly name: string | null;
  readonly mobile: string | null;
  readonly email: string | null;
  readonly identity: UserIdentity | null;
  readonly birthDate: Date | null;
  readonly registeredAs: RegisteredAs | null;
  readonly status: UserStatus | null;
  private readonly state: UserState | null;
  private readonly profilePicturePath: string | null;

  private constructor(props: UserProps) {
    this.id = props.id;
    this.name = props.name;
    this.mobile = props.mobile;
    this.email = props.email;
    this.identity = props.identity;
    this.birthDate = props.birthDate;
    this.registeredAs = props.registeredAs;
    this.status = props.status;
    this.state = props.state;
    this.profilePicturePath = props.profilePicturePath;
  }

  /** A user loaded from storage: trusted data, no rules are run. */
  static restore(props: UserProps): User {
    return new User(props);
  }

  /** selfie uploaded → complete · no selfie → unfinished (same rule as the app today) */
  get isProfileComplete(): boolean {
    return Boolean(this.profilePicturePath);
  }

  /** statecode Inactive → deactivated by the CRM team · Active or unknown → not deactivated */
  get isDeactivated(): boolean {
    return this.state === UserState.Inactive;
  }
}
