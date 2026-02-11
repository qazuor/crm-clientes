'use client';

import { Button } from '@/components/ui/Button';
import { Sparkle, Envelope } from '@phosphor-icons/react';

export type BulkAction = 'delete' | 'changeEstado' | 'changePrioridad';

interface BulkActionsBarProps {
  readonly selectedCount: number;
  readonly onEnrich: () => void;
  readonly onContact: () => void;
  readonly onChangeEstado: () => void;
  readonly onChangePrioridad: () => void;
  readonly onDelete: () => void;
  readonly onClearSelection: () => void;
}

/**
 * Toolbar that appears when clients are selected in the table.
 * Provides bulk actions: enrich, contact, change estado/prioridad, delete.
 */
export function BulkActionsBar({
  selectedCount,
  onEnrich,
  onContact,
  onChangeEstado,
  onChangePrioridad,
  onDelete,
  onClearSelection,
}: BulkActionsBarProps) {
  return (
    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
      <span className="text-sm font-medium text-blue-800">
        {selectedCount} cliente(s) seleccionado(s)
      </span>
      <div className="flex items-center gap-2 ml-auto">
        <Button variant="outline" size="sm" onClick={onEnrich}>
          <Sparkle weight="duotone" className="h-4 w-4 mr-1" />
          Enriquecer
        </Button>
        <Button variant="outline" size="sm" onClick={onContact}>
          <Envelope weight="duotone" className="h-4 w-4 mr-1" />
          Contactar
        </Button>
        <Button variant="outline" size="sm" onClick={onChangeEstado}>
          Cambiar Estado
        </Button>
        <Button variant="outline" size="sm" onClick={onChangePrioridad}>
          Cambiar Prioridad
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 border-red-300 hover:bg-red-50"
          onClick={onDelete}
        >
          Eliminar
        </Button>
        <Button variant="outline" size="sm" onClick={onClearSelection}>
          Deseleccionar
        </Button>
      </div>
    </div>
  );
}
