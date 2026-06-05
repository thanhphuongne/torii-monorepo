import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { errorResponse } from '../utils/api-response.util';

@Catch()
export class GlobalExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (response.headersSent) {
      return;
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    // Log the raw exception for internal debugging
    // this.logger.debug('Catching exception:', JSON.stringify(exception));

    let errors: any[] = [];
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as any;
        if ('message' in resObj) {
          message = Array.isArray(resObj.message)
            ? resObj.message.join(', ')
            : resObj.message;
        }
        if ('errors' in resObj) {
          errors = resObj.errors;
        }
      }
    } else if (typeof exception === 'object' && exception !== null) {
      // Handle microservice error objects or plain objects
      const err = exception as any;

      // 1. Try to find the message
      // Often NestJS microservice errors have their actual data in 'response' or 'error'
      const possibleMessage =
        err.message ||
        err.response?.message ||
        err.error?.message ||
        (typeof err.error === 'string' ? err.error : null);

      if (possibleMessage && possibleMessage !== 'Internal server error') {
        message = possibleMessage;
      } else if (err.error && typeof err.error === 'string') {
        message = err.error;
      }

      // 2. Try to find the status code
      const possibleStatus =
        err.status ||
        err.statusCode ||
        err.response?.statusCode ||
        err.error?.status;

      if (
        typeof possibleStatus === 'number' &&
        possibleStatus >= 100 &&
        possibleStatus < 600
      ) {
        status = possibleStatus;
      }

      // 3. Fallback string mapping for status if status is still 500
      if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('not found')) {
          status = HttpStatus.NOT_FOUND;
        } else if (
          lowerMessage.includes('forbidden') ||
          lowerMessage.includes('permission')
        ) {
          status = HttpStatus.FORBIDDEN;
        } else if (
          lowerMessage.includes('unauthorized') ||
          lowerMessage.includes('credentials') ||
          lowerMessage.includes('token')
        ) {
          status = HttpStatus.UNAUTHORIZED;
        } else if (
          lowerMessage.includes('bad request') ||
          lowerMessage.includes('exist') ||
          lowerMessage.includes('invalid') ||
          lowerMessage.includes('conflict')
        ) {
          status = HttpStatus.BAD_REQUEST;
        }
      }
    } else if (typeof exception === 'string') {
      message = exception;
    }

    // Final normalization: if message is an array, join it
    if (Array.isArray(message)) {
      message = message.join(', ');
    }

    // Only log 500 errors as errors, others as warnings/debug
    if (status >= 500) {
      this.logger.error(`Exception on ${request.url}:`, exception);
    } else {
      this.logger.warn(`Exception on ${request.url}: ${message} (${status})`);
    }

    response.status(status).json(errorResponse(message, errors));
  }
}
