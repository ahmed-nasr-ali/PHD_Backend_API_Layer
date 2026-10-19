import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './interceptors/response.interceptor';

/** Registers the success envelope for the whole app: every successful controller result is wrapped by `ResponseInterceptor`. */
@Module({
  providers: [{ provide: APP_INTERCEPTOR, useClass: ResponseInterceptor }],
})
export class ApiResponseModule {}
