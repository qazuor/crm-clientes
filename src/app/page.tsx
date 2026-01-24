import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/Button'
import LogoutButton from '@/components/LogoutButton';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { 
  UsersIcon, 
  ChartBarIcon, 
  PhoneIcon,
  EnvelopeIcon,
  BuildingOffice2Icon,
  PlusIcon
} from '@heroicons/react/24/outline'

export default async function Home() {
  const session = await auth();

  if (!session) {
    redirect('/auth/login');
  }

  // Obtener métricas del dashboard
  const [totalClientes, clientesActivos, actividadesHoy, clientesHoy, actividadesRecientes] = await Promise.all([
    prisma.cliente.count(),
    prisma.cliente.count({
      where: {
        estado: {
          not: 'PERDIDO'
        }
      }
    }),
    prisma.actividad.count({
      where: {
        fecha: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    }),
    prisma.cliente.count({
      where: {
        fechaCreacion: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    }),
    prisma.actividad.findMany({
      take: 5,
      orderBy: { fecha: 'desc' },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
          }
        },
        usuario: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    })
  ]);
  return (
    <AuthenticatedLayout currentPath="/">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Bienvenido al CRM
          </h2>
          <p className="text-lg text-gray-600">
            Hola {session.user?.name || session.user?.email}, gestiona tus clientes de manera eficiente
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Clientes</p>
                <p className="text-3xl font-bold text-gray-900">{totalClientes}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <UsersIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Todos los clientes</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Clientes Activos</p>
                <p className="text-3xl font-bold text-gray-900">{clientesActivos}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <ChartBarIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Excluye perdidos</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Actividades Hoy</p>
                <p className="text-3xl font-bold text-gray-900">{actividadesHoy}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <PhoneIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Realizadas hoy</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Clientes Nuevos</p>
                <p className="text-3xl font-bold text-gray-900">{clientesHoy}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <EnvelopeIcon className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">Agregados hoy</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Actividad Reciente
                </h3>
                <Link 
                  href="/actividades" 
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Ver todas
                </Link>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {actividadesRecientes.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No hay actividades recientes
                  </p>
                ) : (
                  actividadesRecientes.map((actividad) => {
                    const tiempoTranscurrido = (() => {
                      const ahora = new Date();
                      const fechaActividad = new Date(actividad.fecha);
                      const diffMs = ahora.getTime() - fechaActividad.getTime();
                      const diffMinutos = Math.floor(diffMs / (1000 * 60));
                      const diffHoras = Math.floor(diffMinutos / 60);
                      const diffDias = Math.floor(diffHoras / 24);

                      if (diffMinutos < 1) return 'Ahora mismo';
                      if (diffMinutos < 60) return `Hace ${diffMinutos} min`;
                      if (diffHoras < 24) return `Hace ${diffHoras}h`;
                      return `Hace ${diffDias}d`;
                    })();

                    const tipoLabels: { [key: string]: string } = {
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
                      'CAMBIO_AGENTE': 'Cambio de agente'
                    };

                    const tipoColors: { [key: string]: string } = {
                      'LLAMADA': 'bg-blue-500',
                      'EMAIL': 'bg-green-500',
                      'REUNION': 'bg-purple-500',
                      'TAREA': 'bg-orange-500',
                      'NOTA': 'bg-gray-500',
                      'PROPUESTA': 'bg-yellow-500',
                      'SEGUIMIENTO': 'bg-indigo-500',
                      // Actividades automáticas con colores diferentes
                      'CLIENTE_CREADO': 'bg-emerald-500',
                      'CLIENTE_EDITADO': 'bg-amber-500',
                      'CLIENTE_ELIMINADO': 'bg-red-500',
                      'IA_ENRIQUECIMIENTO': 'bg-cyan-500',
                      'CONTACTO_AUTOMATICO': 'bg-teal-500',
                      'CAMBIO_ESTADO': 'bg-violet-500',
                      'CAMBIO_PRIORIDAD': 'bg-rose-500',
                      'CAMBIO_AGENTE': 'bg-lime-500'
                    };

                    return (
                      <div key={actividad.id} className="flex items-center space-x-3">
                        <div className={`h-2 w-2 rounded-full ${tipoColors[actividad.tipo] || 'bg-gray-500'}`}></div>
                        <p className="text-sm text-gray-600 flex-1">
                          <span className="font-medium">
                            {tipoLabels[actividad.tipo] || actividad.tipo}
                          </span>{' '}
                          con{' '}
                          <Link 
                            href={`/clientes/${actividad.cliente.id}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {actividad.cliente.nombre}
                          </Link>
                        </p>
                        <span className="text-xs text-gray-400 shrink-0">{tiempoTranscurrido}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Acciones Rápidas
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4">
                <Link href="/clientes/nuevo">
                  <Button variant="outline" size="lg" className="w-full justify-start">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Agregar Cliente
                  </Button>
                </Link>
                <Link href="/actividades/nueva">
                  <Button variant="outline" size="lg" className="w-full justify-start">
                    <PhoneIcon className="h-4 w-4 mr-2" />
                    Programar Llamada
                  </Button>
                </Link>
                <Link href="/clientes">
                  <Button variant="outline" size="lg" className="w-full justify-start">
                    <UsersIcon className="h-4 w-4 mr-2" />
                    Ver Clientes
                  </Button>
                </Link>
                <Link href="/reportes">
                  <Button variant="outline" size="lg" className="w-full justify-start">
                    <ChartBarIcon className="h-4 w-4 mr-2" />
                    Ver Reportes
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}
