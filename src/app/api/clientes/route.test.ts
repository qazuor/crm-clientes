import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth');
vi.mock('@/lib/prisma', () => ({
  prisma: {
    cliente: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('@/lib/actividades-automaticas', () => ({
  registrarClienteCreado: vi.fn(),
}));

import { GET, POST } from './route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { registrarClienteCreado } from '@/lib/actividades-automaticas';
const mockSession = {
  user: { id: 'u-1', email: 'test@example.com', name: 'Test User', role: 'ADMIN' as const },
};

const mockCliente = {
  id: 'c-1',
  nombre: 'Test Client',
  email: 'client@example.com',
  telefono: '+1234567890',
  whatsapp: null,
  instagram: null,
  facebook: null,
  linkedin: null,
  twitter: null,
  direccion: null,
  ciudad: null,
  provincia: null,
  codigoPostal: null,
  industria: 'Technology',
  sitioWeb: null,
  tieneSSL: null,
  esResponsive: null,
  fuente: 'MANUAL',
  estado: 'NUEVO',
  prioridad: 'MEDIA',
  notas: null,
  fechaCreacion: new Date('2026-01-01'),
  fechaModific: new Date('2026-01-01'),
  ultimoContacto: null,
  ultimaIA: null,
  deletedAt: null,
  enrichmentStatus: 'NONE',
};

describe('GET /api/clientes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when authenticated', () => {
    it('should return client list with pagination', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(mockSession);
      vi.mocked(prisma.cliente.findMany).mockResolvedValue([mockCliente] as never);
      vi.mocked(prisma.cliente.count).mockResolvedValue(2);

      const req = new NextRequest(new URL('http://localhost:4500/api/clientes'));

      // Act
      const response = await GET(req);
      const json = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].id).toBe(mockCliente.id);
      expect(json.data[0].nombre).toBe(mockCliente.nombre);
      expect(json.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
      expect(prisma.cliente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
          orderBy: { fechaCreacion: 'desc' },
          skip: 0,
        }),
      );
    });

    it('should apply search filter correctly', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(mockSession);
      vi.mocked(prisma.cliente.findMany).mockResolvedValue([]);
      vi.mocked(prisma.cliente.count).mockResolvedValue(0);

      const req = new NextRequest(
        new URL('http://localhost:4500/api/clientes?search=test')
      );

      // Act
      await GET(req);

      // Assert
      expect(prisma.cliente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            OR: [
              { nombre: { contains: 'test', mode: 'insensitive' } },
              { email: { contains: 'test', mode: 'insensitive' } },
              { telefono: { contains: 'test' } },
            ],
          },
        })
      );
    });

    it('should apply estado filter correctly', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(mockSession);
      vi.mocked(prisma.cliente.findMany).mockResolvedValue([]);
      vi.mocked(prisma.cliente.count).mockResolvedValue(0);

      const req = new NextRequest(
        new URL('http://localhost:4500/api/clientes?estado=NUEVO')
      );

      // Act
      await GET(req);

      // Assert
      expect(prisma.cliente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            estado: 'NUEVO',
          }),
        })
      );
    });

    it('should apply prioridad filter correctly', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(mockSession);
      vi.mocked(prisma.cliente.findMany).mockResolvedValue([]);
      vi.mocked(prisma.cliente.count).mockResolvedValue(0);

      const req = new NextRequest(
        new URL('http://localhost:4500/api/clientes?prioridad=ALTA')
      );

      // Act
      await GET(req);

      // Assert
      expect(prisma.cliente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            prioridad: 'ALTA',
          }),
        })
      );
    });

    it('should apply custom pagination params', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(mockSession);
      vi.mocked(prisma.cliente.findMany).mockResolvedValue([]);
      vi.mocked(prisma.cliente.count).mockResolvedValue(100);

      const req = new NextRequest(
        new URL('http://localhost:4500/api/clientes?limit=10&offset=20')
      );

      // Act
      const response = await GET(req);
      const json = await response.json();

      // Assert
      expect(prisma.cliente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        })
      );
      expect(json.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 100,
        totalPages: 10,
      });
    });

    it('should apply custom sort params', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(mockSession);
      vi.mocked(prisma.cliente.findMany).mockResolvedValue([]);
      vi.mocked(prisma.cliente.count).mockResolvedValue(0);

      const req = new NextRequest(
        new URL('http://localhost:4500/api/clientes?sortBy=nombre&sortOrder=asc')
      );

      // Act
      await GET(req);

      // Assert
      expect(prisma.cliente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { nombre: 'asc' },
        })
      );
    });

    it('should return 400 for invalid limit', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(mockSession);

      const req = new NextRequest(
        new URL('http://localhost:4500/api/clientes?limit=-1')
      );

      // Act
      const response = await GET(req);
      const json = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid estado', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(mockSession);

      const req = new NextRequest(
        new URL('http://localhost:4500/api/clientes?estado=INVALID')
      );

      // Act
      const response = await GET(req);
      const json = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.code).toBe('VALIDATION_ERROR');
    });

    it('should return 500 on database error', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(mockSession);
      vi.mocked(prisma.cliente.findMany).mockRejectedValue(
        new Error('Database connection failed')
      );

      const req = new NextRequest(new URL('http://localhost:4500/api/clientes'));

      // Act
      const response = await GET(req);
      const json = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('when not authenticated', () => {
    it('should return 401 when not authenticated', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(null);

      const req = new NextRequest(new URL('http://localhost:4500/api/clientes'));

      // Act
      const response = await GET(req);
      const json = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.code).toBe('UNAUTHORIZED');
      expect(prisma.cliente.findMany).not.toHaveBeenCalled();
    });
  });
});

