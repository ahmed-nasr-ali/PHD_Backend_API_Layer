export abstract class TokenProvider {
  abstract getToken(forceRefresh?: boolean): Promise<string>;
}
