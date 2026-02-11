import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
// Mock modules
vi.mock('@/lib/auth');
vi.mock('@/lib/prisma', () => ({
  prisma: {
    cliente: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    actividad: {
      updateMany: vi.fn(),
    },
  },
}));
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));
vi.mock('@/lib/actividades-automaticas', () => ({
  registrarClienteEditado: vi.fn(),
  registrarCambioEstado: vi.fn(),
  registrarCambioPrioridad: vi.fn(),
}));

// Import after mocks
import { GET, PUT, DELETE } from './route';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  registrarClienteEditado,
  registrarCambioEstado,
  registrarCambioPrioridad,
} from '@/lib/actividades-automaticas';

const mockSession = {
  user: { id: 'u-1', email: 'test@example.com', name: 'Test User', role: 'ADMIN' as const },
};

// Mock client data
const mockCliente = {
  id: 'client-123',
  nombre: 'Test Client',
  email: 'client@test.com',
  telefono: '+1234567890',
  whatsapp: null,
  instagram: null,
  facebook: null,
  linkedin: null,
  twitter: null,
  direccion: '123 Test St',
  ciudad: 'Test City',
  provincia: 'Test Province',
  codigoPostal: '12345',
  industria: 'Technology',
  sitioWeb: 'https://test.com',
  tieneSSL: true,
  esResponsive: true,
  fuente: 'MANUAL' as const,
  estado: 'NUEVO' as const,
  prioridad: 'MEDIA' as const,
  notas: null,
  deletedAt: null,
  fechaCreacion: new Date('2024-01-01'),
  fechaModific: new Date('2024-01-01'),
  ultimoContacto: null,
  ultimaIA: null,
  enrichmentStatus: 'NONE',
  actividades: [],
};

