import { Injectable } from '@nestjs/common';
import { TokenProvider } from '../../auth/token.provider';
import { DataverseException } from '../../errors/dataverse.exception';
import { RequestPolicy } from '../request.policy';

/**
 * Retries a request once with a fresh token, because a cached token can expire or be revoked before MSAL notices.
 * 401 → refresh the cached token, send again · any other failure → rethrown.
 */
@Injectable()
export class RetryOnExpiredTokenPolicy extends RequestPolicy {
  constructor(private readonly tokenProvider: TokenProvider) {
    super();
  }

  async execute<T>(send: () => Promise<T>): Promise<T> {
    try {
      return await send();
    } catch (error) {
      const isUnauthorized =
        error instanceof DataverseException && error.status === 401;
      if (!isUnauthorized) throw error;

      // MSAL caches the new token, so the library's onTokenRefresh picks it up on the next send.
      await this.tokenProvider.getCrmToken(true);
      return send();
    }
  }
}
