import { Module } from '@nestjs/common';
import { DataverseClient } from './client/dataverse.client';
import { RequestPolicy } from './policies/request.policy';
import { RetryOnExpiredTokenPolicy } from './policies/expired-token/retry-on-expired-token.policy';
import {
  dataverseConfigProvider,
  dynamicsWebApiProvider,
  msalProvider,
} from './dataverse.providers';
import { DynamicsWebApiClient } from './client/dynamics-web-api/dynamics-web-api.client';
import { MsalTokenProvider } from './auth/msal/msal-token.provider';
import { TokenProvider } from './auth/token.provider';

@Module({
  providers: [
    dataverseConfigProvider,
    msalProvider,
    { provide: TokenProvider, useClass: MsalTokenProvider },
    dynamicsWebApiProvider,
    { provide: RequestPolicy, useClass: RetryOnExpiredTokenPolicy },
    { provide: DataverseClient, useClass: DynamicsWebApiClient },
  ],
  exports: [DataverseClient],
})
export class DataverseModule {}
