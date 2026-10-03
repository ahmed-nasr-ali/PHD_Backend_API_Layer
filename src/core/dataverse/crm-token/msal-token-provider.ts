import { Injectable } from '@nestjs/common';
import { TokenProvider } from './token-provider';
import {
  AuthenticationResult,
  ConfidentialClientApplication,
} from '@azure/msal-node';
import { DataverseConfig } from '../config/dataverse.config';
import { DataverseException } from '../errors/dataverse.exception';

@Injectable()
export class MsalTokenProvider extends TokenProvider {
  private readonly scope: string;

  constructor(
    private readonly msal: ConfidentialClientApplication,
    config: DataverseConfig,
  ) {
    super();
    this.scope = `${config.url}/.default`;
  }

  async getToken(forceRefresh?: boolean): Promise<string> {
    let result: AuthenticationResult | null;
    try {
      result = await this.msal.acquireTokenByClientCredential({
        scopes: [this.scope],
        skipCache: forceRefresh,
      });
    } catch (error) {
      throw new DataverseException(
        'Failed to acquire Azure AD token',
        undefined,
        {
          cause: error,
        },
      );
    }

    if (!result?.accessToken) {
      throw new DataverseException('Azure AD returned no access token');
    }

    return result.accessToken;
  }
}
