'use client';

import { useState, useRef, useEffect } from 'react';

type FieldType = 'text' | 'email' | 'phone' | 'url';

interface FieldEditInputProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  fieldType?: FieldType;
}

function validate(value: string, fieldType: FieldType): string | null {
  if (!value.trim()) return 'El valor no puede estar vacío';
  if (fieldType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'Formato de email inválido';
  }
  if (fieldType === 'url' && !/^https?:\/\/.+/.test(value)) {
    return 'La URL debe comenzar con http:// o https://';
  }
  return null;
}

/**
 * Inline input for editing a suggested enrichment value before accepting.
 */
export function FieldEditInput({
  value,
  onChange,
  onSave,
  onCancel,
  fieldType = 'text',
}: FieldEditInputProps) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = () => {
    const validationError = validate(value, fieldType);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onSave();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const inputType = fieldType === 'email' ? 'email' : fieldType === 'url' ? 'url' : 'text';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type={inputType}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          className={`flex-1 rounded border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white'
          }`}
        />
        <button
          type="button"
          onClick={handleSave}
          className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
