'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { UltimaIADisplay } from '@/components/UltimaIADisplay';
import {
  Eye,
  PencilSimple,
  Sparkle,
  Globe,
  MagnifyingGlass,
  Trash,
  Envelope,
  WhatsappLogo,
  InstagramLogo,
  FacebookLogo,
  LinkedinLogo,
  TwitterLogo,
} from '@phosphor-icons/react';
import { getEstadoBadgeColor, getPrioridadBadgeColor } from '@/lib/badge-utils';
import type { ClienteTableItem } from '@/components/TablaClientes';

interface ClienteRowProps {
  readonly cliente: ClienteTableItem;
  readonly isSelected: boolean;
  readonly columnasActivas: readonly string[];
  readonly onToggleSelect: (id: string) => void;
  readonly onOpenEnrichmentModal: (cliente: ClienteTableItem) => void;
  readonly onOpenContactModal: (cliente: ClienteTableItem, tab: 'email' | 'whatsapp') => void;
  readonly onDelete: (cliente: ClienteTableItem) => void;
}

/**
 * A single row in the clients table.
 * Renders columns conditionally based on active column configuration.
 */
export const ClienteRow = React.memo(function ClienteRow({
  cliente,
  isSelected,
  columnasActivas,
  onToggleSelect,
  onOpenEnrichmentModal,
  onOpenContactModal,
  onDelete,
}: ClienteRowProps) {
  return (
    <tr className={isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'} aria-selected={isSelected}>
      <td className="px-0.5 py-2 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(cliente.id)}
          aria-label={`Select ${cliente.nombre}`}
          className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </td>
      {columnasActivas.includes('nombre') && (
        <td className="px-3 py-2">
          <div className="overflow-hidden">
            <Link href={`/clientes/${cliente.id}`} className="font-medium text-blue-600 hover:text-blue-800 hover:underline truncate block">
              {cliente.nombre}
            </Link>
            {(cliente.direccion || cliente.ciudad) && (
              <div className="text-gray-500 truncate">
                {[cliente.direccion, cliente.ciudad].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
        </td>
      )}
      {columnasActivas.includes('contacto') && (
        <td className="px-3 py-2">
          <div className="text-gray-900 overflow-hidden">
            {cliente.email && (
              <div className="truncate">
                <a
                  href={`mailto:${cliente.email}`}
                  className="text-blue-600 hover:text-blue-800"
                  title={cliente.email}
                >
                  {cliente.email}
                </a>
              </div>
            )}
            {cliente.telefono && (
              <div className="truncate mt-1">
                <a
                  href={`tel:${cliente.telefono}`}
                  className="text-blue-600 hover:text-blue-800"
                  title={cliente.telefono}
                >
                  {cliente.telefono}
                </a>
              </div>
            )}
            {!cliente.email && !cliente.telefono && (
              <span className="text-gray-400">Sin contacto</span>
            )}
          </div>
        </td>
      )}
      {columnasActivas.includes('estado') && (
        <td className="px-3 py-2">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full font-medium ${getEstadoBadgeColor({ estado: cliente.estado })}`}>
            {cliente.estado}
          </span>
        </td>
      )}
      {columnasActivas.includes('prioridad') && (
        <td className="px-3 py-2">
          {cliente.prioridad && (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full font-medium ${getPrioridadBadgeColor({ prioridad: cliente.prioridad })}`}>
              {cliente.prioridad}
            </span>
          )}
          {!cliente.prioridad && (
            <span className="text-gray-400">Sin prioridad</span>
          )}
        </td>
      )}
      {columnasActivas.includes('industria') && (
        <td className="px-3 py-2">
          <div className="text-gray-900 truncate" title={cliente.industria || 'Sin especificar'}>
            {cliente.industria || (
              <span className="text-gray-400">Sin especificar</span>
            )}
          </div>
        </td>
      )}
      {columnasActivas.includes('ultimoContacto') && (
        <td className="px-3 py-2">
          <div className="text-gray-500 truncate">
            {cliente.ultimoContacto ? (
              <span title={new Date(cliente.ultimoContacto).toLocaleString('es-ES')}>
                {new Date(cliente.ultimoContacto).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
              </span>
            ) : (
              <span className="text-gray-400">Nunca</span>
            )}
          </div>
        </td>
      )}
      {columnasActivas.includes('ultimaIA') && (
        <td className="px-3 py-2">
          <UltimaIADisplay fecha={cliente.ultimaIA} />
        </td>
      )}
      {columnasActivas.includes('fechaCreacion') && (
        <td className="px-3 py-2 text-gray-500 truncate">
          {new Date(cliente.fechaCreacion).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
        </td>
      )}
      {columnasActivas.includes('fechaModific') && (
        <td className="px-3 py-2 text-gray-500 truncate">
          {cliente.fechaModific ? (
            new Date(cliente.fechaModific).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </td>
      )}
      {columnasActivas.includes('sitioWeb') && (
        <td className="px-3 py-2">
          {cliente.sitioWeb ? (
            <a
              href={cliente.sitioWeb.startsWith('http') ? cliente.sitioWeb : `https://${cliente.sitioWeb}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-xs truncate block"
              title={cliente.sitioWeb}
            >
              <Globe weight="duotone" className="h-4 w-4 text-indigo-500" />
            </a>
          ) : (
            <span className="text-gray-400 text-xs">-</span>
          )}
        </td>
      )}
      {columnasActivas.includes('redesSociales') && (
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            {cliente.whatsapp && <span title="WhatsApp"><WhatsappLogo weight="duotone" className="h-4 w-4 text-green-600" /></span>}
            {cliente.instagram && <span title="Instagram"><InstagramLogo weight="duotone" className="h-4 w-4 text-pink-600" /></span>}
            {cliente.facebook && <span title="Facebook"><FacebookLogo weight="duotone" className="h-4 w-4 text-blue-600" /></span>}
            {cliente.linkedin && <span title="LinkedIn"><LinkedinLogo weight="duotone" className="h-4 w-4 text-blue-700" /></span>}
            {cliente.twitter && <span title="Twitter"><TwitterLogo weight="duotone" className="h-4 w-4 text-blue-400" /></span>}
            {!cliente.whatsapp && !cliente.instagram && !cliente.facebook && !cliente.linkedin && !cliente.twitter && (
              <span className="text-gray-400 text-xs">-</span>
            )}
          </div>
        </td>
      )}
      {columnasActivas.includes('acciones') && (
        <td className="px-2 py-2">
          <div className="flex items-center flex-wrap gap-0.5">
            <Link href={`/clientes/${cliente.id}`}>
              <Button variant="outline" size="sm" className="h-6 w-6 p-0 bg-sky-50 border-sky-300 hover:bg-sky-100 hover:border-sky-400" title="Ver cliente">
                <Eye weight="duotone" className="h-3.5 w-3.5 text-sky-700" />
              </Button>
            </Link>
            <Link href={`/clientes/${cliente.id}/editar`}>
              <Button variant="outline" size="sm" className="h-6 w-6 p-0 bg-amber-50 border-amber-300 hover:bg-amber-100 hover:border-amber-400" title="Editar cliente">
                <PencilSimple weight="duotone" className="h-3.5 w-3.5 text-amber-700" />
              </Button>
            </Link>
            <Button
              onClick={() => onOpenContactModal(cliente, 'email')}
              variant="outline"
              size="sm"
              className="h-6 w-6 p-0 bg-blue-50 border-blue-300 hover:bg-blue-100 hover:border-blue-400 disabled:bg-gray-50 disabled:border-gray-200 disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed"
              title={cliente.email ? 'Enviar email con plantilla' : 'Sin email'}
              disabled={!cliente.email}
            >
              <Envelope weight="duotone" className="h-3.5 w-3.5 text-blue-600" />
            </Button>
            <Button
              onClick={() => onOpenContactModal(cliente, 'whatsapp')}
              variant="outline"
              size="sm"
              className="h-6 w-6 p-0 bg-green-50 border-green-300 hover:bg-green-100 hover:border-green-400 disabled:bg-gray-50 disabled:border-gray-200 disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed"
              title={cliente.whatsapp ? 'Enviar WhatsApp con plantilla' : 'Sin WhatsApp'}
              disabled={!cliente.whatsapp}
            >
              <WhatsappLogo weight="duotone" className="h-3.5 w-3.5 text-green-600" />
            </Button>
            <Button
              onClick={() => onOpenEnrichmentModal(cliente)}
              variant="outline"
              size="sm"
              className="h-6 w-6 p-0 bg-purple-50 border-purple-300 hover:bg-purple-100 hover:border-purple-400"
              title="Buscar información con IA (OpenAI)"
            >
              <Sparkle weight="duotone" className="h-3.5 w-3.5 text-purple-600" />
            </Button>
            <Link href={`/clientes/${cliente.id}#enrichment`}>
              <Button
                variant="outline"
                size="sm"
                className="h-6 w-6 p-0 bg-indigo-50 border-indigo-300 hover:bg-indigo-100 hover:border-indigo-400"
                title="Ver página de búsqueda detallada"
              >
                <MagnifyingGlass weight="duotone" className="h-3.5 w-3.5 text-indigo-600" />
              </Button>
            </Link>
            <Link href={`/clientes/${cliente.id}#web-analysis`} className={!cliente.sitioWeb ? 'pointer-events-none' : ''}>
              <Button
                variant="outline"
                size="sm"
                className="h-6 w-6 p-0 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 disabled:bg-gray-50 disabled:border-gray-200 disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed"
                title={cliente.sitioWeb ? 'Analizar sitio web (capturas, PageSpeed, etc.)' : 'Sin sitio web'}
                disabled={!cliente.sitioWeb}
              >
                <Globe weight="duotone" className="h-3.5 w-3.5 text-emerald-600" />
              </Button>
            </Link>
            <Button
              onClick={() => onDelete(cliente)}
              variant="outline"
              size="sm"
              className="h-6 w-6 p-0 bg-red-50 border-red-300 hover:bg-red-100 hover:border-red-400"
              title="Eliminar cliente"
            >
              <Trash weight="duotone" className="h-3.5 w-3.5 text-red-600" />
            </Button>
          </div>
        </td>
      )}
    </tr>
  );
});
