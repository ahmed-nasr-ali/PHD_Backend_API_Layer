/** What went wrong, from the business point of view. Each caller (HTTP, CLI, queue) maps it its own way. */
export enum BusinessErrorKind {
  NotFound = 'not_found',
  Conflict = 'conflict',
  RuleViolation = 'rule_violation',
  Forbidden = 'forbidden',
  TooManyRequests = 'too_many_requests',
}

/** Base class for errors the business layers raise on purpose. Framework-free. */
export abstract class BusinessError extends Error {
  abstract readonly kind: BusinessErrorKind;

  constructor(
    message: string,
    readonly code: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Allowed again after a wait: the caller learns how long (HTTP: 429 + `retryAfterSeconds` in the body). */
export abstract class RetryLaterError extends BusinessError {
  readonly kind = BusinessErrorKind.TooManyRequests;

  constructor(
    message: string,
    code: string,
    readonly retryAfterSeconds: number,
  ) {
    super(message, code);
  }
}
