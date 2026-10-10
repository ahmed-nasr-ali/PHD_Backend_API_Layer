import { RegisteredAs } from '../../../authentication/shared/domain/enums/registered-as.enum';
import { Relationship } from '../../../invitations/domain/enums/relationship.enum';
import { DocumentsUserProps } from './documents-user.props';

/** From this age a family member must also send the front of their ID (same rule as the app today). */
const ID_FRONT_REQUIRED_FROM_AGE = 15;

/** A user sending their registration documents. The CRM makes the record, so it is only ever loaded (restore). */
export class DocumentsUser {
  readonly id: string;
  readonly registeredAs: RegisteredAs | null;
  readonly birthDate: Date | null;
  readonly isDeactivated: boolean;
  readonly invitationId: string | null;
  readonly relationship: Relationship | null;

  private constructor(props: DocumentsUserProps) {
    this.id = props.id;
    this.registeredAs = props.registeredAs;
    this.birthDate = props.birthDate;
    this.isDeactivated = props.isDeactivated;
    this.invitationId = props.invitationId;
    this.relationship = props.relationship;
  }

  /** A user loaded from storage: trusted data, no rules are run. */
  static restore(props: DocumentsUserProps): DocumentsUser {
    return new DocumentsUser(props);
  }

  /**
   * Whether this user must send the front of their ID, from the birth date and today (the age is never stored, it goes stale).
   * 15 or older → true · younger → false · no birth date → true (we can't prove they are younger, so we ask for it)
   */
  mustSendIdFront(today: Date): boolean {
    if (!this.birthDate) {
      return true;
    }
    // The day the user turns 15, e.g. born 2011-10-10 → 2026-10-10.
    const fifteenthBirthday = new Date(this.birthDate);
    fifteenthBirthday.setUTCFullYear(
      fifteenthBirthday.getUTCFullYear() + ID_FRONT_REQUIRED_FROM_AGE,
    );
    return fifteenthBirthday <= today;
  }

  /** The invitation says Spouse → true · any other relationship, or none → false */
  get isSpouse(): boolean {
    return this.relationship === Relationship.Spouse;
  }
}
