export interface Validator<T = unknown> {
  validate(value: unknown): Promise<T>;
}
