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
  Phone,
  MapPin,
  InstagramLogo,
  FacebookLogo,
  LinkedinLogo,
  TwitterLogo,
} from '@phosphor-icons/react';

interface Cliente {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  direccion: string | null;
  ciudad: string | null;
  estado: string;
  prioridad?: string;
  industria: string | null;
  sitioWeb: string | null;
  ultimaIA: Date | null;
  ultimoContacto?: Date | null;
  fechaCreacion: Date;
  fechaModific?: Date;
}

interface ClienteCardProps {
  cliente: Cliente;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onOpenEnrichmentModal: (cliente: Cliente) => void;
  onOpenContactModal: (cliente: Cliente, tab: 'email' | 'whatsapp') => void;
  onDelete: (cliente: Cliente) => void;
}

function getBadgeColor(estado: string) {
  switch (estado) {
    case 'NUEVO':
      return 'bg-blue-100 text-blue-800';
    case 'PRIMER_CONTACTO':
      return 'bg-yellow-100 text-yellow-800';
    case 'EN_TRATATIVAS':
      return 'bg-orange-100 text-orange-800';
    case 'EN_DESARROLLO':
      return 'bg-green-100 text-green-800';
    case 'FINALIZADO':
      return 'bg-gray-100 text-gray-800';
    case 'RECONTACTO':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getPrioridadBadgeColor(prioridad: string) {
  switch (prioridad) {
    case 'CRITICA':
      return 'bg-red-100 text-red-800';
    case 'ALTA':
      return 'bg-orange-100 text-orange-800';
    case 'MEDIA':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export const ClienteCard = React.memo(function ClienteCard({
  cliente,
  isSelected,
  onToggleSelect,
  onOpenEnrichmentModal,
  onOpenContactModal,
  onDelete,
}: ClienteCardProps) {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border p-4 transition-all ${
        isSelected ? 'ring-2 ring-blue-500 border-blue-300' : 'hover:shadow-md'
      }`}
    >
      {/* Header: Checkbox + Nombre + Estado */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(cliente.id)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <div className="flex-1 min-w-0">
          <Link
            href={`/clientes/${cliente.id}`}
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline truncate block"
          >
            {cliente.nombre}
          </Link>
          {cliente.industria && (
            <span className="text-xs text-gray-500">{cliente.industria}</span>
          )}
        </div>
        <span
          className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(
            cliente.estado
          )}`}
        >
          {cliente.estado}
        </span>
      </div>

      {/* Prioridad (si existe) */}
      {cliente.prioridad && (
        <div className="mt-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPrioridadBadgeColor(
              cliente.prioridad
            )}`}
          >
            {cliente.prioridad}
          </span>
        </div>
      )}

      {/* Info de contacto */}
      <div className="mt-3 space-y-1 text-sm text-gray-600">
        {cliente.email && (
          <div className="flex items-center gap-2 truncate">
            <Envelope weight="duotone" className="h-4 w-4 text-blue-500 shrink-0" />
            <a
              href={`mailto:${cliente.email}`}
              className="text-blue-600 hover:text-blue-800 truncate"
              title={cliente.email}
            >
              {cliente.email}
            </a>
          </div>
        )}
        {cliente.telefono && (
          <div className="flex items-center gap-2 truncate">
            <Phone weight="duotone" className="h-4 w-4 text-green-500 shrink-0" />
            <a
              href={`tel:${cliente.telefono}`}
              className="text-blue-600 hover:text-blue-800"
            >
              {cliente.telefono}
            </a>
          </div>
        )}
        {(cliente.direccion || cliente.ciudad) && (
          <div className="flex items-center gap-2 truncate">
            <MapPin weight="duotone" className="h-4 w-4 text-red-500 shrink-0" />
            <span className="truncate">
              {[cliente.direccion, cliente.ciudad].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
        {cliente.sitioWeb && (
          <div className="flex items-center gap-2 truncate">
            <Globe weight="duotone" className="h-4 w-4 text-indigo-500 shrink-0" />
            <a
              href={
                cliente.sitioWeb.startsWith('http')
                  ? cliente.sitioWeb
                  : `https://${cliente.sitioWeb}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 truncate"
              title={cliente.sitioWeb}
            >
              {cliente.sitioWeb}
            </a>
          </div>
        )}
      </div>

      {/* Redes sociales (iconos) */}
      {(cliente.whatsapp || cliente.instagram || cliente.facebook || cliente.linkedin || cliente.twitter) && (
        <div className="mt-2 flex items-center gap-2">
          {cliente.whatsapp && <span title="WhatsApp"><WhatsappLogo weight="duotone" className="h-5 w-5 text-green-600" /></span>}
          {cliente.instagram && <span title="Instagram"><InstagramLogo weight="duotone" className="h-5 w-5 text-pink-600" /></span>}
          {cliente.facebook && <span title="Facebook"><FacebookLogo weight="duotone" className="h-5 w-5 text-blue-600" /></span>}
          {cliente.linkedin && <span title="LinkedIn"><LinkedinLogo weight="duotone" className="h-5 w-5 text-blue-700" /></span>}
          {cliente.twitter && <span title="Twitter"><TwitterLogo weight="duotone" className="h-5 w-5 text-blue-400" /></span>}
        </div>
      )}

      {/* Ultima IA */}
      <div className="mt-3">
        <UltimaIADisplay fecha={cliente.ultimaIA} />
      </div>

      {/* Footer: Acciones */}
      <div className="mt-4 pt-3 border-t flex items-center gap-1 flex-wrap">
        <Link href={`/clientes/${cliente.id}`}>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 bg-sky-50 border-sky-300 hover:bg-sky-100 hover:border-sky-400"
            title="Ver cliente"
          >
            <Eye weight="duotone" className="h-4 w-4 text-sky-700" />
          </Button>
        </Link>
        <Link href={`/clientes/${cliente.id}/editar`}>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 bg-amber-50 border-amber-300 hover:bg-amber-100 hover:border-amber-400"
            title="Editar cliente"
          >
            <PencilSimple weight="duotone" className="h-4 w-4 text-amber-700" />
          </Button>
        </Link>
        <Button
          onClick={() => onOpenContactModal(cliente, 'email')}
          variant="outline"
          size="sm"
          className="h-7 px-2 bg-blue-50 border-blue-300 hover:bg-blue-100 hover:border-blue-400 disabled:bg-gray-50 disabled:border-gray-200 disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed"
          title={cliente.email ? 'Enviar email con plantilla' : 'Sin email'}
          disabled={!cliente.email}
        >
          <Envelope weight="duotone" className="h-4 w-4 text-blue-600" />
        </Button>
        <Button
          onClick={() => onOpenContactModal(cliente, 'whatsapp')}
          variant="outline"
          size="sm"
          className="h-7 px-2 bg-green-50 border-green-300 hover:bg-green-100 hover:border-green-400 disabled:bg-gray-50 disabled:border-gray-200 disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed"
          title={cliente.whatsapp ? 'Enviar WhatsApp con plantilla' : 'Sin WhatsApp'}
          disabled={!cliente.whatsapp}
        >
          <WhatsappLogo weight="duotone" className="h-4 w-4 text-green-600" />
        </Button>
        <Button
          onClick={() => onOpenEnrichmentModal(cliente)}
          variant="outline"
          size="sm"
          className="h-7 px-2 bg-purple-50 border-purple-300 hover:bg-purple-100 hover:border-purple-400"
          title="Buscar información con IA (OpenAI)"
        >
          <Sparkle weight="duotone" className="h-4 w-4 text-purple-600" />
        </Button>
        <Link href={`/clientes/${cliente.id}#enrichment`}>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 bg-indigo-50 border-indigo-300 hover:bg-indigo-100 hover:border-indigo-400"
            title="Ver página de búsqueda detallada"
          >
            <MagnifyingGlass weight="duotone" className="h-4 w-4 text-indigo-600" />
          </Button>
        </Link>
        <Link
          href={`/clientes/${cliente.id}#web-analysis`}
          className={!cliente.sitioWeb ? 'pointer-events-none' : ''}
        >
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 disabled:bg-gray-50 disabled:border-gray-200 disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed"
            title={cliente.sitioWeb ? 'Analizar sitio web (capturas, PageSpeed, etc.)' : 'Sin sitio web'}
            disabled={!cliente.sitioWeb}
          >
            <Globe weight="duotone" className="h-4 w-4 text-emerald-600" />
          </Button>
        </Link>
        <Button
          onClick={() => onDelete(cliente)}
          variant="outline"
          size="sm"
          className="h-7 px-2 bg-red-50 border-red-300 hover:bg-red-100 hover:border-red-400"
          title="Eliminar cliente"
        >
          <Trash weight="duotone" className="h-4 w-4 text-red-600" />
        </Button>
      </div>
    </div>
  );
});
