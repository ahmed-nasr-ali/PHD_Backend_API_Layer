import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { ApiResponseBuilder } from './api-response';

/** Wraps every successful controller result in the success envelope. */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const response = context
      .switchToHttp()
      .getResponse<{ statusCode: number }>();

    return next.handle().pipe(
      map((data: unknown) => {
        if (
          data instanceof StreamableFile ||
          response.statusCode === HttpStatus.NO_CONTENT
        ) {
          return data;
        }
        return ApiResponseBuilder.success(response.statusCode, data ?? null);
      }),
    );
  }
}
