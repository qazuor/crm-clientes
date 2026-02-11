'use client';

import Link from 'next/link';
import { CaretUp, CaretDown } from '@phosphor-icons/react';

interface ClienteTableHeaderProps {
  readonly columnasActivas: readonly string[];
  readonly allPageSelected: boolean;
  readonly sortField: string;
  readonly sortOrder: string;
  readonly onToggleSelectAll: () => void;
  readonly createSortUrl: (field: string) => string;
}

interface SortableHeaderProps {
  readonly field: string;
  readonly label: string;
  readonly width: string;
  readonly sortField: string;
  readonly sortOrder: string;
  readonly createSortUrl: (field: string) => string;
}

/** Renders a single sortable column header with caret indicators. */
function SortableHeader({ field, label, width, sortField, sortOrder, createSortUrl }: SortableHeaderProps) {
  const isSorted = sortField === field;
  const ariaSortValue = isSorted ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined;

  return (
    <th
      scope="col"
      aria-sort={ariaSortValue}
      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
      style={{ width }}
    >
      <Link
        href={createSortUrl(field)}
        className="flex items-center space-x-1 hover:text-gray-700"
      >
        <span>{label}</span>
        {isSorted && (
          sortOrder === 'asc' ?
          <CaretUp weight="duotone" className="h-4 w-4" /> :
          <CaretDown weight="duotone" className="h-4 w-4" />
        )}
      </Link>
    </th>
  );
}

/**
 * Table header for the clients table.
 * Renders sortable column headers based on active column configuration.
 */
export function ClienteTableHeader({
  columnasActivas,
  allPageSelected,
  sortField,
  sortOrder,
  onToggleSelectAll,
  createSortUrl,
}: ClienteTableHeaderProps) {
  const sortProps = { sortField, sortOrder, createSortUrl };

  return (
    <thead className="bg-gray-50">
      <tr>
        <th scope="col" className="px-0.5 py-3 text-center" style={{ width: '2%' }}>
          <input
            type="checkbox"
            checked={allPageSelected}
            onChange={onToggleSelectAll}
            aria-label="Select all clients"
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </th>
        {columnasActivas.includes('nombre') && (
          <SortableHeader field="nombre" label="Cliente" width="12%" {...sortProps} />
        )}
        {columnasActivas.includes('contacto') && (
          <SortableHeader field="email" label="Contacto" width="14%" {...sortProps} />
        )}
        {columnasActivas.includes('estado') && (
          <SortableHeader field="estado" label="Estado" width="7%" {...sortProps} />
        )}
        {columnasActivas.includes('prioridad') && (
          <SortableHeader field="prioridad" label="Prioridad" width="7%" {...sortProps} />
        )}
        {columnasActivas.includes('industria') && (
          <SortableHeader field="industria" label="Industria" width="8%" {...sortProps} />
        )}
        {columnasActivas.includes('ultimoContacto') && (
          <SortableHeader field="ultimoContacto" label="Últ. Contacto" width="8%" {...sortProps} />
        )}
        {columnasActivas.includes('ultimaIA') && (
          <SortableHeader field="ultimaIA" label="Últ. IA" width="7%" {...sortProps} />
        )}
        {columnasActivas.includes('fechaCreacion') && (
          <SortableHeader field="fechaCreacion" label="Creada" width="7%" {...sortProps} />
        )}
        {columnasActivas.includes('fechaModific') && (
          <SortableHeader field="fechaModific" label="Modificada" width="7%" {...sortProps} />
        )}
        {columnasActivas.includes('sitioWeb') && (
          <SortableHeader field="sitioWeb" label="Web" width="7%" {...sortProps} />
        )}
        {columnasActivas.includes('redesSociales') && (
          <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '6%' }}>
            <span>Redes</span>
          </th>
        )}
        {columnasActivas.includes('acciones') && (
          <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '14%' }}>
            Acciones
          </th>
        )}
      </tr>
    </thead>
  );
}
