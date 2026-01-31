import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { 
  PhoneIcon,
  EnvelopeIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftEllipsisIcon,
  DocumentTextIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface ActividadesPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function ActividadesPage({ searchParams }: ActividadesPageProps) {
  const session = await auth();
  
  if (!session) {
    redirect('/auth/login');
  }

  const resolvedSearchParams = await searchParams;
  const page = parseInt((resolvedSearchParams.page as string) || '1');
  const search = (resolvedSearchParams.search as string) || '';
  const tipo = (resolvedSearchParams.tipo as string) || '';
  const usuario = (resolvedSearchParams.usuario as string) || '';

  const skip = (page - 1) * 10;

  // Construir filtros
  const where: Record<string, unknown> = {};
  
  if (search) {
    where.OR = [
      {
        cliente: {
          nombre: {
            contains: search,
            mode: 'insensitive'
          }
        }
      },
      {
        descripcion: {
          contains: search,
          mode: 'insensitive'
        }
      },
      {
        resultado: {
          contains: search,
          mode: 'insensitive'
        }
      }
    ];
  }

  if (tipo) {
    where.tipo = tipo;
  }

  if (usuario) {
    where.usuarioId = usuario;
  }

  // Obtener actividades con información relacionada
  const [actividades, totalActividades, usuarios] = await Promise.all([
    prisma.actividad.findMany({
      where,
      include: {
        usuario: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        cliente: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            estado: true,
          }
        }
      },
      orderBy: { fecha: 'desc' },
      skip,
      take: 10,
    }),
    prisma.actividad.count({ where }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' }
    })
  ]);

  const totalPages = Math.ceil(totalActividades / 10);

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'LLAMADA': return PhoneIcon;
      case 'EMAIL': return EnvelopeIcon;
      case 'REUNION': return UserGroupIcon;
      case 'TAREA': return ClipboardDocumentListIcon;
      case 'NOTA': return ChatBubbleLeftEllipsisIcon;
      case 'PROPUESTA': return DocumentTextIcon;
      case 'SEGUIMIENTO': return ClockIcon;
      // Actividades automáticas del sistema
      case 'CLIENTE_CREADO': return UserGroupIcon;
      case 'CLIENTE_EDITADO': return ClipboardDocumentListIcon;
      case 'CLIENTE_ELIMINADO': return ClipboardDocumentListIcon;
      case 'IA_ENRIQUECIMIENTO': return MagnifyingGlassIcon;
      case 'CONTACTO_AUTOMATICO': return PhoneIcon;
      case 'CAMBIO_ESTADO': return ClipboardDocumentListIcon;
      case 'CAMBIO_PRIORIDAD': return ClipboardDocumentListIcon;
      default: return ChatBubbleLeftEllipsisIcon;
    }
  };

  const tipoLabels = {
    'LLAMADA': 'Llamada',
    'EMAIL': 'Email',
    'REUNION': 'Reunión',
    'TAREA': 'Tarea',
    'NOTA': 'Nota',
    'PROPUESTA': 'Propuesta',
    'SEGUIMIENTO': 'Seguimiento',
    // Actividades automáticas
    'CLIENTE_CREADO': 'Cliente creado',
    'CLIENTE_EDITADO': 'Cliente editado',
    'CLIENTE_ELIMINADO': 'Cliente eliminado',
    'IA_ENRIQUECIMIENTO': 'Enriquecimiento IA',
    'CONTACTO_AUTOMATICO': 'Contacto automático',
    'CAMBIO_ESTADO': 'Cambio de estado',
    'CAMBIO_PRIORIDAD': 'Cambio de prioridad',
  };

  return (
    <AuthenticatedLayout currentPath="/actividades" userRole={session.user?.role}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Todas las Actividades
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Gestiona y revisa todas las actividades del CRM
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {totalActividades} actividades totales
              </span>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900">Filtros</h3>
          </div>
          
          <form method="GET" className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Buscar actividades..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Tipo */}
            <select
              name="tipo"
              defaultValue={tipo}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los tipos</option>
              {Object.entries(tipoLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            {/* Usuario */}
            <select
              name="usuario"
              defaultValue={usuario}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los usuarios</option>
              {usuarios.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </select>

            {/* Botón filtrar */}
            <Button type="submit">
              Filtrar
            </Button>
          </form>
        </div>

        {/* Lista de actividades */}
        <div className="space-y-6">
          {actividades.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
              <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Sin actividades</h3>
              <p className="mt-1 text-sm text-gray-500">
                No se encontraron actividades con los filtros aplicados.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {actividades.map((actividad) => {
                const IconComponent = getTipoIcon(actividad.tipo);
                return (
                  <div key={actividad.id} className="bg-white rounded-lg shadow-sm border">
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="shrink-0">
                            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <IconComponent className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="text-lg font-medium text-gray-900">
                                {tipoLabels[actividad.tipo as keyof typeof tipoLabels] || actividad.tipo}
                              </h3>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {new Date(actividad.fecha).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="mt-1">
                              <Link 
                                href={`/clientes/${actividad.cliente.id}`}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                              >
                                {actividad.cliente.nombre}
                              </Link>
                              {actividad.cliente.email && (
                                <span className="text-gray-500 ml-2">• {actividad.cliente.email}</span>
                              )}
                            </div>
                            <p className="text-gray-600 mt-2">{actividad.descripcion}</p>
                            {actividad.resultado && (
                              <div className="mt-3 p-3 bg-green-50 rounded-md">
                                <p className="text-sm text-green-800">
                                  <strong>Resultado:</strong> {actividad.resultado}
                                </p>
                              </div>
                            )}
                            {actividad.proximoPaso && (
                              <div className="mt-2 p-3 bg-yellow-50 rounded-md">
                                <p className="text-sm text-yellow-800">
                                  <strong>Próximo paso:</strong> {actividad.proximoPaso}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm text-gray-500">
                            {actividad.usuario.name || actividad.usuario.email}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(actividad.fecha).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between bg-white px-4 py-3 border rounded-lg">
            <div className="flex-1 flex justify-between sm:hidden">
              {page > 1 && (
                <Link
                  href={`/actividades?${new URLSearchParams({
                    ...Object.fromEntries(Object.entries(resolvedSearchParams).filter(([key]) => key !== 'page')),
                    page: (page - 1).toString()
                  }).toString()}`}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/actividades?${new URLSearchParams({
                    ...Object.fromEntries(Object.entries(resolvedSearchParams).filter(([key]) => key !== 'page')),
                    page: (page + 1).toString()
                  }).toString()}`}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Siguiente
                </Link>
              )}
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{skip + 1}</span> a{' '}
                  <span className="font-medium">{Math.min(skip + 10, totalActividades)}</span> de{' '}
                  <span className="font-medium">{totalActividades}</span> actividades
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {page > 1 && (
                    <Link
                      href={`/actividades?${new URLSearchParams({
                        ...Object.fromEntries(Object.entries(resolvedSearchParams).filter(([key]) => key !== 'page')),
                        page: (page - 1).toString()
                      }).toString()}`}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      Anterior
                    </Link>
                  )}
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <Link
                      key={pageNum}
                      href={`/actividades?${new URLSearchParams({
                        ...Object.fromEntries(Object.entries(resolvedSearchParams).filter(([key]) => key !== 'page')),
                        page: pageNum.toString()
                      }).toString()}`}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pageNum === page
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </Link>
                  ))}
                  
                  {page < totalPages && (
                    <Link
                      href={`/actividades?${new URLSearchParams({
                        ...Object.fromEntries(Object.entries(resolvedSearchParams).filter(([key]) => key !== 'page')),
                        page: (page + 1).toString()
                      }).toString()}`}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      Siguiente
                    </Link>
                  )}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}