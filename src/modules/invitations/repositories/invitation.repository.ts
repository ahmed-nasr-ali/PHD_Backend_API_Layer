import { Invitation } from '../domain/models/invitation.model';

/**
 * What the services need from invitation storage.
 * An abstract class (not an interface) so it can be used as a Nest DI token.
 */
export abstract class InvitationRepository {
  /** Every invitation with this code, in any status; empty when there is none. */
  abstract findAllByCode(code: string): Promise<Invitation[]>;
}
