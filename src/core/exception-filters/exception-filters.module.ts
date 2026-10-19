import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { BusinessErrorFilter } from './business-error/business-error.filter';
import { DataverseExceptionFilter } from './dataverse-exception/dataverse-exception.filter';
import { HttpExceptionFilter } from './http-exception/http-exception.filter';
import { UnhandledExceptionFilter } from './unhandled-exception/unhandled-exception.filter';

/**
 * Registers the exception filters for the whole app, so every thrown error leaves as the error envelope.
 * Nest tries global filters in reverse order: the catch-all must stay first.
 */
@Module({
  providers: [
    { provide: APP_FILTER, useClass: UnhandledExceptionFilter },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: DataverseExceptionFilter },
    { provide: APP_FILTER, useClass: BusinessErrorFilter },
  ],
})
export class ExceptionFiltersModule {}
