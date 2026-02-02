import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import {
  UsersIcon,
} from '@heroicons/react/24/outline';
import { Pagination } from '@/components/Pagination';
import { FiltrosAvanzados } from '@/components/FiltrosAvanzados';
import { TablaClientes } from '@/components/TablaClientes';

export const metadata: Metadata = {
  title: 'Clientes',
  description: 'Gestion de base de datos de clientes',
};

interface SearchParams {
  search?: string;
  estado?: string;
  industria?: string;
  ciudad?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  conIA?: string;
  conEmail?: string;
  conTelefono?: string;
  conSitioWeb?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: string;
  mostrarFiltros?: string;
  columnas?: string;
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();

  if (!session) {
    redirect('/auth/login');
  }

  // Obtener searchParams de manera async
  const params = await searchParams;

  // Valid sort fields to prevent injection/corruption
  const validSortFields = [
    'nombre', 'email', 'telefono', 'estado', 'prioridad', 'industria',
    'ciudad', 'provincia', 'fuente', 'fechaCreacion', 'fechaModific',
    'ultimoContacto', 'ultimaIA', 'sitioWeb'
  ];

  // Parámetros de búsqueda con defaults
  const search = params.search || '';
  const estado = params.estado || '';
  const industria = params.industria || '';
  const ciudad = params.ciudad || '';
  const fechaDesde = params.fechaDesde || '';
  const fechaHasta = params.fechaHasta || '';
  const conIA = params.conIA || '';
  const conEmail = params.conEmail || '';
  const conTelefono = params.conTelefono || '';
  const conSitioWeb = params.conSitioWeb || '';
  const rawSortField = params.sort || 'fechaCreacion';
  const sortField = validSortFields.includes(rawSortField) ? rawSortField : 'fechaCreacion';
  const sortOrder = params.order === 'asc' ? 'asc' : 'desc';
  const page = parseInt(params.page || '1') || 1;
  const pageSize = 20;
  const mostrarFiltros = params.mostrarFiltros || '';

  // Construir filtros de Prisma más complejos
  const whereClause: Record<string, unknown> = {};
  
