import {
  Catch,
  RpcExceptionFilter,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

/**
 * Global RPC Exception Filter for Microservices
 * Catches all exceptions (HttpException, Error, etc.) and converts them to structured RpcExceptions
 * so they can be properly reconstructed by the Gateway
 */
@Catch()
export class GlobalRpcExceptionFilter implements RpcExceptionFilter<any> {
  private readonly logger = new Logger(GlobalRpcExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost): Observable<any> {
    let errorData: any = {
      message: 'Internal server error',
      status: 500,
    };

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const status = exception.getStatus();

      errorData = {
        message:
          typeof response === 'string'
            ? response
            : (response as any).message || exception.message,
        status: status,
        // Include details if available (e.g. validation errors)
        details:
          typeof response === 'object'
            ? (response as any).errors || (response as any).message
            : undefined,
      };
    } else if (exception instanceof RpcException) {
      return throwError(() => exception.getError());
    } else if (exception instanceof Error) {
      errorData = {
        message: exception.message,
        status: 500,
      };
    } else if (typeof exception === 'object' && exception !== null) {
      errorData = {
        ...exception,
        message: exception.message || 'Unknown error',
      };
    }

    this.logger.error(`Exception caught in RPC: ${errorData.message}`);

    // We throw an RpcException wrapping our structured error data
    // NestJS NATS will serialize this errorData object and send it to the Gateway
    return throwError(() => errorData);
  }
}
