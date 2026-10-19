import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { BusinessErrorFilter } from './filters/business-error/business-error.filter';
import { DataverseExceptionFilter } from './filters/dataverse-exception/dataverse-exception.filter';
import { HttpExceptionFilter } from './filters/http-exception/http-exception.filter';
import { UnhandledExceptionFilter } from './filters/unhandled-exception/unhandled-exception.filter';
import { ResponseInterceptor } from './interceptors/response.interceptor';

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
export class ApiResponseModule {}
