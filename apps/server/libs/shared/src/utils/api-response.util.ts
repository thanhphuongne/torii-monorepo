import type {
  StandardApiResponse,
  PaginatedResponseDTO,
  PaginatedApiResponse,
} from '@workspace/schemas';

/**
 * Create a success response
 * @param data - Response data
 * @param message - Optional success message
 */
export function successResponse<T>(
  data: T,
  message?: string,
): StandardApiResponse<T> {
  const response: StandardApiResponse<T> = {
    success: true,
    data,
  };

  if (message) {
    response.message = message;
  }

  return response;
}

/**
 * Create an error response
 * @param message - Error message
 * @param errors - Optional detailed errors (for validation)
 */
export function errorResponse(
  message: string,
  errors?: any[],
): StandardApiResponse {
  const response: StandardApiResponse = {
    success: false,
    message,
  };

  if (errors && errors.length > 0) {
    response.errors = errors;
  }

  return response;
}

/**
 * Create a success response for paginated data
 * Flattens pagination fields to top level to avoid nested data structure
 */
export function successPaginatedResponse<T>(
  pagination: PaginatedResponseDTO<T>,
  message?: string,
): PaginatedApiResponse<T> {
  return {
    success: true,
    ...pagination,
    message,
  };
}
