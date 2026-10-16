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
    if (statusCode !== 500) {
      if (typeof body === 'string') {
        message = body;
      } else if (
        body &&
        typeof body === 'object' &&
        'message' in body &&
        (typeof body.message === 'string' ||
          (Array.isArray(body.message) && body.message.every((item) => typeof item === 'string')))
      ) {
        const bodyMessage = body.message as string | string[];
        if (
          statusCode === 404 &&
          typeof bodyMessage === 'string' &&
          bodyMessage.startsWith('Cannot ')
        ) {
          message = 'Recurso não encontrado.';
        } else {
          message = bodyMessage;
        }
      } else if (statusCode === 404) {
        message = 'Recurso não encontrado.';
      }
    } else {
      this.logger.error(
        `Falha HTTP ${statusCode}`,
        exception instanceof Error ? exception.stack : exception,
      );
    }

    const pendingItems =
      body && typeof body === 'object' && 'pendingItems' in body
        ? (body as { pendingItems: unknown }).pendingItems
        : undefined;

    const code =
      body &&
      typeof body === 'object' &&
      'code' in body &&
      typeof (body as { code: unknown }).code === 'string'
        ? (body as { code: string }).code
        : undefined;

    const reasons =
      body &&
      typeof body === 'object' &&
      'reasons' in body &&
      Array.isArray((body as { reasons: unknown }).reasons)
        ? (body as { reasons: unknown[] }).reasons
        : undefined;

    response.status(statusCode).json({
      statusCode,
      message,
      ...(code !== undefined ? { code } : {}),
      ...(reasons !== undefined ? { reasons } : {}),
      ...(pendingItems !== undefined ? { pendingItems } : {}),
      path: request.originalUrl.split('?')[0] ?? request.path,
      timestamp: new Date().toISOString(),
    });
  }
}
