export abstract class TokenProvider {
  abstract getCrmToken(forceRefresh?: boolean): Promise<string>;
}
