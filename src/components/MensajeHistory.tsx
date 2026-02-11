'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  EnvelopeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { WhatsAppIcon } from '@/components/ui/SocialIcons';

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
                      <WhatsAppIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
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
