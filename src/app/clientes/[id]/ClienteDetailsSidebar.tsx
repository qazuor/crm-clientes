import {
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarIcon,
  GlobeAltIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { CopyButton } from '@/components/ui/CopyButton';
import { InstagramIcon, FacebookIcon, LinkedInIcon, TwitterIcon, WhatsAppIcon } from '@/components/ui/SocialIcons';

interface ClienteSidebarData {
  readonly email: string | null;
  readonly telefono: string | null;
  readonly whatsapp: string | null;
  readonly instagram: string | null;
  readonly facebook: string | null;
  readonly linkedin: string | null;
  readonly twitter: string | null;
  readonly direccion: string | null;
  readonly ciudad: string | null;
  readonly provincia: string | null;
  readonly codigoPostal: string | null;
  readonly sitioWeb: string | null;
  readonly fechaCreacion: Date;
  readonly ultimoContacto: Date | null;
}

interface ClienteDetailsSidebarProps {
  readonly cliente: ClienteSidebarData;
}

/**
 * Sidebar for client detail page.
 * Renders Quick Actions, Contact Info, Location, Social Media, and Dates cards.
 */
export function ClienteDetailsSidebar({ cliente }: ClienteDetailsSidebarProps) {
  const hasContactInfo = cliente.email || cliente.telefono || cliente.whatsapp;
  const hasSocialMedia = cliente.instagram || cliente.facebook || cliente.linkedin || cliente.twitter;

  return (
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
  );
}
