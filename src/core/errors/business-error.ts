/** What went wrong, from the business point of view. Each caller (HTTP, CLI, queue) maps it its own way. */
export enum BusinessErrorKind {
  NotFound = 'not_found',
  Conflict = 'conflict',
  RuleViolation = 'rule_violation',
  Forbidden = 'forbidden',
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
