'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { ColumnasSelect } from '@/components/ColumnasSelect';
import { VistaSelector } from '@/components/VistaSelector';
import { ClienteCard } from '@/components/ClienteCard';
import { ClienteRow } from '@/components/ClienteRow';
import { ClienteTableHeader } from '@/components/ClienteTableHeader';
import { BulkActionsBar } from '@/components/BulkActionsBar';
import type { BulkAction } from '@/components/BulkActionsBar';
import dynamic from 'next/dynamic';

const EnrichmentModal = dynamic(
  () => import('@/components/enrichment/EnrichmentModal').then((m) => m.EnrichmentModal),
  { ssr: false },
);
import { ContactModal } from '@/components/ContactModal';
const BulkContactModal = dynamic(
  () => import('@/components/BulkContactModal').then((m) => m.BulkContactModal),
  { ssr: false },
);

export interface ClienteTableItem {
  readonly id: string;
  readonly nombre: string;
  readonly email: string | null;
  readonly telefono: string | null;
  readonly whatsapp?: string | null;
  readonly instagram?: string | null;
  readonly facebook?: string | null;
  readonly linkedin?: string | null;
  readonly twitter?: string | null;
  readonly direccion: string | null;
  readonly ciudad: string | null;
  readonly estado: string;
  readonly prioridad?: string;
  readonly industria: string | null;
  readonly sitioWeb: string | null;
  readonly ultimaIA: Date | null;
  readonly ultimoContacto?: Date | null;
  readonly fechaCreacion: Date;
  readonly fechaModific?: Date;
}

interface TablaClientesProps {
  readonly clientes: ClienteTableItem[];
  readonly totalClientes: number;
  readonly params: Record<string, string>;
  readonly sortField: string;
  readonly sortOrder: string;
  readonly columnasIniciales?: string;
  readonly vistaInicial?: 'cards' | 'table';
}

const COLUMNAS_DEFAULT = ['nombre', 'contacto', 'estado', 'industria', 'ultimaIA', 'acciones'];
const ESTADOS = ['NUEVO', 'PRIMER_CONTACTO', 'EN_TRATATIVAS', 'EN_DESARROLLO', 'FINALIZADO', 'RECONTACTO'];
const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];

export function TablaClientes({
  clientes,
  totalClientes,
  params,
  sortField,
  sortOrder,
  columnasIniciales,
  vistaInicial
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

  // Estado de vista (cards/table)
  const [vista, setVista] = useState<'cards' | 'table'>(() => {
    if (vistaInicial === 'cards' || vistaInicial === 'table') return vistaInicial;
    return 'table';
  });

  // Detectar si es mobile para forzar cards
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Vista efectiva: en mobile siempre cards
  const vistaEfectiva = isMobile ? 'cards' : vista;

  // Handler para cambio de vista con persistencia en URL
  const handleVistaChange = useCallback((nuevaVista: 'cards' | 'table') => {
    setVista(nuevaVista);
    const currentParams = new URLSearchParams(window.location.search);
    currentParams.set('vista', nuevaVista);
    router.push(`/clientes?${currentParams.toString()}`, { scroll: false });
  }, [router]);

  // Estados para el modal de enriquecimiento IA (individual + bulk)
  const [isEnrichmentModalOpen, setIsEnrichmentModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteTableItem | null>(null);
  const [bulkEnrichIds, setBulkEnrichIds] = useState<string[]>([]);
  const [bulkEnrichNames, setBulkEnrichNames] = useState<string[]>([]);

  // Estados para el modal de contacto
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactCliente, setContactCliente] = useState<ClienteTableItem | null>(null);
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

  const openEnrichmentModal = useCallback((cliente: ClienteTableItem) => {
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

  const openContactModal = useCallback((cliente: ClienteTableItem, tab: 'email' | 'whatsapp') => {
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

  const handleDelete = useCallback(async (cliente: ClienteTableItem) => {
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
      {/* Header con selector de vista y columnas */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          Lista de Clientes ({totalClientes} encontrados)
        </h3>
        <div className="flex items-center gap-2">
          <VistaSelector
            vista={vista}
            onVistaChange={handleVistaChange}
            disabled={isMobile}
          />
          {vistaEfectiva === 'table' && (
            <ColumnasSelect
              columnasActivas={columnasActivas}
              onColumnasChange={handleColumnasChange}
            />
          )}
        </div>
      </div>

      {/* Barra de acciones masivas */}
      {selectedIds.size > 0 && (
        <BulkActionsBar
          selectedCount={selectedIds.size}
          onEnrich={openBulkEnrichModal}
          onContact={() => setShowBulkContactModal(true)}
          onChangeEstado={() => openBulkModal('changeEstado')}
          onChangePrioridad={() => openBulkModal('changePrioridad')}
          onDelete={() => openBulkModal('delete')}
          onClearSelection={clearSelection}
        />
      )}

      {/* Vista de Cards o Tabla */}
      {vistaEfectiva === 'cards' ? (
        <div className="w-full">
          {clientes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500">
                <p className="text-lg font-medium">No se encontraron clientes</p>
                <p className="mt-1 text-sm">
                  No se encontraron clientes con los filtros aplicados.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {clientes.map((cliente) => (
                <ClienteCard
                  key={cliente.id}
                  cliente={cliente}
                  isSelected={selectedIds.has(cliente.id)}
                  onToggleSelect={toggleSelect}
                  onOpenEnrichmentModal={openEnrichmentModal}
                  onOpenContactModal={openContactModal}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full">
          <div className="shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="w-full table-fixed divide-y divide-gray-200" role="grid" aria-label="Client list table">
              <ClienteTableHeader
                columnasActivas={columnasActivas}
                allPageSelected={allPageSelected}
                sortField={sortField}
                sortOrder={sortOrder}
                onToggleSelectAll={toggleSelectAll}
                createSortUrl={createSortUrl}
              />
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
                    <ClienteRow
                      key={cliente.id}
                      cliente={cliente}
                      isSelected={selectedIds.has(cliente.id)}
                      columnasActivas={columnasActivas}
                      onToggleSelect={toggleSelect}
                      onOpenEnrichmentModal={openEnrichmentModal}
                      onOpenContactModal={openContactModal}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
