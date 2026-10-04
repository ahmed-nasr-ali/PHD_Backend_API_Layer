import {
  ArgumentsHost,
  ExceptionFilter,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ApiErrorResponse } from '../api-response';

/**
 * Base for every exception filter: subclasses only translate the exception
 * into the envelope; logging and writing the response live here once (Template Method).
 */
@Injectable()
export abstract class ApiExceptionFilter<E> implements ExceptionFilter<E> {
  private readonly logger = new Logger(this.constructor.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: E, host: ArgumentsHost): void {
    const { httpAdapter } = this.adapterHost;
    const response = host.switchToHttp().getResponse();

    if (httpAdapter.isHeadersSent(response)) {
      httpAdapter.end(response);
      return;
    }

    const body = this.toResponse(exception);

    if (body.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(this.describe(exception), this.stackOf(exception));
    }
    httpAdapter.reply(response, body, body.statusCode);
  }

  protected abstract toResponse(exception: E): ApiErrorResponse;

  /** What the log says about a server-side failure. Override to add details (e.g. an upstream status). */
  protected describe(exception: E): string {
    return exception instanceof Error ? exception.message : String(exception);
  }

  private stackOf(exception: E): string | undefined {
    return exception instanceof Error ? exception.stack : undefined;
  }
}
