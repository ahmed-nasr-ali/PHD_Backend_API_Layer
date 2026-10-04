import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { DynamicsWebApi } from 'dynamics-web-api';
import { DataverseConfig } from './config/dataverse.config';
import { TokenProvider } from './crm-token/token.provider';

export const dataverseConfigProvider: Provider = {
  provide: DataverseConfig,
  inject: [ConfigService],
  useFactory: (config: ConfigService) =>
    new DataverseConfig({
      url: config.getOrThrow<string>('DV_URL'),
      tenantId: config.getOrThrow<string>('DV_TENANT_ID'),
      clientId: config.getOrThrow<string>('DV_CLIENT_ID'),
      clientSecret: config.getOrThrow<string>('DV_CLIENT_SECRET'),
    }),
};

export const msalProvider: Provider = {
  provide: ConfidentialClientApplication,
  inject: [DataverseConfig],
  useFactory: (config: DataverseConfig) =>
    new ConfidentialClientApplication({
      auth: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
      },
    }),
};

export const dynamicsWebApiProvider: Provider = {
  provide: DynamicsWebApi,
  inject: [DataverseConfig, TokenProvider],
  useFactory: (config: DataverseConfig, tokenProvider: TokenProvider) =>
    new DynamicsWebApi({
      serverUrl: config.url,
      dataApi: { version: '9.2' },
      onTokenRefresh: () => tokenProvider.getToken(),
      propagateErrors: true,
    }),
};
