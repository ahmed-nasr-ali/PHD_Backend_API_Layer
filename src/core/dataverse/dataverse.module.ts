import { Module } from '@nestjs/common';
import { DataverseClient } from './data-access/dataverse.client';
import { DataverseRetryPolicy } from './policies/dataverse-retry.policy';
import { TokenRefreshRetryPolicy } from './policies/token-refresh-retry.policy';
import {
  dataverseConfigProvider,
  dynamicsWebApiProvider,
  msalProvider,
} from './dataverse.providers';
import { DynamicsWebApiClient } from './data-access/dynamics-web-api.client';
import { MsalTokenProvider } from './crm-token/msal-token.provider';
import { TokenProvider } from './crm-token/token.provider';

@Module({
  providers: [
    dataverseConfigProvider,
    msalProvider,
    { provide: TokenProvider, useClass: MsalTokenProvider },
    dynamicsWebApiProvider,
    { provide: DataverseRetryPolicy, useClass: TokenRefreshRetryPolicy },
    { provide: DataverseClient, useClass: DynamicsWebApiClient },
  ],
  exports: [DataverseClient],
})
export class DataverseModule {}