describe('POST /api/clientes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when authenticated', () => {
    it('should create client successfully', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(mockSession);
      vi.mocked(prisma.cliente.create).mockResolvedValue(mockCliente as never);
      vi.mocked(registrarClienteCreado).mockResolvedValue(undefined);

      const req = new NextRequest('http://localhost:4500/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: 'Test Client',
          email: 'client@example.com',
        }),
      });

      // Act
      const response = await POST(req);
      const json = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(mockCliente.id);
      expect(json.data.nombre).toBe(mockCliente.nombre);
      expect(json.message).toBe('Cliente creado exitosamente');
      expect(prisma.cliente.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nombre: 'Test Client',
          email: 'client@example.com',
        }),
      });
      expect(registrarClienteCreado).toHaveBeenCalledWith(
        mockCliente.id,
        mockSession.user.id,
        mockCliente.nombre
      );
    });

    it('should create client with minimal data', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(mockSession);
      vi.mocked(prisma.cliente.create).mockResolvedValue(mockCliente as never);
      vi.mocked(registrarClienteCreado).mockResolvedValue(undefined);

      const req = new NextRequest('http://localhost:4500/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: 'Minimal Client',
        }),
      });

      // Act
      const response = await POST(req);
      const json = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(json.success).toBe(true);
      expect(prisma.cliente.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nombre: 'Minimal Client',
        }),
      });
    });

    it('should return 400 for missing nombre', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(mockSession);

      const req = new NextRequest('http://localhost:4500/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      });

      // Act
      const response = await POST(req);
      const json = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.code).toBe('VALIDATION_ERROR');
      expect(prisma.cliente.create).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid email format', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(mockSession);

      const req = new NextRequest('http://localhost:4500/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: 'Test Client',
          email: 'not-an-email',
        }),
      });

      // Act
      const response = await POST(req);
      const json = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.code).toBe('VALIDATION_ERROR');
      expect(prisma.cliente.create).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid sitioWeb URL', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(mockSession);

      const req = new NextRequest('http://localhost:4500/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: 'Test Client',
          sitioWeb: 'not-a-url',
        }),
      });

      // Act
      const response = await POST(req);
      const json = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for nombre exceeding max length', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(mockSession);

      const req = new NextRequest('http://localhost:4500/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: 'a'.repeat(256),
        }),
      });

      // Act
      const response = await POST(req);
      const json = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.code).toBe('VALIDATION_ERROR');
    });

    it('should normalize email to lowercase', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(mockSession);
      vi.mocked(prisma.cliente.create).mockResolvedValue(mockCliente as never);
      vi.mocked(registrarClienteCreado).mockResolvedValue(undefined);

      const req = new NextRequest('http://localhost:4500/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: 'Test Client',
          email: 'TEST@EXAMPLE.COM',
        }),
      });

      // Act
      await POST(req);

      // Assert
      expect(prisma.cliente.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'test@example.com',
        }),
      });
    });

    it('should handle empty email string as null', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(mockSession);
      vi.mocked(prisma.cliente.create).mockResolvedValue(mockCliente as never);
      vi.mocked(registrarClienteCreado).mockResolvedValue(undefined);

      const req = new NextRequest('http://localhost:4500/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: 'Test Client',
          email: '',
        }),
      });

      // Act
      await POST(req);

      // Assert
      expect(prisma.cliente.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: null,
        }),
      });
    });
  });

  describe('when not authenticated', () => {
    it('should return 401 when not authenticated', async () => {
      // Arrange
      vi.mocked(auth).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:4500/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: 'Test Client',
        }),
      });

      // Act
      const response = await POST(req);
      const json = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.code).toBe('UNAUTHORIZED');
      expect(prisma.cliente.create).not.toHaveBeenCalled();
    });
  });
});
