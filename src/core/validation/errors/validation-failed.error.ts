export interface ValidationIssue {
  field: string;
  message: string;
}

export class ValidationFailedError extends Error {
  constructor(readonly issues: ValidationIssue[]) {
    super('Validation failed');
    this.name = 'ValidationFailedError';
  }
}
