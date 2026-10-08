import { InvitationStatus } from '../enums/invitation-status.enum';
import { InvitedAs } from '../enums/invited-as.enum';
import { Relationship } from '../enums/relationship.enum';
import { InvitationCompound } from './invitation-compound.model';
import { InvitationProps } from './invitation.props';

export class Invitation {
  readonly id: string;
  readonly status: InvitationStatus | null;
  readonly invitedAs: InvitedAs | null;
  readonly name: string | null;
  readonly mobile: string | null;
  readonly relationship: Relationship | null;
  readonly createdOn: Date;
  private readonly compounds: InvitationCompound[];

  private constructor(props: InvitationProps) {
    this.id = props.id;
    this.status = props.status;
    this.invitedAs = props.invitedAs;
    this.name = props.name;
    this.mobile = props.mobile;
    this.relationship = props.relationship;
    this.createdOn = props.createdOn;
    this.compounds = props.compounds;
  }

  /** An invitation loaded from storage: trusted data, no rules are run. */
  static restore(props: InvitationProps): Invitation {
    return new Invitation(props);
  }

  /**
   * One terms-and-conditions text per compound; compounds without a text are skipped.
   * Only Tenant invitations have terms and conditions.
   */
  get termsAndConditions(): string[] {
    if (this.invitedAs !== InvitedAs.Tenant) {
      return [];
    }

    const byCompound = new Map<string, string>();
    for (const compound of this.compounds) {
      if (compound.termsAndConditions) {
        byCompound.set(compound.id, compound.termsAndConditions);
      }
    }
    return [...byCompound.values()];
  }
}
