import { Injectable } from '@nestjs/common';
import { TokenProvider } from '../crm-token/token.provider';
import { DataverseException } from '../errors/dataverse.exception';
import { DataverseRetryPolicy } from './dataverse-retry.policy';

/** On 401, forces a fresh token and retries once; any other failure is rethrown. */
@Injectable()
export class TokenRefreshRetryPolicy extends DataverseRetryPolicy {
  constructor(private readonly tokenProvider: TokenProvider) {
    super();
  }

  async execute<T>(send: (token?: string) => Promise<T>): Promise<T> {
    try {
      return await send();
    } catch (error) {
      if (!this.isUnauthorizedError(error)) {
        throw error;
      }
    }

    const freshToken = await this.tokenProvider.getToken(true);
    return await send(freshToken);
  }

  private isUnauthorizedError(error: unknown): boolean {
    return error instanceof DataverseException && error.status === 401;
  }
}
