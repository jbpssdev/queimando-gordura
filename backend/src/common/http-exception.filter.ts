import { ArgumentsHost, Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : undefined;
    let message: string | string[] = 'Erro interno do servidor.';
    if (statusCode === 404) {
      message = 'Recurso não encontrado.';
    } else if (statusCode < 500) {
      if (typeof body === 'string') message = body;
      else if (
        body &&
        typeof body === 'object' &&
        'message' in body &&
        (typeof body.message === 'string' ||
          (Array.isArray(body.message) && body.message.every((item) => typeof item === 'string')))
      ) {
        message = body.message as string | string[];
      }
    } else {
      this.logger.error(`Falha HTTP ${statusCode}`);
    }
    response.status(statusCode).json({
      statusCode,
      message,
      path: request.originalUrl.split('?')[0] ?? request.path,
      timestamp: new Date().toISOString(),
    });
  }
}
