import { Response } from 'express';

interface ApiResponseOptions<T> {
  res: Response;
  statusCode?: number;
  success?: boolean;
  message: string;
  data?: T;
  pagination?: PaginationMeta;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Sends a consistent JSON response format across all routes.
 */
export const sendResponse = <T>({
  res,
  statusCode = 200,
  success = true,
  message,
  data,
  pagination,
}: ApiResponseOptions<T>): Response => {
  const responseBody: Record<string, unknown> = {
    success,
    message,
  };

  if (data !== undefined) {
    responseBody.data = data;
  }

  if (pagination) {
    responseBody.pagination = pagination;
  }

  return res.status(statusCode).json(responseBody);
};
