import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

interface SuccessResponseOptions {
  status?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
}

interface ErrorResponseOptions {
  status?: number;
  code?: string;
  details?: unknown;
}

export function successResponse<T>(
  data: T,
  options?: SuccessResponseOptions
) {
  return NextResponse.json(
    {
      success: true,
      data,
      message: options?.message,
      pagination: options?.pagination,
    },
    { status: options?.status ?? 200 }
  );
}

export function errorResponse(
  error: string,
  options?: ErrorResponseOptions
) {
  return NextResponse.json(
    {
      success: false,
      error,
      code: options?.code,
      details: options?.details,
    },
    { status: options?.status ?? 500 }
  );
}

export function unauthorizedResponse() {
  return errorResponse('No autorizado', {
    status: 401,
    code: 'UNAUTHORIZED',
  });
}

export function notFoundResponse(resource: string) {
  return errorResponse(`${resource} no encontrado`, {
    status: 404,
    code: 'NOT_FOUND',
  });
}

export function validationErrorResponse(zodError: ZodError) {
  return errorResponse('Datos inválidos', {
    status: 400,
    code: 'VALIDATION_ERROR',
    details: zodError.flatten(),
  });
}

export function serverErrorResponse(error?: Error) {
  return errorResponse('Error interno del servidor', {
    status: 500,
    code: 'INTERNAL_ERROR',
    details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
  });
}
