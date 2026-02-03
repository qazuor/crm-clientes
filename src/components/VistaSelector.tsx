'use client';

import { Table, SquaresFour } from '@phosphor-icons/react';

interface VistaSelectorProps {
  vista: 'cards' | 'table';
  onVistaChange: (vista: 'cards' | 'table') => void;
  disabled?: boolean;
}

/**
 * Toggle selector for switching between table and cards view.
 * Hidden on mobile devices when disabled=true.
 */
export function VistaSelector({ vista, onVistaChange, disabled }: VistaSelectorProps) {
  if (disabled) return null;

  return (
    <div className="inline-flex rounded-lg border border-gray-300 p-0.5 bg-white">
      <button
        onClick={() => onVistaChange('table')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
          vista === 'table'
            ? 'bg-blue-600 text-white'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
        title="Vista de tabla"
        aria-label="Vista de tabla"
        aria-pressed={vista === 'table'}
      >
        <Table weight="duotone" className="h-4 w-4" />
        <span className="hidden sm:inline">Tabla</span>
      </button>
      <button
        onClick={() => onVistaChange('cards')}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
          vista === 'cards'
            ? 'bg-blue-600 text-white'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
        title="Vista de tarjetas"
        aria-label="Vista de tarjetas"
        aria-pressed={vista === 'cards'}
      >
        <SquaresFour weight="duotone" className="h-4 w-4" />
        <span className="hidden sm:inline">Cards</span>
      </button>
    </div>
  );
}