describe('GET /api/clientes/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return client by ID when found', async () => {
    // Arrange
    const req = new NextRequest('http://localhost:4500/api/clientes/client-123');
    const context = { params: Promise.resolve({ id: 'client-123' }) };

    vi.mocked(prisma.cliente.findUnique).mockResolvedValue(mockCliente as never);

    // Act
    const response = await GET(req, context);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toMatchObject({
      id: 'client-123',
      nombre: 'Test Client',
      email: 'client@test.com',
      estado: 'NUEVO',
      prioridad: 'MEDIA',
      fuente: 'MANUAL',
    });
    expect(prisma.cliente.findUnique).toHaveBeenCalledWith({
      where: { id: 'client-123', deletedAt: null },
      include: {
        actividades: {
          where: { deletedAt: null },
          orderBy: { fecha: 'desc' },
          include: {
            usuario: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  });

  it('should return 404 when client not found', async () => {
    // Arrange
    const req = new NextRequest('http://localhost:4500/api/clientes/nonexistent');
    const context = { params: Promise.resolve({ id: 'nonexistent' }) };

    vi.mocked(prisma.cliente.findUnique).mockResolvedValue(null);

    // Act
    const response = await GET(req, context);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Cliente no encontrado');
    expect(json.code).toBe('NOT_FOUND');
  });

  it('should return 500 on database error', async () => {
    // Arrange
    const req = new NextRequest('http://localhost:4500/api/clientes/client-123');
    const context = { params: Promise.resolve({ id: 'client-123' }) };

    vi.mocked(prisma.cliente.findUnique).mockRejectedValue(new Error('Database connection lost'));

    // Act
    const response = await GET(req, context);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Error interno del servidor');
    expect(json.code).toBe('INTERNAL_ERROR');
  });
});

describe('PUT /api/clientes/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update client successfully with valid data', async () => {
    // Arrange
    const updateData = {
      nombre: 'Updated Name',
      email: 'updated@test.com',
      telefono: '+9876543210',
    };

    const req = new NextRequest('http://localhost:4500/api/clientes/client-123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    const context = { params: Promise.resolve({ id: 'client-123' }) };

    const updatedCliente = { ...mockCliente, ...updateData, fechaModific: new Date() };

    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.cliente.findUnique).mockResolvedValue(mockCliente as never);
    vi.mocked(prisma.cliente.update).mockResolvedValue(updatedCliente as never);
    vi.mocked(registrarClienteEditado).mockResolvedValue(undefined);

    // Act
    const response = await PUT(req, context);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.nombre).toBe('Updated Name');
    expect(json.message).toBe('Cliente actualizado exitosamente');
    expect(prisma.cliente.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'client-123' },
        data: expect.objectContaining({
          nombre: 'Updated Name',
          email: 'updated@test.com',
          telefono: '+9876543210',
        }),
      })
    );
  });

  it('should register estado change when estado is updated', async () => {
    // Arrange
    const updateData = {
      estado: 'EN_TRATATIVAS' as const,
    };

    const req = new NextRequest('http://localhost:4500/api/clientes/client-123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    const context = { params: Promise.resolve({ id: 'client-123' }) };

    const updatedCliente = { ...mockCliente, estado: 'EN_TRATATIVAS' as const };

    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.cliente.findUnique).mockResolvedValue(mockCliente as never);
    vi.mocked(prisma.cliente.update).mockResolvedValue(updatedCliente as never);
    vi.mocked(registrarCambioEstado).mockResolvedValue(undefined);

    // Act
    const response = await PUT(req, context);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(registrarCambioEstado).toHaveBeenCalledWith(
      'client-123',
      'u-1',
      'Test Client',
      'NUEVO',
      'EN_TRATATIVAS'
    );
  });

  it('should register prioridad change when prioridad is updated', async () => {
    // Arrange
    const updateData = {
      prioridad: 'ALTA' as const,
    };

    const req = new NextRequest('http://localhost:4500/api/clientes/client-123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    const context = { params: Promise.resolve({ id: 'client-123' }) };

    const updatedCliente = { ...mockCliente, prioridad: 'ALTA' as const };

    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.cliente.findUnique).mockResolvedValue(mockCliente as never);
    vi.mocked(prisma.cliente.update).mockResolvedValue(updatedCliente as never);
    vi.mocked(registrarCambioPrioridad).mockResolvedValue(undefined);

    // Act
    const response = await PUT(req, context);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(registrarCambioPrioridad).toHaveBeenCalledWith(
      'client-123',
      'u-1',
      'Test Client',
      'MEDIA',
      'ALTA'
    );
  });

  it('should register general edit when non-special fields are updated', async () => {
    // Arrange
    const updateData = {
      nombre: 'New Name',
      telefono: '+1111111111',
    };

    const req = new NextRequest('http://localhost:4500/api/clientes/client-123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    const context = { params: Promise.resolve({ id: 'client-123' }) };

    const updatedCliente = { ...mockCliente, ...updateData };

    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.cliente.findUnique).mockResolvedValue(mockCliente as never);
    vi.mocked(prisma.cliente.update).mockResolvedValue(updatedCliente as never);
    vi.mocked(registrarClienteEditado).mockResolvedValue(undefined);

    // Act
    const response = await PUT(req, context);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(registrarClienteEditado).toHaveBeenCalledWith(
      'client-123',
      'u-1',
      'Test Client',
      expect.arrayContaining(['nombre', 'telefono'])
    );
  });

  it('should return 401 when not authenticated', async () => {
    // Arrange
    const req = new NextRequest('http://localhost:4500/api/clientes/client-123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Test' }),
    });
    const context = { params: Promise.resolve({ id: 'client-123' }) };

    vi.mocked(auth).mockResolvedValue(null);

    // Act
    const response = await PUT(req, context);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error).toBe('No autorizado');
    expect(json.code).toBe('UNAUTHORIZED');
    expect(prisma.cliente.update).not.toHaveBeenCalled();
  });

  it('should return 400 for invalid body', async () => {
    // Arrange
    const invalidData = {
      nombre: '',
      email: 'not-an-email',
    };

    const req = new NextRequest('http://localhost:4500/api/clientes/client-123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidData),
    });
    const context = { params: Promise.resolve({ id: 'client-123' }) };

    vi.mocked(auth).mockResolvedValue(mockSession);

    // Act
    const response = await PUT(req, context);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Datos inválidos');
    expect(json.code).toBe('VALIDATION_ERROR');
    expect(json.details).toBeDefined();
    expect(prisma.cliente.update).not.toHaveBeenCalled();
  });

  it('should return 404 when client not found', async () => {
    // Arrange
    const req = new NextRequest('http://localhost:4500/api/clientes/nonexistent', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Test' }),
    });
    const context = { params: Promise.resolve({ id: 'nonexistent' }) };

    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.cliente.findUnique).mockResolvedValue(null);

    // Act
    const response = await PUT(req, context);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Cliente no encontrado');
    expect(json.code).toBe('NOT_FOUND');
    expect(prisma.cliente.update).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/clientes/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should soft delete client successfully', async () => {
    // Arrange
    const req = new NextRequest('http://localhost:4500/api/clientes/client-123', {
      method: 'DELETE',
    });
    const context = { params: Promise.resolve({ id: 'client-123' }) };

    const deletedCliente = { ...mockCliente, deletedAt: new Date() };

    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.cliente.findUnique).mockResolvedValue(mockCliente as never);
    vi.mocked(prisma.actividad.updateMany).mockResolvedValue({ count: 5 });
    vi.mocked(prisma.cliente.update).mockResolvedValue(deletedCliente as never);

    // Act
    const response = await DELETE(req, context);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toBeNull();
    expect(json.message).toBe('Cliente eliminado exitosamente');
    expect(prisma.actividad.updateMany).toHaveBeenCalledWith({
      where: { clienteId: 'client-123', deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
    expect(prisma.cliente.update).toHaveBeenCalledWith({
      where: { id: 'client-123' },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('should return 401 when not authenticated', async () => {
    // Arrange
    const req = new NextRequest('http://localhost:4500/api/clientes/client-123', {
      method: 'DELETE',
    });
    const context = { params: Promise.resolve({ id: 'client-123' }) };

    vi.mocked(auth).mockResolvedValue(null);

    // Act
    const response = await DELETE(req, context);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error).toBe('No autorizado');
    expect(json.code).toBe('UNAUTHORIZED');
    expect(prisma.cliente.update).not.toHaveBeenCalled();
  });

  it('should return 404 when client not found', async () => {
    // Arrange
    const req = new NextRequest('http://localhost:4500/api/clientes/nonexistent', {
      method: 'DELETE',
    });
    const context = { params: Promise.resolve({ id: 'nonexistent' }) };

    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.cliente.findUnique).mockResolvedValue(null);

    // Act
    const response = await DELETE(req, context);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Cliente no encontrado');
    expect(json.code).toBe('NOT_FOUND');
    expect(prisma.actividad.updateMany).not.toHaveBeenCalled();
    expect(prisma.cliente.update).not.toHaveBeenCalled();
  });

  it('should return 404 when client already deleted', async () => {
    // Arrange
    const req = new NextRequest('http://localhost:4500/api/clientes/client-123', {
      method: 'DELETE',
    });
    const context = { params: Promise.resolve({ id: 'client-123' }) };

    const deletedCliente = { ...mockCliente, deletedAt: new Date('2024-01-15') };

    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.cliente.findUnique).mockResolvedValue(deletedCliente as never);

    // Act
    const response = await DELETE(req, context);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Cliente no encontrado');
    expect(json.code).toBe('NOT_FOUND');
    expect(prisma.actividad.updateMany).not.toHaveBeenCalled();
    expect(prisma.cliente.update).not.toHaveBeenCalled();
  });

  it('should handle database error gracefully', async () => {
    // Arrange
    const req = new NextRequest('http://localhost:4500/api/clientes/client-123', {
      method: 'DELETE',
    });
    const context = { params: Promise.resolve({ id: 'client-123' }) };

    vi.mocked(auth).mockResolvedValue(mockSession);
    vi.mocked(prisma.cliente.findUnique).mockResolvedValue(mockCliente as never);
    vi.mocked(prisma.actividad.updateMany).mockRejectedValue(new Error('Database error'));

    // Act
    const response = await DELETE(req, context);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Error interno del servidor');
    expect(json.code).toBe('INTERNAL_ERROR');
  });
});
