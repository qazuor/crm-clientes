import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

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

/**
 * Handle Prisma-specific errors and return appropriate HTTP responses.
 *
 * Error codes:
 * - P2002: Unique constraint violation -> 409 Conflict
 * - P2025: Record not found -> 404 Not Found
 * - P2003: Foreign key constraint failure -> 400 Bad Request
 * - P2014: Required relation violation -> 400 Bad Request
 * - Default: 500 Internal Server Error
 */
export function handlePrismaError(error: unknown): NextResponse {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        const target = (error.meta?.target as string[])?.join(', ') ?? 'campo desconocido';
        return errorResponse(`Ya existe un registro con ese valor en: ${target}`, {
          status: 409,
          code: 'UNIQUE_CONSTRAINT',
          details: process.env.NODE_ENV === 'development' ? { prismaCode: error.code, meta: error.meta } : undefined,
        });
      }
      case 'P2025':
        return errorResponse('Registro no encontrado', {
          status: 404,
          code: 'NOT_FOUND',
          details: process.env.NODE_ENV === 'development' ? { prismaCode: error.code, meta: error.meta } : undefined,
        });
      case 'P2003': {
        const field = (error.meta?.field_name as string) ?? 'relacion desconocida';
        return errorResponse(`Referencia invalida en: ${field}`, {
          status: 400,
          code: 'FOREIGN_KEY_CONSTRAINT',
          details: process.env.NODE_ENV === 'development' ? { prismaCode: error.code, meta: error.meta } : undefined,
        });
      }
      case 'P2014':
        return errorResponse('Relacion requerida no satisfecha', {
          status: 400,
          code: 'REQUIRED_RELATION',
          details: process.env.NODE_ENV === 'development' ? { prismaCode: error.code, meta: error.meta } : undefined,
        });
      default:
        return errorResponse('Error de base de datos', {
          status: 500,
          code: 'DATABASE_ERROR',
          details: process.env.NODE_ENV === 'development' ? { prismaCode: error.code, message: error.message } : undefined,
        });
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return errorResponse('Error de validacion en consulta a base de datos', {
      status: 400,
      code: 'VALIDATION_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }

  // Not a Prisma error, return generic server error
  return serverErrorResponse(error instanceof Error ? error : undefined);
}

/**
 * Add Cache-Control headers to a NextResponse.
 *
 * @param response - The NextResponse to add headers to
 * @param maxAge - Cache duration in seconds
 * @param isPrivate - If true, sets "private" directive (default: true)
 * @returns The same response with Cache-Control header set
 */
export function withCacheHeaders(
  response: NextResponse,
  maxAge: number,
  isPrivate: boolean = true
): NextResponse {
  const directive = isPrivate ? 'private' : 'public';
  response.headers.set('Cache-Control', `${directive}, max-age=${maxAge}`);
  return response;
}
