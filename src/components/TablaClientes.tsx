'use client';

import { useState, useCallback, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { UltimaIADisplay } from '@/components/UltimaIADisplay';
import { ColumnasSelect } from '@/components/ColumnasSelect';
import { EnrichmentModal } from '@/components/EnrichmentModal';
import { 
  EyeIcon,
  PencilIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  SparklesIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

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
  agente: {
    name: string | null;
    email: string;
  } | null;
}

interface TablaClientesProps {
  clientes: Cliente[];
  params: Record<string, string>;
  sortField: string;
  sortOrder: string;
  columnasIniciales?: string;
}

const COLUMNAS_DEFAULT = ['nombre', 'contacto', 'estado', 'industria', 'agente', 'ultimaIA', 'acciones'];

function getBadgeColor(estado: string) {
  switch (estado) {
    case 'NUEVO':
      return 'bg-blue-100 text-blue-800';
    case 'CONTACTADO':
      return 'bg-yellow-100 text-yellow-800';
    case 'CALIFICADO':
      return 'bg-green-100 text-green-800';
    case 'PERDIDO':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function TablaClientes({ 
  clientes, 
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

  // Estados para el modal de enriquecimiento IA
  const [isEnrichmentModalOpen, setIsEnrichmentModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

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
  }, []);

  const handleEnrichmentSuccess = useCallback(() => {
    closeEnrichmentModal();
    // Refresh server components to show updated data
    router.refresh();
  }, [closeEnrichmentModal, router]);

  const createSortUrl = useCallback((field: string) => {
    const newParams = new URLSearchParams(params);
    newParams.set('sort', field);
    newParams.set('order', sortField === field && sortOrder === 'asc' ? 'desc' : 'asc');
    return `?${newParams.toString()}`;
  }, [params, sortField, sortOrder]);

  const SortableHeader = ({ field, children, width }: { field: string; children: React.ReactNode; width?: string }) => (
    <th className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${width || ''}`}>
      <Link 
        href={createSortUrl(field)}
        className="flex items-center space-x-1 hover:text-gray-700"
      >
        <span>{children}</span>
        {sortField === field && (
          sortOrder === 'asc' ? 
          <ChevronUpIcon className="h-4 w-4" /> : 
          <ChevronDownIcon className="h-4 w-4" />
        )}
      </Link>
    </th>
  );

  return (
    <div className="space-y-4">
      {/* Header con selector de columnas */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          Lista de Clientes ({clientes.length} encontrados)
        </h3>
        <ColumnasSelect
          columnasActivas={columnasActivas}
          onColumnasChange={handleColumnasChange}
        />
      </div>

      {/* Tabla */}
      <div className="w-full">
        <div className="shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="w-full table-fixed divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
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
{columnasActivas.includes('agente') && (
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '8%'}}>
                <Link 
                  href={createSortUrl('agente')}
                  className="flex items-center space-x-1 hover:text-gray-700"
                >
                  <span>Agente</span>
                  {sortField === 'agente' && (
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
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '10%'}}>
                Acciones
              </th>
            )}
              </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {clientes.length === 0 ? (
              <tr>
                <td colSpan={columnasActivas.length} className="px-6 py-12 text-center">
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
                <tr key={cliente.id} className="hover:bg-gray-50">
                  {columnasActivas.includes('nombre') && (
                  <td className="px-3 py-3">
                    <div className="overflow-hidden">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {cliente.nombre}
                      </div>
                        {(cliente.direccion || cliente.ciudad) && (
                          <div className="text-sm text-gray-500 truncate">
                            {[cliente.direccion, cliente.ciudad].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </div>
                    </td>
                  )}
                {columnasActivas.includes('contacto') && (
                  <td className="px-3 py-3">
                    <div className="text-sm text-gray-900 overflow-hidden">
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
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(cliente.estado)}`}>
                      {cliente.estado}
                    </span>
                  </td>
                )}
                {columnasActivas.includes('prioridad') && (
                  <td className="px-3 py-3">
                    {cliente.prioridad && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        cliente.prioridad === 'CRITICA' ? 'bg-red-100 text-red-800' :
                        cliente.prioridad === 'ALTA' ? 'bg-orange-100 text-orange-800' :
                        cliente.prioridad === 'MEDIA' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {cliente.prioridad}
                      </span>
                    )}
                    {!cliente.prioridad && (
                      <span className="text-gray-400 text-xs">Sin prioridad</span>
                    )}
                  </td>
                )}
                {columnasActivas.includes('industria') && (
                  <td className="px-3 py-3">
                    <div className="text-sm text-gray-900 truncate" title={cliente.industria || 'Sin especificar'}>
                      {cliente.industria || (
                        <span className="text-gray-400">Sin especificar</span>
                      )}
                    </div>
                  </td>
                )}
                {columnasActivas.includes('agente') && (
                  <td className="px-3 py-3">
                    <div className="text-sm text-gray-900 truncate" title={cliente.agente?.name || 'Sin asignar'}>
                      {cliente.agente?.name || (
                        <span className="text-gray-400">Sin asignar</span>
                      )}
                    </div>
                  </td>
                )}
                {columnasActivas.includes('ultimoContacto') && (
                  <td className="px-3 py-3">
                    <div className="text-sm text-gray-500 truncate">
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
                  <td className="px-3 py-3">
                    <UltimaIADisplay 
                      fecha={cliente.ultimaIA}
                    />
                  </td>
                )}
                {columnasActivas.includes('fechaCreacion') && (
                  <td className="px-3 py-3 text-sm text-gray-500 truncate">
                    {new Date(cliente.fechaCreacion).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                  </td>
                )}
                {columnasActivas.includes('fechaModific') && (
                  <td className="px-3 py-3 text-sm text-gray-500 truncate">
                    {cliente.fechaModific ? (
                      new Date(cliente.fechaModific).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                )}
                {columnasActivas.includes('sitioWeb') && (
                  <td className="px-3 py-3">
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
                  <td className="px-3 py-3">
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
                  <td className="px-3 py-3">
                    <div className="flex items-center space-x-1">
                      <Link href={`/clientes/${cliente.id}`}>
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-gray-300">
                          <EyeIcon className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Link href={`/clientes/${cliente.id}/editar`}>
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-gray-300">
                          <PencilIcon className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        onClick={() => openEnrichmentModal(cliente)}
                        variant="outline" 
                        size="sm" 
                        className="h-7 w-7 p-0 border-gray-300 hover:border-purple-400 hover:bg-purple-50"
                        title="Buscar información con IA (OpenAI)"
                      >
                        <SparklesIcon className="h-3.5 w-3.5 text-purple-600" />
                      </Button>
                      <Link href={`/clientes/${cliente.id}#enrichment`}>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 w-7 p-0 border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                          title="Ver página de búsqueda detallada"
                        >
                          <MagnifyingGlassIcon className="h-3.5 w-3.5 text-blue-600" />
                        </Button>
                      </Link>
                      {cliente.sitioWeb && (
                        <Link href={`/clientes/${cliente.id}#web-analysis`}>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 w-7 p-0 border-gray-300 hover:border-green-400 hover:bg-green-50"
                            title="Analizar sitio web (capturas, PageSpeed, etc.)"
                          >
                            <GlobeAltIcon className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                        </Link>
                      )}
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

      {/* Modal de enriquecimiento IA */}
      {selectedCliente && (
        <EnrichmentModal
          isOpen={isEnrichmentModalOpen}
          onClose={closeEnrichmentModal}
          cliente={{
            id: selectedCliente.id,
            nombre: selectedCliente.nombre,
            email: selectedCliente.email,
            telefono: selectedCliente.telefono,
            whatsapp: selectedCliente.whatsapp ?? null,
            instagram: selectedCliente.instagram ?? null,
            facebook: selectedCliente.facebook ?? null,
            linkedin: selectedCliente.linkedin ?? null,
            twitter: selectedCliente.twitter ?? null,
            sitioWeb: selectedCliente.sitioWeb,
            tieneSSL: null,
            esResponsive: null,
            direccion: selectedCliente.direccion,
            ciudad: selectedCliente.ciudad,
            provincia: null,
            codigoPostal: null,
            industria: selectedCliente.industria,
            notas: null,
          }}
          onSuccess={handleEnrichmentSuccess}
        />
      )}
    </div>
  );
}
