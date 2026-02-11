import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/** Test UUIDs */
const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const CLIENT_ID = '550e8400-e29b-41d4-a716-446655440002';
const ACTIVITY_ID = '550e8400-e29b-41d4-a716-446655440003';

vi.mock('@/lib/auth');
vi.mock('@/lib/prisma', () => ({
  prisma: {
    actividad: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    cliente: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { GET, POST } from './route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const mockSession = {
  user: { id: USER_ID, email: 'test@example.com', name: 'Test User', role: 'ADMIN' as const },
};

describe('GET /api/actividades', () => {
  const mockActividades = [
    {
      id: ACTIVITY_ID,
      tipo: 'LLAMADA' as const,
      descripcion: 'Test call',
      fecha: new Date('2026-02-10T10:00:00Z'),
      clienteId: CLIENT_ID,
      usuarioId: USER_ID,
      resultado: null,
      proximoPaso: null,
      esAutomatica: false,
      deletedAt: null,
      cliente: { id: CLIENT_ID, nombre: 'Test Client', email: 'client@example.com' },
      usuario: { id: USER_ID, name: 'Test User', email: 'test@example.com' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when authenticated', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSession);
    });

    it('should return activities with pagination', async () => {
      // Arrange
      vi.mocked(prisma.actividad.findMany).mockResolvedValue(mockActividades as never);
      vi.mocked(prisma.actividad.count).mockResolvedValue(1);

      const req = new NextRequest(
        new URL('http://localhost:4500/api/actividades')
      );

      // Act
      const response = await GET(req);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(ACTIVITY_ID);
      expect(body.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
      expect(prisma.actividad.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null }, skip: 0, take: 20 }),
      );
    });

    it('should filter by clienteId', async () => {
      // Arrange
      vi.mocked(prisma.actividad.findMany).mockResolvedValue(mockActividades as never);
      vi.mocked(prisma.actividad.count).mockResolvedValue(1);
      const req = new NextRequest(
        new URL(`http://localhost:4500/api/actividades?clienteId=${CLIENT_ID}`)
      );

      // Act
      const response = await GET(req);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(prisma.actividad.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null, clienteId: CLIENT_ID } }),
      );
    });

    it('should filter by usuarioId', async () => {
      // Arrange
      vi.mocked(prisma.actividad.findMany).mockResolvedValue(mockActividades as never);
      vi.mocked(prisma.actividad.count).mockResolvedValue(1);
      const req = new NextRequest(
        new URL(`http://localhost:4500/api/actividades?usuarioId=${USER_ID}`)
      );

      // Act
      const response = await GET(req);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(prisma.actividad.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null, usuarioId: USER_ID } }),
      );
    });

    it('should filter by tipo', async () => {
      // Arrange
      vi.mocked(prisma.actividad.findMany).mockResolvedValue(mockActividades as never);
      vi.mocked(prisma.actividad.count).mockResolvedValue(1);

      const req = new NextRequest(
        new URL('http://localhost:4500/api/actividades?tipo=LLAMADA')
      );

      // Act
      const response = await GET(req);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(prisma.actividad.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null, tipo: 'LLAMADA' },
        include: expect.any(Object),
        orderBy: { fecha: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should apply pagination with limit and offset', async () => {
      // Arrange
      vi.mocked(prisma.actividad.findMany).mockResolvedValue(mockActividades as never);
      vi.mocked(prisma.actividad.count).mockResolvedValue(50);

      const req = new NextRequest(
        new URL('http://localhost:4500/api/actividades?limit=10&offset=20')
      );

      // Act
      const response = await GET(req);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 50,
        totalPages: 5,
      });
      expect(prisma.actividad.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        include: expect.any(Object),
        orderBy: { fecha: 'desc' },
        skip: 20,
        take: 10,
      });
    });

    it('should return 400 for invalid query parameters', async () => {
      // Arrange
      const req = new NextRequest(
        new URL('http://localhost:4500/api/actividades?limit=invalid')
      );

      // Act
      const response = await GET(req);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 500 on database error', async () => {
      // Arrange
      vi.mocked(prisma.actividad.findMany).mockRejectedValue(
        new Error('Database connection failed')
      );

      const req = new NextRequest(
        new URL('http://localhost:4500/api/actividades')
      );

      // Act
      const response = await GET(req);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('when not authenticated', () => {
    it('should return 401', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(null);

      const req = new NextRequest(
        new URL('http://localhost:4500/api/actividades')
      );

      // Act
      const response = await GET(req);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.code).toBe('UNAUTHORIZED');
      expect(prisma.actividad.findMany).not.toHaveBeenCalled();
    });
  });
});

