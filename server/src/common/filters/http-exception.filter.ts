import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message = exception.message;
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const resp = exceptionResponse as Record<string, any>;
      // Handle class-validator errors (array of messages)
      if (Array.isArray(resp.message)) {
        message = resp.message.join('; ');
      } else if (resp.message) {
        message = resp.message;
      }
    }

    const body: ApiResponse<null> = {
      code: status,
      message,
      data: null,
    };

    response.status(status).json(body);
  }
}
