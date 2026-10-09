import { Invitation } from '../domain/models/invitation.model';

/**
 * What the services need from invitation storage.
 * An abstract class (not an interface) so it can be used as a Nest DI token.
 */
export abstract class InvitationRepository {
  /** Every invitation with this code, in any status; empty when there is none. */
  abstract findAllByCode(code: string): Promise<Invitation[]>;

  /** Closes the invitation (status Deactivated) so its code can't be used again. */
  abstract deactivate(id: string): Promise<void>;

  /** Links the registered user to the invitation; the status does not change. */
  abstract linkUser(id: string, userId: string): Promise<void>;

  /** Closes the invitation as used (status Completed, accepted now); the linked user does not change. */
  abstract complete(id: string): Promise<void>;
}
