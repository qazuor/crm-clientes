'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

interface ColumnasSelectProps {
  columnasActivas: string[];
  onColumnasChange: (columnas: string[]) => void;
}

const COLUMNAS_DISPONIBLES = [
  { key: 'nombre', label: 'Cliente', required: true },
  { key: 'contacto', label: 'Contacto' },
  { key: 'estado', label: 'Estado' },
  { key: 'prioridad', label: 'Prioridad' },
  { key: 'industria', label: 'Industria' },
  { key: 'agente', label: 'Agente' },
  { key: 'ultimoContacto', label: 'Último Contacto' },
  { key: 'ultimaIA', label: 'Última IA' },
  { key: 'fechaCreacion', label: 'Fecha Creación' },
  { key: 'fechaModific', label: 'Fecha Modificación' },
  { key: 'sitioWeb', label: 'Sitio Web' },
  { key: 'redesSociales', label: 'Redes Sociales' },
  { key: 'acciones', label: 'Acciones', required: true },
];

export function ColumnasSelect({ columnasActivas, onColumnasChange }: ColumnasSelectProps) {
  const [abierto, setAbierto] = useState(false);

  const toggleColumna = (columnaKey: string) => {
    const columna = COLUMNAS_DISPONIBLES.find(c => c.key === columnaKey);
    if (columna?.required) return; // No permitir desactivar columnas requeridas
    
    const nuevasColumnas = columnasActivas.includes(columnaKey)
      ? columnasActivas.filter(c => c !== columnaKey)
      : [...columnasActivas, columnaKey];
    
    onColumnasChange(nuevasColumnas);
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        onClick={() => setAbierto(!abierto)}
        className="px-3"
      >
        <Cog6ToothIcon className="h-4 w-4" />
      </Button>

      {abierto && (
        <>
          {/* Overlay para cerrar al hacer click afuera */}
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setAbierto(false)}
          />
          
          {/* Panel de selección */}
          <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="p-3">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Columnas Visibles
              </h3>
              <div className="space-y-2">
                {COLUMNAS_DISPONIBLES.map((columna) => (
                  <label
                    key={columna.key}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={columnasActivas.includes(columna.key)}
                      onChange={() => toggleColumna(columna.key)}
                      disabled={columna.required}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`text-sm ${
                      columna.required ? 'text-gray-500' : 'text-gray-900'
                    }`}>
                      {columna.label}
                      {columna.required && ' (requerida)'}
                    </span>
                  </label>
                ))}
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const todasLasColumnas = COLUMNAS_DISPONIBLES.map(c => c.key);
                    onColumnasChange(todasLasColumnas);
                  }}
                  className="w-full"
                >
                  Mostrar Todas
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}