  if (search) {
    whereClause.OR = [
      { nombre: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { telefono: { contains: search } },
      { industria: { contains: search, mode: 'insensitive' } },
      { direccion: { contains: search, mode: 'insensitive' } },
      { ciudad: { contains: search, mode: 'insensitive' } },
    ];
  }
  
  if (estado) {
    whereClause.estado = estado;
  }
  
  if (industria) {
    whereClause.industria = industria;
  }

  if (ciudad) {
    whereClause.ciudad = ciudad;
  }

  if (fechaDesde || fechaHasta) {
    whereClause.fechaCreacion = {} as { gte?: Date; lte?: Date };
    const fechaCreacionClause = whereClause.fechaCreacion as { gte?: Date; lte?: Date };
    if (fechaDesde) {
      fechaCreacionClause.gte = new Date(fechaDesde);
    }
    if (fechaHasta) {
      fechaCreacionClause.lte = new Date(fechaHasta + 'T23:59:59');
    }
  }
  
  if (conIA === 'si') {
    whereClause.ultimaIA = { not: null };
  } else if (conIA === 'no') {
    whereClause.ultimaIA = null;
  }
  
  if (conEmail === 'si') {
    whereClause.email = { not: null };
  } else if (conEmail === 'no') {
    whereClause.email = null;
  }
  
  if (conTelefono === 'si') {
    whereClause.telefono = { not: null };
  } else if (conTelefono === 'no') {
    whereClause.telefono = null;
  }
  
  if (conSitioWeb === 'si') {
    whereClause.sitioWeb = { not: null };
  } else if (conSitioWeb === 'no') {
    whereClause.sitioWeb = null;
  }

  // Obtener clientes con filtros y ordenado expandido
  const orderByClause: Record<string, unknown> = {};
  
  if (sortField === 'ultimaIA') {
    orderByClause.ultimaIA = sortOrder;
  } else {
    orderByClause[sortField] = sortOrder;
  }

  // Calculate the date for "new this month" stat
  const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));

  // Fetch all data in parallel for better performance
  const [clientes, totalClientes, industriasData, ciudadesData, totalClientesGlobal, clientesActivos, nuevosEsteMes] = await Promise.all([
    prisma.cliente.findMany({
      where: whereClause,
      orderBy: orderByClause,
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    prisma.cliente.count({ where: whereClause }),
    prisma.cliente.findMany({
      select: { industria: true },
      where: { industria: { not: null } },
      distinct: ['industria']
    }),
    prisma.cliente.findMany({
      select: { ciudad: true },
      where: { ciudad: { not: null } },
      distinct: ['ciudad']
    }),
    prisma.cliente.count(),
    prisma.cliente.count({ where: { estado: { not: 'FINALIZADO' } } }),
    prisma.cliente.count({ where: { fechaCreacion: { gte: thirtyDaysAgo } } })
  ]);

  const industriasDisponibles = industriasData
    .map(item => item.industria)
    .filter((industria): industria is string => Boolean(industria))
    .sort();

  const ciudadesDisponibles = ciudadesData
    .map(item => item.ciudad)
    .filter((c): c is string => Boolean(c))
    .sort();

  const totalPages = Math.ceil(totalClientes / pageSize);

  return (
    <AuthenticatedLayout currentPath="/clientes" userRole={session.user?.role}>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Clientes</h2>
              <p className="mt-1 text-sm text-gray-500">
                Gestiona tu base de datos de clientes
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center">
              <UsersIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Clientes</p>
                <p className="text-2xl font-bold text-gray-900">{totalClientesGlobal}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center">
              <UsersIcon className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Clientes Activos</p>
                <p className="text-2xl font-bold text-gray-900">{clientesActivos}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center">
              <UsersIcon className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Nuevos este mes</p>
                <p className="text-2xl font-bold text-gray-900">{nuevosEsteMes}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros y tabla de clientes optimizada */}
        <div className="bg-white shadow-sm rounded-lg border">
          {/* Formulario de filtros colapsables */}
          <FiltrosAvanzados
            search={search}
            estado={estado}
            industria={industria}
            ciudad={ciudad}
            fechaDesde={fechaDesde}
            fechaHasta={fechaHasta}
            conIA={conIA}
            conEmail={conEmail}
            conTelefono={conTelefono}
            conSitioWeb={conSitioWeb}
            sortField={sortField}
            sortOrder={sortOrder}
            industriasDisponibles={industriasDisponibles}
            ciudadesDisponibles={ciudadesDisponibles}
            mostrarFiltros={mostrarFiltros}
            columnas={params.columnas}
          />

          {/* Tabla de clientes con columnas seleccionables */}
          <div className="p-6">
            <TablaClientes
              clientes={clientes}
              totalClientes={totalClientes}
              params={params as Record<string, string>}
              sortField={sortField}
              sortOrder={sortOrder}
              columnasIniciales={params.columnas}
            />
          </div>
          
          {/* Paginación */}
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              baseUrl="/clientes"
              searchParams={params as Record<string, string>}
            />
          )}
          
          {clientes.length === 0 && (
            <div className="text-center py-12">
              <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay clientes</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search || estado || industria || ciudad || fechaDesde || fechaHasta || conIA || conEmail || conTelefono || conSitioWeb ?
                  'No se encontraron clientes con los filtros aplicados.' :
                  'Comienza agregando tu primer cliente.'
                }
              </p>
              {(search || estado || industria || ciudad || fechaDesde || fechaHasta || conIA || conEmail || conTelefono || conSitioWeb) && (
                <div className="mt-6">
                  <Link href="/clientes">
                    <Button variant="outline">Limpiar filtros</Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </AuthenticatedLayout>
  );
}