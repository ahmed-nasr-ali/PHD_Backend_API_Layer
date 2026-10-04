import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import {
  BusinessErrorFilter,
  DataverseExceptionFilter,
  HttpExceptionFilter,
  UnhandledExceptionFilter,
} from './filters';
import { ResponseInterceptor } from './response.interceptor';

/**
 * Registers the response envelope for the whole app.
 * Nest tries global filters in reverse order: the catch-all must stay first.
 */
@Module({
  providers: [
    { provide: APP_FILTER, useClass: UnhandledExceptionFilter },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: DataverseExceptionFilter },
    { provide: APP_FILTER, useClass: BusinessErrorFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class HttpModule {}
