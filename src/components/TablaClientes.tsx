'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { UltimaIADisplay } from '@/components/UltimaIADisplay';
import { ColumnasSelect } from '@/components/ColumnasSelect';
import { EnrichmentModal } from '@/components/enrichment/EnrichmentModal';
import {
  EyeIcon,
  PencilIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  SparklesIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { ContactModal } from '@/components/ContactModal';
import { BulkContactModal } from '@/components/BulkContactModal';

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

interface TablaClientesProps {
  clientes: Cliente[];
  totalClientes: number;
  params: Record<string, string>;
  sortField: string;
  sortOrder: string;
  columnasIniciales?: string;
}

const COLUMNAS_DEFAULT = ['nombre', 'contacto', 'estado', 'industria', 'ultimaIA', 'acciones'];

const ESTADOS = [
  'NUEVO', 'PRIMER_CONTACTO', 'EN_TRATATIVAS', 'EN_DESARROLLO', 'FINALIZADO', 'RECONTACTO'
];

const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];

type BulkAction = 'delete' | 'changeEstado' | 'changePrioridad';

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

export function TablaClientes({
  clientes,
  totalClientes,
  params,
  sortField,
  sortOrder,
  columnasIniciales
}: TablaClientesProps) {
  const router = useRouter();
  const [columnasActivas, setColumnasActivas] = useState<string[]>(() => {
    if (columnasIniciales) {
      try {
        return JSON.parse(decodeURIComponent(columnasIniciales));
      } catch {
        return COLUMNAS_DEFAULT;
      }
    }
    return COLUMNAS_DEFAULT;
  });

  // Estados para el modal de enriquecimiento IA (individual + bulk)
  const [isEnrichmentModalOpen, setIsEnrichmentModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [bulkEnrichIds, setBulkEnrichIds] = useState<string[]>([]);
  const [bulkEnrichNames, setBulkEnrichNames] = useState<string[]>([]);

  // Estados para el modal de contacto
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactCliente, setContactCliente] = useState<Cliente | null>(null);
  const [contactDefaultTab, setContactDefaultTab] = useState<'email' | 'whatsapp'>('email');

  // Estados para acciones masivas
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [bulkValue, setBulkValue] = useState('');
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showBulkContactModal, setShowBulkContactModal] = useState(false);

  const allPageSelected = useMemo(
    () => clientes.length > 0 && clientes.every(c => selectedIds.has(c.id)),
    [clientes, selectedIds]
  );

  const handleColumnasChange = useCallback((nuevasColumnas: string[]) => {
    setColumnasActivas(nuevasColumnas);

    // Crear nueva URL preservando todos los parámetros actuales
    const currentParams = new URLSearchParams(window.location.search);
    currentParams.set('columnas', encodeURIComponent(JSON.stringify(nuevasColumnas)));

    // Usar router.push para navegar y actualizar la URL
    router.push(`/clientes?${currentParams.toString()}`, { scroll: false });
  }, [router]);

  const openEnrichmentModal = useCallback((cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsEnrichmentModalOpen(true);
  }, []);

  const closeEnrichmentModal = useCallback(() => {
    setIsEnrichmentModalOpen(false);
    setSelectedCliente(null);
    setBulkEnrichIds([]);
    setBulkEnrichNames([]);
    router.refresh();
  }, [router]);

  const openBulkEnrichModal = useCallback(() => {
    const ids = Array.from(selectedIds);
    const names = clientes.filter(c => selectedIds.has(c.id)).map(c => c.nombre);
    setBulkEnrichIds(ids);
    setBulkEnrichNames(names);
    setSelectedCliente(null);
    setIsEnrichmentModalOpen(true);
  }, [selectedIds, clientes]);

  const openContactModal = useCallback((cliente: Cliente, tab: 'email' | 'whatsapp') => {
    setContactCliente(cliente);
    setContactDefaultTab(tab);
    setIsContactModalOpen(true);
  }, []);

  const closeContactModal = useCallback(() => {
    setIsContactModalOpen(false);
    setContactCliente(null);
  }, []);

  const handleContactSuccess = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleDelete = useCallback(async (cliente: Cliente) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar a "${cliente.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/clientes/${cliente.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Error al eliminar el cliente');
        return;
      }
      router.refresh();
    } catch {
      alert('Error al eliminar el cliente');
    }
  }, [router]);

  // Bulk selection handlers
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allPageSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(clientes.map(c => c.id)));
    }
  }, [allPageSelected, clientes]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const openBulkModal = useCallback((action: BulkAction) => {
    setBulkAction(action);
    setBulkValue('');
    setShowBulkModal(true);
  }, []);

  const closeBulkModal = useCallback(() => {
    setShowBulkModal(false);
    setBulkAction(null);
    setBulkValue('');
  }, []);

  const executeBulkAction = useCallback(async () => {
    if (!bulkAction || selectedIds.size === 0) return;

    setIsBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      let body: Record<string, unknown>;

      if (bulkAction === 'delete') {
        body = { ids, action: 'delete' };
      } else if (bulkAction === 'changeEstado') {
        body = { ids, action: 'changeEstado', estado: bulkValue };
      } else {
        body = { ids, action: 'changePrioridad', prioridad: bulkValue };
      }

      const res = await fetch('/api/clientes/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Error al ejecutar la operación');
        return;
      }

      alert(data.message || 'Operación completada');
      setSelectedIds(new Set());
      closeBulkModal();
      router.refresh();
    } catch {
      alert('Error al ejecutar la operación masiva');
    } finally {
      setIsBulkLoading(false);
    }
  }, [bulkAction, bulkValue, selectedIds, closeBulkModal, router]);

  const bulkActionDisabled = useMemo(() => {
    if (bulkAction === 'delete') return false;
    return !bulkValue;
  }, [bulkAction, bulkValue]);

  const createSortUrl = useCallback((field: string) => {
    const newParams = new URLSearchParams(params);
    newParams.set('sort', field);
    newParams.set('order', sortField === field && sortOrder === 'asc' ? 'desc' : 'asc');
    return `?${newParams.toString()}`;
  }, [params, sortField, sortOrder]);

  // Total columns count: active columns + 1 for checkbox
  const totalColSpan = columnasActivas.length + 1;

  return (
    <div className="space-y-4">
      {/* Header con selector de columnas */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          Lista de Clientes ({totalClientes} encontrados)
        </h3>
        <ColumnasSelect
          columnasActivas={columnasActivas}
          onColumnasChange={handleColumnasChange}
        />
      </div>

      {/* Barra de acciones masivas */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <span className="text-sm font-medium text-blue-800">
            {selectedIds.size} cliente(s) seleccionado(s)
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={openBulkEnrichModal}
            >
              <SparklesIcon className="h-3.5 w-3.5 mr-1" />
              Enriquecer
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkContactModal(true)}
            >
              <EnvelopeIcon className="h-3.5 w-3.5 mr-1" />
              Contactar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openBulkModal('changeEstado')}
            >
              Cambiar Estado
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openBulkModal('changePrioridad')}
            >
              Cambiar Prioridad
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => openBulkModal('delete')}
            >
              Eliminar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearSelection}
            >
              Deseleccionar
            </Button>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="w-full">
        <div className="shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="w-full table-fixed divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* Checkbox header */}
                <th className="px-0.5 py-3 text-center" style={{width: '2%'}}>
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
{columnasActivas.includes('nombre') && (
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '12%'}}>
                <Link
                  href={createSortUrl('nombre')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Cliente</span>
                  {sortField === 'nombre' && (
                    sortOrder === 'asc' ?
                    <ChevronUpIcon className="h-4 w-4" /> :
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                </Link>
              </th>
            )}
{columnasActivas.includes('contacto') && (
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '14%'}}>
                <Link
                  href={createSortUrl('email')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Contacto</span>
                  {sortField === 'email' && (
                    sortOrder === 'asc' ?
                    <ChevronUpIcon className="h-4 w-4" /> :
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                </Link>
              </th>
            )}
{columnasActivas.includes('estado') && (
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '7%'}}>
                <Link
                  href={createSortUrl('estado')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Estado</span>
                  {sortField === 'estado' && (
                    sortOrder === 'asc' ?
                    <ChevronUpIcon className="h-4 w-4" /> :
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                </Link>
              </th>
            )}
{columnasActivas.includes('prioridad') && (
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '7%'}}>
                <Link
                  href={createSortUrl('prioridad')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Prioridad</span>
                  {sortField === 'prioridad' && (
                    sortOrder === 'asc' ?
                    <ChevronUpIcon className="h-4 w-4" /> :
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                </Link>
              </th>
            )}
{columnasActivas.includes('industria') && (
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '8%'}}>
                <Link
                  href={createSortUrl('industria')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Industria</span>
                  {sortField === 'industria' && (
                    sortOrder === 'asc' ?
                    <ChevronUpIcon className="h-4 w-4" /> :
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                </Link>
              </th>
            )}
{columnasActivas.includes('ultimoContacto') && (
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '8%'}}>
                <Link
                  href={createSortUrl('ultimoContacto')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Últ. Contacto</span>
                  {sortField === 'ultimoContacto' && (
                    sortOrder === 'asc' ?
                    <ChevronUpIcon className="h-4 w-4" /> :
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                </Link>
              </th>
            )}
{columnasActivas.includes('ultimaIA') && (
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '7%'}}>
                <Link
                  href={createSortUrl('ultimaIA')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Últ. IA</span>
                  {sortField === 'ultimaIA' && (
                    sortOrder === 'asc' ?
                    <ChevronUpIcon className="h-4 w-4" /> :
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                </Link>
              </th>
            )}
{columnasActivas.includes('fechaCreacion') && (
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '7%'}}>
                <Link
                  href={createSortUrl('fechaCreacion')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Creada</span>
                  {sortField === 'fechaCreacion' && (
                    sortOrder === 'asc' ?
                    <ChevronUpIcon className="h-4 w-4" /> :
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                </Link>
              </th>
            )}
{columnasActivas.includes('fechaModific') && (
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '7%'}}>
                <Link
                  href={createSortUrl('fechaModific')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Modificada</span>
                  {sortField === 'fechaModific' && (
                    sortOrder === 'asc' ?
                    <ChevronUpIcon className="h-4 w-4" /> :
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                </Link>
              </th>
            )}
{columnasActivas.includes('sitioWeb') && (
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '7%'}}>
                <Link
                  href={createSortUrl('sitioWeb')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Web</span>
                  {sortField === 'sitioWeb' && (
                    sortOrder === 'asc' ?
                    <ChevronUpIcon className="h-4 w-4" /> :
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                </Link>
              </th>
            )}
{columnasActivas.includes('redesSociales') && (
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '6%'}}>
                <span>Redes</span>
              </th>
            )}
{columnasActivas.includes('acciones') && (
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '14%'}}>
                Acciones
              </th>
            )}
              </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 text-xs">
            {clientes.length === 0 ? (
              <tr>
                <td colSpan={totalColSpan} className="px-6 py-12 text-center">
                  <div className="text-gray-500">
                    <p className="text-lg font-medium">No se encontraron clientes</p>
                    <p className="mt-1 text-sm">
                      No se encontraron clientes con los filtros aplicados.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              clientes.map((cliente) => (
                <tr
                  key={cliente.id}
                  className={selectedIds.has(cliente.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}
                >
                  <td className="px-0.5 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(cliente.id)}
                      onChange={() => toggleSelect(cliente.id)}
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
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full font-medium ${getBadgeColor(cliente.estado)}`}>
                      {cliente.estado}
                    </span>
                  </td>
                )}
                {columnasActivas.includes('prioridad') && (
                  <td className="px-3 py-2">
                    {cliente.prioridad && (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full font-medium ${
                        cliente.prioridad === 'CRITICA' ? 'bg-red-100 text-red-800' :
                        cliente.prioridad === 'ALTA' ? 'bg-orange-100 text-orange-800' :
                        cliente.prioridad === 'MEDIA' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
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
                    <UltimaIADisplay
                      fecha={cliente.ultimaIA}
                    />
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
                        🌐
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                )}
                {columnasActivas.includes('redesSociales') && (
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      {cliente.whatsapp && <span className="text-green-600" title="WhatsApp">📱</span>}
                      {cliente.instagram && <span className="text-pink-600" title="Instagram">📷</span>}
                      {cliente.facebook && <span className="text-blue-600" title="Facebook">👥</span>}
                      {cliente.linkedin && <span className="text-blue-700" title="LinkedIn">💼</span>}
                      {cliente.twitter && <span className="text-blue-400" title="Twitter">🐦</span>}
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
                          <EyeIcon className="h-3 w-3 text-sky-700" />
                        </Button>
                      </Link>
                      <Link href={`/clientes/${cliente.id}/editar`}>
                        <Button variant="outline" size="sm" className="h-6 w-6 p-0 bg-amber-50 border-amber-300 hover:bg-amber-100 hover:border-amber-400" title="Editar cliente">
                          <PencilIcon className="h-3 w-3 text-amber-700" />
                        </Button>
                      </Link>
                      <Button
                        onClick={() => openContactModal(cliente, 'email')}
                        variant="outline"
                        size="sm"
                        className="h-6 w-6 p-0 bg-blue-50 border-blue-300 hover:bg-blue-100 hover:border-blue-400 disabled:bg-gray-50 disabled:border-gray-200 disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed"
                        title={cliente.email ? 'Enviar email con plantilla' : 'Sin email'}
                        disabled={!cliente.email}
                      >
                        <EnvelopeIcon className="h-3 w-3 text-blue-600" />
                      </Button>
                      <Button
                        onClick={() => openContactModal(cliente, 'whatsapp')}
                        variant="outline"
                        size="sm"
                        className="h-6 w-6 p-0 bg-green-50 border-green-300 hover:bg-green-100 hover:border-green-400 disabled:bg-gray-50 disabled:border-gray-200 disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed"
                        title={cliente.whatsapp ? 'Enviar WhatsApp con plantilla' : 'Sin WhatsApp'}
                        disabled={!cliente.whatsapp}
                      >
                        <svg className="h-3 w-3 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </Button>
                      <Button
                        onClick={() => openEnrichmentModal(cliente)}
                        variant="outline"
                        size="sm"
                        className="h-6 w-6 p-0 bg-purple-50 border-purple-300 hover:bg-purple-100 hover:border-purple-400"
                        title="Buscar información con IA (OpenAI)"
                      >
                        <SparklesIcon className="h-3 w-3 text-purple-600" />
                      </Button>
                      <Link href={`/clientes/${cliente.id}#enrichment`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0 bg-indigo-50 border-indigo-300 hover:bg-indigo-100 hover:border-indigo-400"
                          title="Ver página de búsqueda detallada"
                        >
                          <MagnifyingGlassIcon className="h-3 w-3 text-indigo-600" />
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
                          <GlobeAltIcon className="h-3 w-3 text-emerald-600" />
                        </Button>
                      </Link>
                      <Button
                        onClick={() => handleDelete(cliente)}
                        variant="outline"
                        size="sm"
                        className="h-6 w-6 p-0 bg-red-50 border-red-300 hover:bg-red-100 hover:border-red-400"
                        title="Eliminar cliente"
                      >
                        <TrashIcon className="h-3 w-3 text-red-600" />
                      </Button>
                    </div>
                  </td>
                )}
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Modal de enriquecimiento IA (individual o bulk) */}
      <EnrichmentModal
        isOpen={isEnrichmentModalOpen}
        onClose={closeEnrichmentModal}
        clienteIds={selectedCliente ? [selectedCliente.id] : bulkEnrichIds}
        clienteNames={selectedCliente ? [selectedCliente.nombre] : bulkEnrichNames}
        clientHasWebsite={selectedCliente ? !!selectedCliente.sitioWeb : false}
      />

      {/* Modal de contacto */}
      {contactCliente && (
        <ContactModal
          isOpen={isContactModalOpen}
          onClose={closeContactModal}
          cliente={{
            id: contactCliente.id,
            nombre: contactCliente.nombre,
            email: contactCliente.email,
            telefono: contactCliente.telefono,
            whatsapp: contactCliente.whatsapp ?? null,
            direccion: contactCliente.direccion,
            ciudad: contactCliente.ciudad,
            industria: contactCliente.industria,
          }}
          onSuccess={handleContactSuccess}
          defaultTab={contactDefaultTab}
        />
      )}

      {/* Modal de contacto masivo */}
      <BulkContactModal
        isOpen={showBulkContactModal}
        onClose={() => setShowBulkContactModal(false)}
        clienteIds={Array.from(selectedIds)}
        onSuccess={() => router.refresh()}
      />

      {/* Modal de acciones masivas */}
      <Modal
        open={showBulkModal}
        onOpenChange={(open) => { if (!open) closeBulkModal(); }}
        title={
          bulkAction === 'delete'
            ? 'Eliminar clientes'
            : bulkAction === 'changeEstado'
            ? 'Cambiar estado'
            : 'Cambiar prioridad'
        }
        description={
          bulkAction === 'delete'
            ? `¿Estás seguro de que deseas eliminar ${selectedIds.size} cliente(s)? Esta acción no se puede deshacer.`
            : `Selecciona el nuevo valor para ${selectedIds.size} cliente(s).`
        }
      >
        {bulkAction === 'changeEstado' && (
          <select
            value={bulkValue}
            onChange={(e) => setBulkValue(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Seleccionar estado...</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        )}

        {bulkAction === 'changePrioridad' && (
          <select
            value={bulkValue}
            onChange={(e) => setBulkValue(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Seleccionar prioridad...</option>
            {PRIORIDADES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        )}

        <ModalFooter>
          <Button variant="outline" size="sm" onClick={closeBulkModal} disabled={isBulkLoading}>
            Cancelar
          </Button>
          <Button
            size="sm"
            className={bulkAction === 'delete' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
            onClick={executeBulkAction}
            disabled={isBulkLoading || bulkActionDisabled}
          >
            {isBulkLoading
              ? 'Procesando...'
              : bulkAction === 'delete'
              ? 'Eliminar'
              : 'Aplicar'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
