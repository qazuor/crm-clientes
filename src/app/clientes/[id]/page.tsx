import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import {
  PencilIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  BuildingOfficeIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

const ClientEnrichmentSection = dynamic(
  async () => {
    const mod = await import('@/components/enrichment/ClientEnrichmentSection');
    return mod.ClientEnrichmentSection;
  },
  {
    loading: () => (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="animate-pulse text-gray-400">Cargando sección de enriquecimiento...</div>
      </div>
    ),
  }
);
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { ContactButtons } from '@/components/ContactButtons';
import { MensajeHistory } from '@/components/MensajeHistory';
import { ClienteDetailsSidebar } from './ClienteDetailsSidebar';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

interface ClienteDetallesProps {
  params: {
    id: string;
  };
}

export default async function ClienteDetallesPage({ params }: ClienteDetallesProps) {
  const session = await auth();

  if (!session) {
    redirect('/auth/login');
  }

  const { id } = await params;

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      actividades: {
        orderBy: {
          fecha: 'desc'
        },
        take: 5,
        include: {
          usuario: {
            select: {
              name: true,
              email: true
            }
          }
        }
      },
      _count: {
        select: {
          actividades: true
        }
      }
    }
  });

  if (!cliente) {
    notFound();
  }

  const estadoConfig = {
    'NUEVO': { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
    'PRIMER_CONTACTO': { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
    'EN_TRATATIVAS': { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
    'EN_DESARROLLO': { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    'FINALIZADO': { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' },
    'RECONTACTO': { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  };

  const prioridadConfig = {
    'BAJA': { bg: 'bg-gray-100', text: 'text-gray-700' },
    'MEDIA': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    'ALTA': { bg: 'bg-orange-100', text: 'text-orange-700' },
    'CRITICA': { bg: 'bg-red-100', text: 'text-red-700' }
  };

  const estadoStyle = estadoConfig[cliente.estado as keyof typeof estadoConfig] || estadoConfig.NUEVO;
  const prioridadStyle = prioridadConfig[cliente.prioridad as keyof typeof prioridadConfig] || prioridadConfig.MEDIA;

  // Calculate days since last contact (server component - Date.now() is safe here)
  const now = new Date();
  const daysSinceContact = cliente.ultimoContacto
    ? Math.floor((now.getTime() - cliente.ultimoContacto.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <AuthenticatedLayout currentPath="/clientes" userRole={session.user?.role}>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb & Actions */}
        <div className="flex items-center justify-between mb-6">
          <Breadcrumbs
            items={[
              { label: 'Clientes', href: '/clientes' },
              { label: cliente.nombre },
            ]}
          />
          <div className="flex items-center gap-2">
            <ContactButtons
              cliente={{
                id: cliente.id,
                nombre: cliente.nombre,
                email: cliente.email,
                telefono: cliente.telefono,
                whatsapp: cliente.whatsapp,
                direccion: cliente.direccion,
                ciudad: cliente.ciudad,
                provincia: cliente.provincia,
                codigoPostal: cliente.codigoPostal,
                industria: cliente.industria,
                sitioWeb: cliente.sitioWeb,
                instagram: cliente.instagram,
                facebook: cliente.facebook,
                linkedin: cliente.linkedin,
                twitter: cliente.twitter,
              }}
            />
            <Link href={`/clientes/${cliente.id}/actividades/nueva`}>
              <Button variant="outline" size="sm">
                <PlusIcon className="h-4 w-4 mr-1" />
                Actividad
              </Button>
            </Link>
            <Link href={`/clientes/${cliente.id}/editar`}>
              <Button size="sm">
                <PencilIcon className="h-4 w-4 mr-1" />
                Editar
              </Button>
            </Link>
          </div>
        </div>

        {/* Client Header Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              {/* Client Info */}
              <div className="flex items-start gap-4">
                {/* Avatar/Initial */}
                <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  {cliente.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{cliente.nombre}</h1>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {/* Estado Badge */}
                    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${estadoStyle.bg} ${estadoStyle.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${estadoStyle.dot} mr-1.5`} />
                      {cliente.estado}
                    </span>
                    {/* Prioridad Badge */}
                    <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${prioridadStyle.bg} ${prioridadStyle.text}`}>
                      {cliente.prioridad}
                    </span>
                    {/* Industria Badge */}
                    {cliente.industria && (
                      <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                        <BuildingOfficeIcon className="w-3 h-3 mr-1" />
                        {cliente.industria}
                      </span>
                    )}
                  </div>
                  {/* Location */}
                  {(cliente.ciudad || cliente.provincia) && (
                    <p className="text-sm text-gray-500 mt-2 flex items-center">
                      <MapPinIcon className="w-4 h-4 mr-1" />
                      {cliente.ciudad}{cliente.provincia && `, ${cliente.provincia}`}
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-3 sm:gap-4">
                {/* Activities Count */}
                <div className="text-center px-4 py-2 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {cliente._count.actividades}
                  </div>
                  <div className="text-xs text-gray-500">Actividades</div>
                </div>
                {/* Days since contact */}
                {daysSinceContact !== null && (
                  <div className="text-center px-4 py-2 bg-gray-50 rounded-lg">
                    <div className={`text-2xl font-bold ${daysSinceContact > 30 ? 'text-red-600' : daysSinceContact > 14 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {daysSinceContact}
                    </div>
                    <div className="text-xs text-gray-500">Dias sin contacto</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Contact & Info */}
          <ClienteDetailsSidebar cliente={cliente} />

          {/* Right Column - Activities, Notes, AI */}
          <div className="lg:col-span-2 space-y-6">
            {/* Notes Card */}
            {cliente.notas && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Notas</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{cliente.notas}</p>
                </div>
              </div>
            )}

            {/* Recent Activities Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <ClipboardDocumentListIcon className="w-4 h-4 text-gray-400" />
                  Actividades Recientes
                </h3>
                <Link href={`/clientes/${cliente.id}/actividades`}>
                  <Button variant="ghost" size="sm">
                    Ver todas ({cliente._count.actividades})
                  </Button>
                </Link>
              </div>
              <div className="p-4">
                {cliente.actividades.length > 0 ? (
                  <div className="space-y-3">
                    {cliente.actividades.map((actividad, index) => (
                      <div
                        key={actividad.id}
                        className={`flex items-start gap-3 ${index !== cliente.actividades.length - 1 ? 'pb-3 border-b border-gray-100' : ''}`}
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <CalendarIcon className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">{actividad.tipo}</p>
                            <span className="text-xs text-gray-500">
                              {actividad.fecha.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{actividad.descripcion}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            por {actividad.usuario.name || actividad.usuario.email}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CalendarIcon className="mx-auto h-10 w-10 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">No hay actividades registradas</p>
                    <Link href={`/clientes/${cliente.id}/actividades/nueva`}>
                      <Button variant="outline" size="sm" className="mt-3">
                        <PlusIcon className="w-4 h-4 mr-1" />
                        Agregar actividad
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Historial de Mensajes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                  Historial de Mensajes
                </h3>
              </div>
              <div className="p-4">
                <MensajeHistory clienteId={cliente.id} />
              </div>
            </div>

            {/* Enrichment Section (AI + Web + History) */}
            <ClientEnrichmentSection
              clienteId={cliente.id}
              clienteNombre={cliente.nombre}
              sitioWeb={cliente.sitioWeb}
            />
          </div>
        </div>
      </main>
    </AuthenticatedLayout>
  );
}
