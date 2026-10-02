import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { TokenProvider } from './token-provider';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { DataverseConfig } from '../config/dataverse.config';

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
    const result = await this.msal.acquireTokenByClientCredential({
      scopes: [this.scope],
      skipCache: forceRefresh,
    });

    if (!result?.accessToken) {
      throw new InternalServerErrorException(
        'Azure AD returned no access token',
      );
    }

    return result.accessToken;
  }
}