describe('POST /api/actividades', () => {
  const validBody = {
    clienteId: CLIENT_ID,
    tipo: 'LLAMADA',
    descripcion: 'Test call description',
  };

  const mockActividad = {
    id: ACTIVITY_ID,
    tipo: 'LLAMADA',
    descripcion: 'Test call description',
    fecha: new Date('2026-02-10T10:00:00Z'),
    clienteId: CLIENT_ID,
    usuarioId: USER_ID,
    resultado: null,
    proximoPaso: null,
    deletedAt: null,
    cliente: { id: CLIENT_ID, nombre: 'Test Client', email: 'client@example.com' },
    usuario: { id: USER_ID, name: 'Test User' },
  };

  const mockCliente = { id: CLIENT_ID, nombre: 'Test Client', email: 'client@example.com' };
  const mockClienteUpdate = { id: CLIENT_ID, ultimoContacto: new Date(), fechaModific: new Date() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when authenticated', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSession);
    });

    it('should create activity with transaction', async () => {
      // Arrange
      vi.mocked(prisma.cliente.findUnique).mockResolvedValue(mockCliente as never);
      vi.mocked(prisma.$transaction).mockResolvedValue([mockActividad, mockClienteUpdate] as never);

      const req = new NextRequest('http://localhost:4500/api/actividades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBody),
      });

      // Act
      const response = await POST(req);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(ACTIVITY_ID);
      expect(body.data.tipo).toBe('LLAMADA');
      expect(body.message).toBe('Actividad creada exitosamente');
      expect(prisma.cliente.findUnique).toHaveBeenCalledWith({
        where: { id: CLIENT_ID },
      });
    });

    it('should return 400 for invalid body', async () => {
      // Arrange
      const req = new NextRequest('http://localhost:4500/api/actividades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      // Act
      const response = await POST(req);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(prisma.cliente.findUnique).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid tipo', async () => {
      // Arrange
      const req = new NextRequest('http://localhost:4500/api/actividades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validBody,
          tipo: 'INVALID_TIPO',
        }),
      });

      // Act
      const response = await POST(req);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing descripcion', async () => {
      // Arrange
      const req = new NextRequest('http://localhost:4500/api/actividades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: CLIENT_ID,
          tipo: 'LLAMADA',
        }),
      });

      // Act
      const response = await POST(req);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 when client not found', async () => {
      // Arrange
      vi.mocked(prisma.cliente.findUnique).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:4500/api/actividades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBody),
      });

      // Act
      const response = await POST(req);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.code).toBe('NOT_FOUND');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should return 500 on transaction error', async () => {
      // Arrange
      vi.mocked(prisma.cliente.findUnique).mockResolvedValue(mockCliente as never);
      vi.mocked(prisma.$transaction).mockRejectedValue(
        new Error('Transaction failed')
      );

      const req = new NextRequest('http://localhost:4500/api/actividades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBody),
      });

      // Act
      const response = await POST(req);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('when not authenticated', () => {
    it('should return 401', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:4500/api/actividades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBody),
      });

      // Act
      const response = await POST(req);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.code).toBe('UNAUTHORIZED');
      expect(prisma.cliente.findUnique).not.toHaveBeenCalled();
    });
  });
});
