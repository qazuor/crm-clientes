'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  EnvelopeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';

interface MensajeItem {
  id: string;
  canal: 'EMAIL' | 'WHATSAPP';
  destinatario: string;
  asunto: string | null;
  cuerpo: string;
  estado: 'PENDIENTE' | 'ENVIADO' | 'ERROR';
  errorDetalle: string | null;
  createdAt: string;
  usuario: { name: string | null; email: string };
  plantilla: { nombre: string } | null;
}

interface MensajeHistoryProps {
  clienteId: string;
}

function WhatsAppSmallIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

const estadoConfig = {
  PENDIENTE: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  ENVIADO: { bg: 'bg-green-100', text: 'text-green-700' },
  ERROR: { bg: 'bg-red-100', text: 'text-red-700' },
};

export function MensajeHistory({ clienteId }: MensajeHistoryProps) {
  const [mensajes, setMensajes] = useState<MensajeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCanal, setFilterCanal] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchMensajes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ clienteId });
      if (filterCanal) params.set('canal', filterCanal);
      if (filterEstado) params.set('estado', filterEstado);
      params.set('limit', '50');

      const res = await fetch(`/api/mensajes?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setMensajes(data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [clienteId, filterCanal, filterEstado]);

  useEffect(() => {
    fetchMensajes();
  }, [fetchMensajes]);

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-2 mb-3">
        <select
          value={filterCanal}
          onChange={(e) => setFilterCanal(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-900 bg-white focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">Todos</option>
          <option value="EMAIL">Email</option>
          <option value="WHATSAPP">WhatsApp</option>
        </select>
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-900 bg-white focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          <option value="ENVIADO">Enviado</option>
          <option value="ERROR">Error</option>
          <option value="PENDIENTE">Pendiente</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-sm text-gray-400 py-4 text-center">Cargando mensajes...</p>
      ) : mensajes.length === 0 ? (
        <div className="text-center py-6">
          <EnvelopeIcon className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-400">No hay mensajes enviados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {mensajes.map((m) => {
            const style = estadoConfig[m.estado];
            const isExpanded = expandedId === m.id;
            return (
              <div
                key={m.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {m.canal === 'EMAIL' ? (
                      <EnvelopeIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    ) : (
                      <WhatsAppSmallIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {m.asunto || m.cuerpo.substring(0, 60) + (m.cuerpo.length > 60 ? '...' : '')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
                      {m.estado}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(m.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                    </span>
                    {isExpanded ? (
                      <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-gray-100">
                    <div className="mt-2 space-y-1 text-xs text-gray-500">
                      <p>
                        <span className="font-medium">Destinatario:</span> {m.destinatario}
                      </p>
                      <p>
                        <span className="font-medium">Enviado por:</span> {m.usuario.name || m.usuario.email}
                      </p>
                      {m.plantilla && (
                        <p>
                          <span className="font-medium">Plantilla:</span> {m.plantilla.nombre}
                        </p>
                      )}
                      {m.errorDetalle && (
                        <p className="text-red-600">
                          <span className="font-medium">Error:</span> {m.errorDetalle}
                        </p>
                      )}
                    </div>
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                      {m.canal === 'EMAIL' ? (
                        <div className="max-w-none text-gray-900 text-sm [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_li]:mb-1 [&_a]:text-blue-600 [&_a]:underline" dangerouslySetInnerHTML={{ __html: m.cuerpo }} />
                      ) : (
                        <p className="text-gray-700 whitespace-pre-wrap">{m.cuerpo}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
