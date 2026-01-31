'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { 
  PlusIcon,
  XMarkIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftEllipsisIcon,
  DocumentTextIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface NuevaActividadModalProps {
  clienteId: string;
  clienteNombre: string;
  variant?: 'default' | 'outline';
}

const TIPOS_ACTIVIDAD = [
  { value: 'LLAMADA', label: 'Llamada telefónica', icon: PhoneIcon },
  { value: 'EMAIL', label: 'Email', icon: EnvelopeIcon },
  { value: 'REUNION', label: 'Reunión', icon: UserGroupIcon },
  { value: 'TAREA', label: 'Tarea', icon: ClipboardDocumentListIcon },
  { value: 'NOTA', label: 'Nota', icon: ChatBubbleLeftEllipsisIcon },
  { value: 'PROPUESTA', label: 'Propuesta', icon: DocumentTextIcon },
  { value: 'SEGUIMIENTO', label: 'Seguimiento', icon: ClockIcon },
];


export function NuevaActividadModal({ 
  clienteId, 
  clienteNombre, 
  variant = 'outline' 
}: NuevaActividadModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    tipo: 'NOTA',
    descripcion: '',
    resultado: '',
    proximoPaso: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/actividades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          clienteId,
          resultado: formData.resultado || null,
          proximoPaso: formData.proximoPaso || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsOpen(false);
        setFormData({
          tipo: 'NOTA',
          descripcion: '',
          resultado: '',
          proximoPaso: ''
        });
        
        // Refrescar la página para mostrar la nueva actividad
        router.refresh();
      } else {
        setError(result.error || 'Error al crear la actividad');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <>
      {/* Botón para abrir modal */}
      <Button 
        onClick={() => setIsOpen(true)}
        variant={variant}
        className="flex items-center space-x-2"
      >
        <PlusIcon className="h-4 w-4" />
        <span>Nueva Actividad</span>
      </Button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Overlay */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setIsOpen(false)}
            />

            {/* Modal */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  {/* Header */}
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Nueva Actividad para {clienteNombre}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-200 rounded-r-md">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Tipo de actividad */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de actividad *
                      </label>
                      <select
                        value={formData.tipo}
                        onChange={(e) => handleInputChange('tipo', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        {TIPOS_ACTIVIDAD.map((tipo) => (
                          <option key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Descripción */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descripción *
                      </label>
                      <textarea
                        value={formData.descripcion}
                        onChange={(e) => handleInputChange('descripcion', e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="Describe la actividad realizada..."
                        required
                      />
                    </div>

                    {/* Resultado */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Resultado
                      </label>
                      <textarea
                        value={formData.resultado}
                        onChange={(e) => handleInputChange('resultado', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="¿Cuál fue el resultado de esta actividad?"
                      />
                    </div>

                    {/* Próximo paso */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Próximo paso
                      </label>
                      <textarea
                        value={formData.proximoPaso}
                        onChange={(e) => handleInputChange('proximoPaso', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="¿Cuál es el próximo paso a seguir?"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <Button 
                    type="submit" 
                    disabled={isLoading || !formData.descripcion.trim()}
                    className="w-full sm:w-auto sm:ml-3"
                  >
                    {isLoading ? 'Guardando...' : 'Guardar Actividad'}
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="mt-3 w-full sm:mt-0 sm:w-auto"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}