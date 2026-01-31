'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

interface Plantilla {
  id: string;
  nombre: string;
  descripcion: string | null;
  canal: 'EMAIL' | 'WHATSAPP';
  asunto: string | null;
  esActiva: boolean;
  createdAt: string;
  creadoPor: { name: string | null; email: string };
  _count: { mensajes: number };
}

function WhatsAppSmallIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

export default function PlantillasPage() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCanal, setFilterCanal] = useState<string>('');

  const fetchPlantillas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCanal) params.set('canal', filterCanal);
      const res = await fetch(`/api/plantillas?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPlantillas(data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filterCanal]);

  useEffect(() => {
    fetchPlantillas();
  }, [fetchPlantillas]);

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Desactivar la plantilla "${nombre}"?`)) return;
    try {
      const res = await fetch(`/api/plantillas/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchPlantillas();
      }
    } catch {
      alert('Error al eliminar la plantilla');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plantillas de Contacto</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona las plantillas para enviar emails y mensajes de WhatsApp
          </p>
        </div>
        <Link href="/admin/settings/plantillas/nueva">
          <Button>
            <PlusIcon className="h-4 w-4 mr-1" />
            Nueva Plantilla
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={filterCanal}
          onChange={(e) => setFilterCanal(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">Todos los canales</option>
          <option value="EMAIL">Email</option>
          <option value="WHATSAPP">WhatsApp</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando plantillas...</div>
      ) : plantillas.length === 0 ? (
        <div className="text-center py-12">
          <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-gray-500">No hay plantillas creadas</p>
          <Link href="/admin/settings/plantillas/nueva">
            <Button variant="outline" size="sm" className="mt-3">
              <PlusIcon className="h-4 w-4 mr-1" />
              Crear primera plantilla
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow ring-1 ring-black ring-opacity-5 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Canal</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asunto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mensajes</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {plantillas.map((p) => (
                <tr key={p.id} className={!p.esActiva ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/settings/plantillas/${p.id}/editar`} className="block group">
                      <div className="text-sm font-medium text-blue-600 group-hover:text-blue-800 group-hover:underline">{p.nombre}</div>
                      {p.descripcion && (
                        <div className="text-xs text-gray-500 truncate max-w-xs">{p.descripcion}</div>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      p.canal === 'EMAIL'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {p.canal === 'EMAIL' ? (
                        <EnvelopeIcon className="h-3 w-3" />
                      ) : (
                        <WhatsAppSmallIcon className="h-3 w-3" />
                      )}
                      {p.canal}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-xs">
                    {p.asunto || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {p._count.mensajes}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      p.esActiva ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {p.esActiva ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link href={`/admin/settings/plantillas/${p.id}/editar`}>
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                          <PencilIcon className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      {p.esActiva && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0 hover:border-red-400 hover:bg-red-50"
                          onClick={() => handleDelete(p.id, p.nombre)}
                        >
                          <TrashIcon className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
