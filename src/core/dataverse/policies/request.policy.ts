/**
 * Decides how a Dataverse request is run when it may fail.
 * `send` performs the request; the policy may call it again (e.g. after refreshing the token).
 */
export abstract class RequestPolicy {
  abstract execute<T>(send: () => Promise<T>): Promise<T>;
}
