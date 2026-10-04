import { ErrorCode } from '../../errors';

export interface ValidationIssue {
  field?: string;
  message: string;
}

export class ValidationFailedError extends Error {
  readonly code = ErrorCode.ValidationFailed;

  constructor(readonly issues: ValidationIssue[]) {
    super('Validation failed');
    this.name = 'ValidationFailedError';
  }
}
