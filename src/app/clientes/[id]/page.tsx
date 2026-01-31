import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import {
  ArrowLeftIcon,
  PencilIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  ClockIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { CopyButton } from '@/components/ui/CopyButton';
import { ClientEnrichmentSection } from '@/components/enrichment/ClientEnrichmentSection';
import { notFound } from 'next/navigation';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { ContactButtons } from '@/components/ContactButtons';
import { MensajeHistory } from '@/components/MensajeHistory';

interface ClienteDetallesProps {
  params: {
    id: string;
  };
}

// Social media icon components
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
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

  const hasContactInfo = cliente.email || cliente.telefono || cliente.whatsapp;
  const hasSocialMedia = cliente.instagram || cliente.facebook || cliente.linkedin || cliente.twitter;

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
          <Link href="/clientes" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Volver a clientes
          </Link>
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
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Actions Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Acciones Rapidas</h3>
              <div className="grid grid-cols-2 gap-2">
                {cliente.telefono && (
                  <a
                    href={`tel:${cliente.telefono}`}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                  >
                    <PhoneIcon className="w-4 h-4" />
                    Llamar
                  </a>
                )}
                {cliente.email && (
                  <a
                    href={`mailto:${cliente.email}`}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    <EnvelopeIcon className="w-4 h-4" />
                    Email
                  </a>
                )}
                {cliente.whatsapp && (
                  <a
                    href={`https://wa.me/${cliente.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                    WhatsApp
                  </a>
                )}
                {cliente.sitioWeb && (
                  <a
                    href={cliente.sitioWeb.startsWith('http') ? cliente.sitioWeb : `https://${cliente.sitioWeb}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium"
                  >
                    <GlobeAltIcon className="w-4 h-4" />
                    Web
                  </a>
                )}
                {!hasContactInfo && !cliente.sitioWeb && (
                  <p className="col-span-2 text-sm text-gray-400 text-center py-2">Sin datos de contacto</p>
                )}
              </div>
            </div>

            {/* Contact Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Informacion de Contacto</h3>
              <div className="space-y-3">
                {cliente.email && (
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <EnvelopeIcon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{cliente.email}</p>
                        <p className="text-xs text-gray-500">Email</p>
                      </div>
                    </div>
                    <CopyButton text={cliente.email} label="email" />
                  </div>
                )}
                {cliente.telefono && (
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <PhoneIcon className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{cliente.telefono}</p>
                        <p className="text-xs text-gray-500">Telefono</p>
                      </div>
                    </div>
                    <CopyButton text={cliente.telefono} label="telefono" />
                  </div>
                )}
                {cliente.whatsapp && (
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{cliente.whatsapp}</p>
                        <p className="text-xs text-gray-500">WhatsApp</p>
                      </div>
                    </div>
                    <CopyButton text={cliente.whatsapp} label="whatsapp" />
                  </div>
                )}
                {!hasContactInfo && (
                  <div className="text-center py-4">
                    <PhoneIcon className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-400">Sin informacion de contacto</p>
                  </div>
                )}
              </div>
            </div>

            {/* Location Card */}
            {(cliente.direccion || cliente.ciudad || cliente.codigoPostal) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Ubicacion</h3>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <MapPinIcon className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    {cliente.direccion && <p className="text-sm text-gray-900">{cliente.direccion}</p>}
                    <p className="text-sm text-gray-600">
                      {cliente.ciudad}{cliente.provincia && `, ${cliente.provincia}`}
                    </p>
                    {cliente.codigoPostal && <p className="text-sm text-gray-500">CP: {cliente.codigoPostal}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Social Media Card */}
            {hasSocialMedia && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Redes Sociales</h3>
                <div className="flex flex-wrap gap-2">
                  {cliente.instagram && (
                    <a
                      href={cliente.instagram.startsWith('http') ? cliente.instagram : `https://instagram.com/${cliente.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
                    >
                      <InstagramIcon className="w-4 h-4" />
                      Instagram
                    </a>
                  )}
                  {cliente.facebook && (
                    <a
                      href={cliente.facebook.startsWith('http') ? cliente.facebook : `https://facebook.com/${cliente.facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <FacebookIcon className="w-4 h-4" />
                      Facebook
                    </a>
                  )}
                  {cliente.linkedin && (
                    <a
                      href={cliente.linkedin.startsWith('http') ? cliente.linkedin : `https://linkedin.com/company/${cliente.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors text-sm"
                    >
                      <LinkedInIcon className="w-4 h-4" />
                      LinkedIn
                    </a>
                  )}
                  {cliente.twitter && (
                    <a
                      href={cliente.twitter.startsWith('http') ? cliente.twitter : `https://x.com/${cliente.twitter.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors text-sm"
                    >
                      <TwitterIcon className="w-4 h-4" />
                      X
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Dates Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Informacion del Registro</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <CalendarIcon className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {cliente.fechaCreacion.toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-xs text-gray-500">Fecha de creacion</p>
                  </div>
                </div>
                {cliente.ultimoContacto && (
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <ClockIcon className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {cliente.ultimoContacto.toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-gray-500">Ultimo contacto</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

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
