'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { 
  XMarkIcon,
  CheckIcon,
  SparklesIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface Cliente {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  twitter: string | null;
  sitioWeb: string | null;
  tieneSSL: boolean | null;
  esResponsive: boolean | null;
  direccion: string | null;
  ciudad: string | null;
  provincia: string | null;
  codigoPostal: string | null;
  industria: string | null;
  notas: string | null;
}

interface EnrichmentData {
  telefono?: string;
  whatsapp?: string;
  email?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  twitter?: string;
  sitioWeb?: string;
  tieneSSL?: boolean;
  esResponsive?: boolean;
  direccionCompleta?: string;
  confidence?: number;
  fuentes?: string[];
  notas?: string;
}

interface DataComparison {
  field: string;
  label: string;
  current: string | boolean | null;
  found: string | boolean | null | undefined;
  isChanged: boolean;
  accept: boolean;
}

interface EnrichmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: Cliente;
  onSuccess: () => void;
}

export function EnrichmentModal({ isOpen, onClose, cliente, onSuccess }: EnrichmentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [enrichmentData, setEnrichmentData] = useState<EnrichmentData | null>(null);
  const [comparisons, setComparisons] = useState<DataComparison[]>([]);
  const [error, setError] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [useAdvancedSearch, setUseAdvancedSearch] = useState(true); // Activado por defecto
  const [confidenceLevel, setConfidenceLevel] = useState<number>(0.3); // Valor entre 0.0 y 1.0

  const getConfidenceCategory = useCallback((value: number): string => {
    if (value < 0.4) return 'conservador';
    if (value < 0.7) return 'balanceado';
    return 'agresivo';
  }, []);

  const getConfidenceIcon = useCallback((value: number): string => {
    if (value < 0.4) return '🛡️';
    if (value < 0.7) return '⚖️';
    return '🚀';
  }, []);

  const getConfidenceColor = useCallback((value: number): string => {
    if (value < 0.4) return 'text-green-600';
    if (value < 0.7) return 'text-yellow-600';
    return 'text-red-600';
  }, []);

  const startEnrichment = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setEnrichmentData(null);

    try {
      // Llamar a la API de OpenAI para buscar información
      const response = await fetch('/api/openai-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cliente: {
            id: cliente.id,
            nombre: cliente.nombre,
            email: cliente.email,
            telefono: cliente.telefono,
            direccion: cliente.direccion,
            ciudad: cliente.ciudad,
            provincia: cliente.provincia,
            industria: cliente.industria,
            sitioWeb: cliente.sitioWeb
          },
          options: {
            useAdvancedSearch,
            confidenceLevel,
            timestamp: new Date().toISOString()
          }
        }),
      });

      const result = await response.json();

      if (result.success && result.enrichedData) {
        setEnrichmentData(result.enrichedData);
        generateComparisons(result.enrichedData);
      } else {
        setError(result.error || 'No se encontraron datos');
      }
    } catch {
      setError('Error de conexión con el servicio de IA');
    } finally {
      setIsLoading(false);
    }
  }, [cliente, useAdvancedSearch, confidenceLevel]);

  const generateComparisons = useCallback((data: EnrichmentData) => {
    const fieldMappings = [
      { field: 'telefono', label: 'Teléfono', current: cliente.telefono, found: data.telefono },
      { field: 'whatsapp', label: 'WhatsApp', current: cliente.whatsapp, found: data.whatsapp },
      { field: 'email', label: 'Email', current: cliente.email, found: data.email },
      { field: 'instagram', label: 'Instagram', current: cliente.instagram, found: data.instagram },
      { field: 'facebook', label: 'Facebook', current: cliente.facebook, found: data.facebook },
      { field: 'linkedin', label: 'LinkedIn', current: cliente.linkedin, found: data.linkedin },
      { field: 'twitter', label: 'Twitter', current: cliente.twitter, found: data.twitter },
      { field: 'sitioWeb', label: 'Sitio Web', current: cliente.sitioWeb, found: data.sitioWeb },
      { field: 'tieneSSL', label: 'Tiene SSL', current: cliente.tieneSSL, found: data.tieneSSL },
      { field: 'esResponsive', label: 'Es Responsive', current: cliente.esResponsive, found: data.esResponsive },
      { field: 'direccion', label: 'Dirección', current: cliente.direccion, found: data.direccionCompleta },
      { field: 'notas', label: 'Notas (Info Extra)', current: cliente.notas, found: data.notas },
    ];

    const validComparisons = fieldMappings
      .filter(mapping => mapping.found !== null && mapping.found !== undefined && mapping.found !== '')
      .map(mapping => {
        const isChanged = mapping.current !== mapping.found;
        return {
          ...mapping,
          isChanged,
          accept: isChanged, // Por defecto, aceptar solo los cambios
        };
      });

    setComparisons(validComparisons);
  }, [cliente]);

  const toggleAccept = useCallback((field: string) => {
    setComparisons(prev =>
      prev.map(comp =>
        comp.field === field
          ? { ...comp, accept: !comp.accept }
          : comp
      )
    );
  }, []);

  const acceptAll = useCallback(() => {
    setComparisons(prev => prev.map(comp => ({ ...comp, accept: true })));
  }, []);

  const rejectAll = useCallback(() => {
    setComparisons(prev => prev.map(comp => ({ ...comp, accept: false })));
  }, []);

  const saveChanges = useCallback(async () => {
    setIsSaving(true);
    setError('');

    try {
      const acceptedChanges: Record<string, string | boolean | null | undefined> = {};

      comparisons.forEach(comp => {
        if (comp.accept) {
          // Special handling for notas - append to existing instead of replacing
          if (comp.field === 'notas' && comp.found) {
            const existingNotas = cliente.notas || '';
            const newNotas = String(comp.found);
            const separator = existingNotas ? '\n\n--- Info IA ---\n' : '';
            acceptedChanges.notas = existingNotas + separator + newNotas;
          } else {
            acceptedChanges[comp.field === 'direccion' ? 'direccion' : comp.field] = comp.found;
          }
        }
      });

      const response = await fetch(`/api/clientes/${cliente.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(acceptedChanges),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error || 'Error al guardar cambios');
      }
    } catch {
      setError('Error de conexión al guardar');
    } finally {
      setIsSaving(false);
    }
  }, [comparisons, cliente.id, onSuccess, onClose]);

  const formatValue = useCallback((value: string | boolean | null | undefined): string => {
    if (value === null || value === undefined || value === '') return 'Sin información';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    return String(value);
  }, []);

  const hasChanges = useMemo(() => comparisons.some(comp => comp.accept), [comparisons]);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-4xl w-full bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <SparklesIcon className="h-6 w-6 text-purple-500" />
              <Dialog.Title className="text-lg font-medium text-gray-900">
                Enriquecimiento con IA - {cliente.nombre}
              </Dialog.Title>
            </div>
            <Button variant="outline" onClick={onClose} className="p-2">
              <XMarkIcon className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-6">
            {!isLoading && !enrichmentData && !error && (
              <div className="text-center py-8">
                <SparklesIcon className="mx-auto h-16 w-16 text-purple-200 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  ¿Buscar información con IA?
                </h3>
                <p className="text-gray-500 mb-6">
                  Vamos a buscar información actualizada sobre {cliente.nombre} en internet
                  para completar los datos de contacto y presencia digital.
                </p>
                
                {/* Configuración de nivel de confianza con slider continuo */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Nivel de Confianza</h4>
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Mínimo (0.0)</span>
                        <div className="flex items-center space-x-2">
                          <span className={`text-lg ${getConfidenceColor(confidenceLevel)}`}>
                            {getConfidenceIcon(confidenceLevel)}
                          </span>
                          <span className="font-mono text-lg font-bold text-blue-600">
                            {confidenceLevel.toFixed(2)}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600">Máximo (1.0)</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={confidenceLevel}
                        onChange={(e) => setConfidenceLevel(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>🛡️ Conservador</span>
                        <span>⚖️ Balanceado</span>
                        <span>🚀 Agresivo</span>
                      </div>
                    </div>
                    <div className="text-center bg-white rounded-lg p-3 border">
                      <div className="font-medium text-gray-900 mb-1">
                        {getConfidenceIcon(confidenceLevel)} {getConfidenceCategory(confidenceLevel).charAt(0).toUpperCase() + getConfidenceCategory(confidenceLevel).slice(1)}
                        <span className="ml-2 font-mono text-blue-600">({confidenceLevel.toFixed(2)})</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {confidenceLevel < 0.4 ? 'Solo datos con alta certeza. Muchos nulls pero 100% precisos.' :
                         confidenceLevel < 0.7 ? 'Balance entre cantidad y precisión. Verificación moderada.' :
                         'Máximos datos posibles. Puede incluir información incierta.'}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Opción de búsqueda avanzada */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <h4 className="font-medium text-gray-900">Búsqueda Avanzada</h4>
                      <p className="text-sm text-gray-500">
                        Usa APIs reales de Google Places, Google Search y análisis de websites para obtener datos más precisos
                      </p>
                    </div>
                    <Toggle
                      enabled={useAdvancedSearch}
                      onChange={setUseAdvancedSearch}
                    />
                  </div>
                  {useAdvancedSearch && (
                    <div className="mt-3 text-xs text-blue-600">
                      ⚡ Búsqueda en tiempo real con Google Places API, Custom Search y verificación de websites
                    </div>
                  )}
                </div>
                
                <Button onClick={startEnrichment} className="px-8">
                  <SparklesIcon className="h-5 w-5 mr-2" />
                  {useAdvancedSearch ? 'Iniciar búsqueda avanzada' : 'Iniciar búsqueda'}
                </Button>
              </div>
            )}

            {isLoading && (
              <div className="text-center py-12">
                <ArrowPathIcon className="mx-auto h-12 w-12 text-purple-500 animate-spin mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Buscando información...
                </h3>
                <p className="text-gray-500">
                  La IA está analizando la web para encontrar datos actualizados
                </p>
              </div>
            )}

            {error && (
              <div className="text-center py-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">{error}</p>
                </div>
                <Button 
                  onClick={startEnrichment} 
                  variant="outline" 
                  className="mt-4"
                >
                  Reintentar
                </Button>
              </div>
            )}

            {enrichmentData && comparisons.length > 0 && (
              <div className="space-y-6">
                {/* Advertencia de baja confianza */}
                {enrichmentData.confidence !== undefined && enrichmentData.confidence < 0.5 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-3 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-medium text-yellow-800">
                          ⚠️ Confianza Baja ({Math.round((enrichmentData.confidence || 0) * 100)}%)
                        </h3>
                        <p className="text-sm text-yellow-700 mt-1">
                          Los datos encontrados podrían no ser 100% precisos. 
                          Verifica manualmente antes de guardar información crítica.
                        </p>
                        {enrichmentData.notas && (
                          <p className="text-xs text-yellow-600 mt-2">
                            <strong>Nota:</strong> {enrichmentData.notas}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Datos encontrados
                      </h3>
                      <p className="text-sm text-gray-500">
                        Confidence: {enrichmentData.confidence ? `${Math.round(enrichmentData.confidence * 100)}%` : 'N/A'} •
                        Fuentes: {Array.isArray(enrichmentData.fuentes) ? enrichmentData.fuentes.join(', ') : (enrichmentData.fuentes || 'Múltiples')}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={rejectAll}>
                        Rechazar todo
                      </Button>
                      <Button variant="outline" size="sm" onClick={acceptAll}>
                        Aceptar todo
                      </Button>
                    </div>
                  </div>
                  
                  {/* Slider de confidence editable y botón de re-buscar */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-blue-900 mb-2">Ajustar búsqueda</h4>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-4">
                            <span className="text-sm text-blue-800 w-16">Nivel:</span>
                            <div className="flex-1 max-w-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-blue-600">0.0</span>
                                <span className={`font-mono text-sm font-bold ${getConfidenceColor(confidenceLevel)}`}>
                                  {confidenceLevel.toFixed(2)}
                                </span>
                                <span className="text-xs text-blue-600">1.0</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={confidenceLevel}
                                onChange={(e) => setConfidenceLevel(parseFloat(e.target.value))}
                                className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer slider"
                                disabled={isLoading}
                              />
                              <div className="flex justify-between text-xs text-blue-600 mt-1">
                                <span className={`${confidenceLevel < 0.4 ? 'font-bold' : ''}`}>🛡️</span>
                                <span className={`${confidenceLevel >= 0.4 && confidenceLevel < 0.7 ? 'font-bold' : ''}`}>⚖️</span>
                                <span className={`${confidenceLevel >= 0.7 ? 'font-bold' : ''}`}>🚀</span>
                              </div>
                            </div>
                            <div className="text-sm font-medium text-blue-800 w-32">
                              {getConfidenceIcon(confidenceLevel)} {getConfidenceCategory(confidenceLevel)}
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="text-sm text-blue-800 w-16">Avanzada:</span>
                            <Toggle
                              enabled={useAdvancedSearch}
                              onChange={setUseAdvancedSearch}
                              disabled={isLoading}
                              size="sm"
                            />
                            <span className="text-sm text-blue-700">
                              {useAdvancedSearch ? 'APIs reales de Google' : 'Búsqueda básica'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        <Button
                          onClick={startEnrichment}
                          disabled={isLoading}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {isLoading ? (
                            <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <SparklesIcon className="h-4 w-4 mr-2" />
                          )}
                          {isLoading ? 'Buscando...' : 'Buscar otra vez'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  {comparisons.map((comp) => (
                    <div 
                      key={comp.field} 
                      className={`flex items-center justify-between p-3 bg-white rounded border ${
                        comp.isChanged ? 'border-blue-200' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-gray-700 w-24">
                            {comp.label}
                          </span>
                          <div className="flex items-center space-x-4">
                            <div className={`text-sm ${!comp.isChanged ? 'text-gray-400' : 'text-gray-600'}`}>
                              <span className="text-xs text-gray-400">Actual:</span> {formatValue(comp.current)}
                            </div>
                            <div className="text-gray-400">→</div>
                            <div className={`text-sm font-medium ${
                              comp.isChanged ? 'text-green-600' : 'text-gray-400'
                            }`}>
                              <span className="text-xs text-gray-400">Encontrado:</span> {formatValue(comp.found)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 flex items-center space-x-2">
                        <span className={`text-xs ${
                          comp.isChanged 
                            ? (comp.accept ? 'text-green-600' : 'text-gray-500') 
                            : 'text-gray-400'
                        }`}>
                          {comp.accept ? 'Aceptar' : 'Rechazar'}
                        </span>
                        <Toggle
                          enabled={comp.accept}
                          onChange={() => toggleAccept(comp.field)}
                          disabled={!comp.isChanged}
                          size="sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {enrichmentData && comparisons.length === 0 && (
              <div className="text-center py-8">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">
                    No se encontraron datos nuevos o diferentes a los que ya tienes.
                  </p>
                </div>
              </div>
            )}
          </div>

          {enrichmentData && comparisons.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                onClick={saveChanges}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? 'Guardando...' : `Guardar ${comparisons.filter(c => c.accept).length} cambios`}
              </Button>
            </div>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}