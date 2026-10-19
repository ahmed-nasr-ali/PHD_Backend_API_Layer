/**
 * Decides whether and how a Dataverse request is retried.
 * `send` performs the request; a token, when passed, replaces the cached one.
 */
export abstract class DataverseRetryPolicy {
  abstract execute<T>(send: (token?: string) => Promise<T>): Promise<T>;
}
