'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface Cliente {
  id: string;
  nombre: string;
  website?: string;
  screenshotDesktop?: string;
  screenshotMobile?: string;
  pageSpeedScore?: number;
  lastEnrichment?: Date;
}

interface ServiceResult {
  success: boolean;
  [key: string]: unknown;
}

interface EnrichmentResult {
  success: boolean;
  data?: {
    services?: Record<string, ServiceResult>;
    [key: string]: unknown;
  };
  error?: string;
}

interface EnrichmentPanelProps {
  cliente: Cliente;
  onEnrichmentComplete?: (result: EnrichmentResult) => void;
}

export function EnrichmentPanel({ cliente, onEnrichmentComplete }: EnrichmentPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<EnrichmentResult | null>(null);
  const [selectedServices, setSelectedServices] = useState(['screenshots', 'pagespeed']);

  // Auto-scroll cuando se accede desde un enlace con hash #web-analysis
  useEffect(() => {
    if (window.location.hash === '#web-analysis') {
      const timer = setTimeout(() => {
        const element = document.getElementById('enrichment-panel');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const canEnrich = cliente.website && cliente.website.trim().length > 0;

  const handleEnrich = async () => {
    if (!canEnrich || isLoading) return;

    setIsLoading(true);
    setLastResult(null);

    try {
      const response = await fetch('/api/enrichment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clienteId: cliente.id,
          services: selectedServices
        })
      });

      const result = await response.json();
      
      setLastResult(result);
      
      if (onEnrichmentComplete) {
        onEnrichmentComplete(result);
      }

    } catch (error) {
      console.error('Error en enriquecimiento:', error);
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
      setLastResult(errorResult);
      
      if (onEnrichmentComplete) {
        onEnrichmentComplete(errorResult);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getEnrichmentStatus = () => {
    const hasScreenshots = !!(cliente.screenshotDesktop || cliente.screenshotMobile);
    const hasPageSpeed = !!(cliente.pageSpeedScore && cliente.pageSpeedScore > 0);
    const lastEnrichment = cliente.lastEnrichment;

    return {
      hasScreenshots,
      hasPageSpeed,
      lastEnrichment,
      isEnriched: hasScreenshots || hasPageSpeed
    };
  };

  const status = getEnrichmentStatus();

  return (
    <div id="enrichment-panel" className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Análisis de Sitio Web
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Capturas de pantalla, PageSpeed y análisis técnico del sitio web
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {status.isEnriched && (
            <div className="flex items-center text-green-600 text-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Enriquecido
            </div>
          )}
          
          {!canEnrich && (
            <div className="flex items-center text-orange-600 text-sm">
              <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
              Sin website
            </div>
          )}
        </div>
      </div>

      {/* Website Info */}
      <div className="mb-6">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Website:</span>
          {cliente.website ? (
            <a 
              href={cliente.website.startsWith('http') ? cliente.website : `https://${cliente.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 underline text-sm"
            >
              {cliente.website}
            </a>
          ) : (
            <span className="text-gray-500 text-sm italic">No configurado</span>
          )}
        </div>
        
        {status.lastEnrichment && (
          <div className="text-xs text-gray-500 mt-1">
            Último enriquecimiento: {new Date(status.lastEnrichment).toLocaleString('es')}
          </div>
        )}
      </div>

      {/* Service Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Servicios de enriquecimiento:
        </label>
        
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={selectedServices.includes('screenshots')}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedServices([...selectedServices, 'screenshots']);
                } else {
                  setSelectedServices(selectedServices.filter(s => s !== 'screenshots'));
                }
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              📸 Screenshots (Desktop + Mobile)
              {status.hasScreenshots && (
                <span className="ml-2 text-green-600">✓</span>
              )}
            </span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={selectedServices.includes('pagespeed')}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedServices([...selectedServices, 'pagespeed']);
                } else {
                  setSelectedServices(selectedServices.filter(s => s !== 'pagespeed'));
                }
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              ⚡ Google PageSpeed Insights
              {status.hasPageSpeed && (
                <span className="ml-2 text-green-600">✓</span>
              )}
            </span>
          </label>
        </div>
      </div>

      {/* Current Data Display */}
      {status.isEnriched && (
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Datos actuales:</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Screenshots */}
            {status.hasScreenshots && (
              <div>
                <h5 className="text-xs font-medium text-gray-700 mb-2">📸 Screenshots:</h5>
                <div className="space-y-1">
                  {cliente.screenshotDesktop && (
                    <div className="flex items-center text-xs text-gray-600">
                      <span>🖥️ Desktop: </span>
                      <a 
                        href={`/screenshots/${cliente.screenshotDesktop}`}
                        target="_blank"
                        className="ml-1 text-blue-600 hover:underline"
                      >
                        Ver
                      </a>
                    </div>
                  )}
                  {cliente.screenshotMobile && (
                    <div className="flex items-center text-xs text-gray-600">
                      <span>📱 Mobile: </span>
                      <a 
                        href={`/screenshots/${cliente.screenshotMobile}`}
                        target="_blank"
                        className="ml-1 text-blue-600 hover:underline"
                      >
                        Ver
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PageSpeed */}
            {status.hasPageSpeed && (
              <div>
                <h5 className="text-xs font-medium text-gray-700 mb-2">⚡ PageSpeed:</h5>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {cliente.pageSpeedScore}
                  </span>
                  <div>
                    <div className={`text-xs font-medium ${
                      (cliente.pageSpeedScore || 0) >= 90 ? 'text-green-600' :
                      (cliente.pageSpeedScore || 0) >= 70 ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {(cliente.pageSpeedScore || 0) >= 90 ? 'Excelente' :
                       (cliente.pageSpeedScore || 0) >= 70 ? 'Bueno' :
                       (cliente.pageSpeedScore || 0) >= 50 ? 'Regular' : 'Pobre'}
                    </div>
                    <div className="text-xs text-gray-500">Score promedio</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="space-y-4">
        <Button
          onClick={handleEnrich}
          disabled={!canEnrich || isLoading || selectedServices.length === 0}
          className="w-full"
          variant={status.isEnriched ? "outline" : "default"}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Enriqueciendo datos...
            </div>
          ) : status.isEnriched ? (
            '🔄 Actualizar datos'
          ) : (
            '🚀 Enriquecer datos'
          )}
        </Button>

        {!canEnrich && (
          <p className="text-sm text-gray-500 text-center">
            Agrega un website al cliente para habilitar el enriquecimiento
          </p>
        )}

        {selectedServices.length === 0 && canEnrich && (
          <p className="text-sm text-orange-600 text-center">
            Selecciona al menos un servicio para continuar
          </p>
        )}
      </div>

      {/* Result Display */}
      {lastResult && (
        <div className="mt-6 p-4 rounded-lg border-l-4 border-l-gray-300">
          {lastResult.success ? (
            <div className="border-l-green-500">
              <div className="flex items-center mb-2">
                <span className="text-green-600 text-lg mr-2">✅</span>
                <span className="font-medium text-green-800">
                  Enriquecimiento completado
                </span>
              </div>
              
              {lastResult.data?.services && (
                <div className="space-y-2 text-sm">
                  {Object.entries(lastResult.data.services).map(([service, result]) => (
                    <div key={service} className="flex items-center justify-between">
                      <span className="text-gray-700 capitalize">
                        {service === 'screenshots' ? '📸 Screenshots' : '⚡ PageSpeed'}:
                      </span>
                      <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                        {result.success ? 'OK' : 'Error'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="border-l-red-500">
              <div className="flex items-center mb-2">
                <span className="text-red-600 text-lg mr-2">❌</span>
                <span className="font-medium text-red-800">
                  Error en enriquecimiento
                </span>
              </div>
              <p className="text-red-700 text-sm">{lastResult.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}