import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import LogoutButton from '@/components/LogoutButton';
import { 
  ArrowLeftIcon,
  PencilIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  BuildingOffice2Icon,
  CalendarIcon,
  UserIcon,
  StarIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { UltimaIADisplay } from '@/components/UltimaIADisplay';
import { EnrichmentPanel } from '@/components/enrichment/EnrichmentPanel';
import { ClientInfoSearch } from '@/components/enrichment/ClientInfoSearch';
import { notFound } from 'next/navigation';

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

  // Await params for Next.js 15+
  const { id } = await params;

  // Obtener cliente específico
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      agente: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
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
      }
    }
  });

  if (!cliente) {
    notFound();
  }

  const estadoColors = {
    'NUEVO': 'bg-blue-100 text-blue-800',
    'CONTACTADO': 'bg-yellow-100 text-yellow-800', 
    'CALIFICADO': 'bg-green-100 text-green-800',
    'PERDIDO': 'bg-red-100 text-red-800'
  };

  const prioridadColors = {
    'BAJA': 'bg-gray-100 text-gray-800',
    'MEDIA': 'bg-yellow-100 text-yellow-800',
    'ALTA': 'bg-orange-100 text-orange-800',
    'CRITICA': 'bg-red-100 text-red-800'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center">
                <BuildingOffice2Icon className="h-8 w-8 text-blue-500 mr-3" />
                <h1 className="text-xl font-bold text-gray-900">CRM Clientes</h1>
              </Link>
              <nav className="hidden md:flex space-x-8">
                <Link href="/" className="text-gray-500 hover:text-gray-900">Dashboard</Link>
                <Link href="/clientes" className="text-blue-600 font-medium">Clientes</Link>
                <Link href="/actividades" className="text-gray-500 hover:text-gray-900">Actividades</Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/clientes" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Volver a clientes
          </Link>
        </div>

        {/* Header del cliente */}
        <div className="bg-white shadow-sm rounded-lg border mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{cliente.nombre}</h1>
              <div className="mt-2 flex items-center space-x-4">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${estadoColors[cliente.estado as keyof typeof estadoColors] || 'bg-gray-100 text-gray-800'}`}>
                  {cliente.estado}
                </span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${prioridadColors[cliente.prioridad as keyof typeof prioridadColors] || 'bg-gray-100 text-gray-800'}`}>
                  Prioridad {cliente.prioridad}
                </span>
                {cliente.industria && (
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                    {cliente.industria}
                  </span>
                )}
              </div>
            </div>
            <div className="flex space-x-3">
              <Link href={`/clientes/${cliente.id}/actividades`}>
                <Button variant="outline">
                  <ClipboardDocumentListIcon className="h-4 w-4 mr-2" />
                  Actividades ({cliente.actividades.length})
                </Button>
              </Link>
              <Link href={`/clientes/${cliente.id}/editar`}>
                <Button>
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </Link>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Información básica */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Información Básica</h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <MapPinIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {cliente.direccion && <>{cliente.direccion}<br /></>}
                        {cliente.ciudad}{cliente.provincia && `, ${cliente.provincia}`}
                        {cliente.codigoPostal && <><br />CP: {cliente.codigoPostal}</>}
                      </p>
                      <p className="text-xs text-gray-500">Ubicación</p>
                    </div>
                  </div>
                  {cliente.industria && (
                    <div className="flex items-center">
                      <BuildingOffice2Icon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{cliente.industria}</p>
                        <p className="text-xs text-gray-500">Industria</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center">
                    <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {cliente.fechaCreacion.toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-gray-500">Fecha de creación</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="mr-3">
                      <UltimaIADisplay fecha={cliente.ultimaIA} size="sm" showIcon={true} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Última búsqueda con IA</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Información de contacto */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Contacto</h3>
                <div className="space-y-3">
                  {cliente.email && (
                    <div className="flex items-center">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{cliente.email}</p>
                        <p className="text-xs text-gray-500">Email</p>
                      </div>
                    </div>
                  )}
                  {cliente.telefono && (
                    <div className="flex items-center">
                      <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{cliente.telefono}</p>
                        <p className="text-xs text-gray-500">Teléfono</p>
                      </div>
                    </div>
                  )}
                  {cliente.whatsapp && (
                    <div className="flex items-center">
                      <PhoneIcon className="h-5 w-5 text-green-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{cliente.whatsapp}</p>
                        <p className="text-xs text-gray-500">WhatsApp</p>
                      </div>
                    </div>
                  )}
                  {cliente.instagram && (
                    <div className="flex items-center">
                      <UserIcon className="h-5 w-5 text-pink-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">@{cliente.instagram}</p>
                        <p className="text-xs text-gray-500">Instagram</p>
                      </div>
                    </div>
                  )}
                  {cliente.facebook && (
                    <div className="flex items-center">
                      <UserIcon className="h-5 w-5 text-blue-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{cliente.facebook}</p>
                        <p className="text-xs text-gray-500">Facebook</p>
                      </div>
                    </div>
                  )}
                  {cliente.linkedin && (
                    <div className="flex items-center">
                      <UserIcon className="h-5 w-5 text-blue-700 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{cliente.linkedin}</p>
                        <p className="text-xs text-gray-500">LinkedIn</p>
                      </div>
                    </div>
                  )}
                  {cliente.twitter && (
                    <div className="flex items-center">
                      <UserIcon className="h-5 w-5 text-blue-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">@{cliente.twitter}</p>
                        <p className="text-xs text-gray-500">Twitter</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sitio Web */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Sitio Web</h3>
                <div className="space-y-3">
                  {cliente.sitioWeb ? (
                    <>
                      <div className="flex items-center">
                        <StarIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <a 
                            href={cliente.sitioWeb.startsWith('http') ? cliente.sitioWeb : `https://${cliente.sitioWeb}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 underline"
                          >
                            {cliente.sitioWeb}
                          </a>
                          <p className="text-xs text-gray-500">URL del sitio</p>
                        </div>
                      </div>
                      {cliente.tieneSSL !== null && (
                        <div className="flex items-center">
                          <div className={`h-3 w-3 rounded-full mr-3 ${cliente.tieneSSL ? 'bg-green-500' : 'bg-red-500'}`} />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {cliente.tieneSSL ? 'SSL Activo' : 'Sin SSL'}
                            </p>
                            <p className="text-xs text-gray-500">Certificado de seguridad</p>
                          </div>
                        </div>
                      )}
                      {cliente.esResponsive !== null && (
                        <div className="flex items-center">
                          <div className={`h-3 w-3 rounded-full mr-3 ${cliente.esResponsive ? 'bg-green-500' : 'bg-yellow-500'}`} />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {cliente.esResponsive ? 'Responsive' : 'No Responsive'}
                            </p>
                            <p className="text-xs text-gray-500">Diseño móvil</p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <StarIcon className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">Sin sitio web registrado</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Información comercial */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Información Comercial</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center">
                  <StarIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {((cliente.scoreConversion || 0) * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs text-gray-500">Score de conversión</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {cliente.agente?.name || cliente.agente?.email || 'Sin asignar'}
                    </p>
                    <p className="text-xs text-gray-500">Agente asignado</p>
                  </div>
                </div>
                {cliente.ultimoContacto && (
                  <div className="flex items-center">
                    <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {cliente.ultimoContacto.toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-gray-500">Último contacto</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notas */}
            {cliente.notas && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Notas</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{cliente.notas}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actividades recientes */}
        <div className="bg-white shadow-sm rounded-lg border">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Actividades Recientes</h3>
            <Link href={`/clientes/${cliente.id}/actividades`}>
              <Button variant="outline" size="sm">
                Ver todas ({cliente.actividades.length})
              </Button>
            </Link>
          </div>
          <div className="p-6">
            {cliente.actividades.length > 0 ? (
              <div className="space-y-4">
                {cliente.actividades.map((actividad) => (
                  <div key={actividad.id} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <CalendarIcon className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{actividad.tipo}</p>
                      <p className="text-sm text-gray-600 mt-1">{actividad.descripcion}</p>
                      <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                        <span>{actividad.fecha.toLocaleDateString('es-ES')}</span>
                        <span>•</span>
                        <span>{actividad.usuario.name || actividad.usuario.email}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay actividades</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Aún no se han registrado actividades para este cliente.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Client Info Search (IA) */}
        <div className="mt-8" id="enrichment">
          <ClientInfoSearch 
            cliente={{
              id: cliente.id,
              nombre: cliente.nombre,
              email: cliente.email || undefined,
              telefono: cliente.telefono || undefined,
              direccion: cliente.direccion || undefined,
              ciudad: cliente.ciudad || undefined,
              industria: cliente.industria || undefined,
              sitioWeb: cliente.sitioWeb || undefined
            }}
          />
        </div>

        {/* Web Analysis Panel */}
        {cliente.sitioWeb && (
          <div className="mt-8" id="web-analysis">
            <EnrichmentPanel 
              cliente={{
                id: cliente.id,
                nombre: cliente.nombre,
                website: cliente.sitioWeb,
                screenshotDesktop: cliente.screenshotDesktop || undefined,
                screenshotMobile: cliente.screenshotMobile || undefined,
                pageSpeedScore: cliente.pageSpeedScore ? parseInt(cliente.pageSpeedScore) : undefined,
                lastEnrichment: cliente.lastEnrichment || undefined
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}