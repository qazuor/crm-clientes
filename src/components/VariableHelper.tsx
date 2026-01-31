'use client';

import { getAvailableVariables } from '@/lib/services/template-render-service';

interface VariableHelperProps {
  onInsert: (variable: string) => void;
}

const VARIABLE_LABELS: Record<string, string> = {
  nombre: 'Nombre',
  email: 'Email',
  telefono: 'Teléfono',
  whatsapp: 'WhatsApp',
  direccion: 'Dirección',
  ciudad: 'Ciudad',
  provincia: 'Provincia',
  codigoPostal: 'Código Postal',
  industria: 'Industria',
  sitioWeb: 'Sitio Web',
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  twitter: 'Twitter',
};

export function VariableHelper({ onInsert }: VariableHelperProps) {
  const variables = getAvailableVariables();

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Variables disponibles
      </h4>
      <p className="text-xs text-gray-400 mb-3">
        Haz clic para insertar en el editor
      </p>
      <div className="flex flex-wrap gap-1.5">
        {variables.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onInsert(`{${v}}`)}
            className="inline-flex items-center px-2 py-1 text-xs font-mono text-gray-700 bg-white border border-gray-300 rounded hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
            title={VARIABLE_LABELS[v] || v}
          >
            {`{${v}}`}
          </button>
        ))}
      </div>
    </div>
  );
}
