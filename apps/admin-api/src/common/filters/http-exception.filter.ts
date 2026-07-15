import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { ErrorCode, type ApiError } from '@cms/shared-types';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ErrorCode = ErrorCode.INTERNAL_ERROR;
    let message = 'Internal server error';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        code = (resp['code'] as ErrorCode) ?? httpStatusToCode(status);
        message = (resp['message'] as string) ?? exception.message;
        details = resp['details'];
      } else {
        message = String(exceptionResponse);
        code = httpStatusToCode(status);
      }
    } else {
      const err = exception instanceof Error ? exception : new Error(String(exception));
      this.logger.error(`Unhandled exception: ${err.message}`, err.stack);
    }

    const body: ApiError = {
      success: false,
      error: { code, message, ...(details !== undefined && { details }) },
    };

    reply.status(status).send(body);
  }
}

function httpStatusToCode(status: number): ErrorCode {
  switch (status) {
    case 400: return ErrorCode.VALIDATION_ERROR;
    case 401: return ErrorCode.UNAUTHORIZED;
    case 403: return ErrorCode.FORBIDDEN;
    case 404: return ErrorCode.NOT_FOUND;
    case 409: return ErrorCode.CONFLICT;
    default:  return ErrorCode.INTERNAL_ERROR;
  }
}
