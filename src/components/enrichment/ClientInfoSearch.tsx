'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useAIEnrichment } from '@/hooks/useAIEnrichment';
import {
  MagnifyingGlassIcon,
  SparklesIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface Cliente {
  id: string;
  nombre: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  industria?: string;
  sitioWeb?: string;
}

interface ClientInfoSearchProps {
  cliente: Cliente;
}

export function ClientInfoSearch({ cliente }: ClientInfoSearchProps) {
  const [showDetails, setShowDetails] = useState(false);
  const {
    enrichment,
    isLoading,
    isEnriching,
    enrich,
    quickEnrich,
    enrichError,
    enrichResult,
  } = useAIEnrichment(cliente.id);

  // Auto-scroll cuando se accede desde un enlace con hash #enrichment
  useEffect(() => {
    if (window.location.hash === '#enrichment') {
      const timer = setTimeout(() => {
        const element = document.getElementById('client-info-search');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSearch = async () => {
    try {
      await enrich();
    } catch {
      // Error handled by hook
    }
  };

  const handleQuickSearch = async () => {
    try {
      await quickEnrich();
    } catch {
      // Error handled by hook
    }
  };

  const isProcessing = isLoading || isEnriching;

  return (
    <div id="client-info-search" className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <SparklesIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Enriquecimiento IA</h3>
            <p className="text-sm text-gray-500">
              Buscar y enriquecer datos del cliente usando inteligencia artificial
            </p>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={handleQuickSearch}
            disabled={isProcessing}
            variant="secondary"
          >
            {isProcessing ? (
              <div className="flex items-center space-x-2">
                <SparklesIcon className="h-4 w-4 animate-pulse" />
                <span>Procesando...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <MagnifyingGlassIcon className="h-4 w-4" />
                <span>Rapido</span>
              </div>
            )}
          </Button>
          <Button
            onClick={handleSearch}
            disabled={isProcessing}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isProcessing ? (
              <div className="flex items-center space-x-2">
                <SparklesIcon className="h-4 w-4 animate-pulse" />
                <span>Procesando...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <SparklesIcon className="h-4 w-4" />
                <span>Completo</span>
              </div>
            )}
          </Button>
        </div>
      </div>

      {/* Información del cliente */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Datos disponibles para la busqueda:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center space-x-2">
            <InformationCircleIcon className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Nombre:</span>
            <span className="font-medium">{cliente.nombre}</span>
          </div>
          {cliente.industria && (
            <div className="flex items-center space-x-2">
              <InformationCircleIcon className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Industria:</span>
              <span className="font-medium">{cliente.industria}</span>
            </div>
          )}
          {cliente.ciudad && (
            <div className="flex items-center space-x-2">
              <InformationCircleIcon className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Ciudad:</span>
              <span className="font-medium">{cliente.ciudad}</span>
            </div>
          )}
          {cliente.direccion && (
            <div className="flex items-center space-x-2">
              <InformationCircleIcon className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Direccion:</span>
              <span className="font-medium">{cliente.direccion}</span>
            </div>
          )}
        </div>
      </div>

      {/* Error display */}
      {enrichError && (
        <div className="mb-4 border border-red-200 bg-red-50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-red-900">Error en el enriquecimiento</h4>
              <p className="text-sm text-red-800 mt-1">
                {enrichError.message || 'No se pudo completar el enriquecimiento'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Provider errors */}
      {enrichResult?.errors && enrichResult.errors.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm font-medium text-yellow-800 mb-1">
            Algunos proveedores fallaron:
          </p>
          <ul className="text-sm text-yellow-600">
            {enrichResult.errors.map((err, i) => (
              <li key={i}>{err.provider}: {err.error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Resultados */}
      {enrichment && (
        <div className="space-y-4">
          <div className="border border-green-200 bg-green-50 rounded-lg p-4 max-h-[500px] overflow-y-auto">
            <div className="flex items-start space-x-3">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-green-900 mb-3">Informacion encontrada</h4>

                {/* Description */}
                {enrichment.description && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-medium text-gray-700">DESCRIPCION</h5>
                      {enrichment.descriptionScore && (
                        <ConfidenceBadge score={enrichment.descriptionScore} />
                      )}
                    </div>
                    <p className="text-sm text-gray-800">{enrichment.description}</p>
                  </div>
                )}

                {/* Website */}
                {enrichment.website && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-medium text-gray-700">SITIO WEB</h5>
                      {enrichment.websiteScore && (
                        <ConfidenceBadge score={enrichment.websiteScore} />
                      )}
                    </div>
                    <a
                      href={enrichment.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {enrichment.website}
                    </a>
                  </div>
                )}

                {/* Industry */}
                {enrichment.industry && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-medium text-gray-700">INDUSTRIA</h5>
                      {enrichment.industryScore && (
                        <ConfidenceBadge score={enrichment.industryScore} />
                      )}
                    </div>
                    <p className="text-sm text-gray-800">{enrichment.industry}</p>
                  </div>
                )}

                {/* Company Size */}
                {enrichment.companySize && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-xs font-medium text-gray-700">TAMANO</h5>
                      {enrichment.companySizeScore && (
                        <ConfidenceBadge score={enrichment.companySizeScore} />
                      )}
                    </div>
                    <p className="text-sm text-gray-800">{enrichment.companySize}</p>
                  </div>
                )}

                {/* Toggle for more details */}
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-sm text-purple-600 hover:underline mb-4"
                >
                  {showDetails ? 'Ocultar detalles' : 'Ver mas detalles'}
                </button>

                {showDetails && (
                  <>
                    {/* Emails */}
                    {enrichment.emails && enrichment.emails.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-xs font-medium text-gray-700 mb-2">EMAILS ENCONTRADOS</h5>
                        <ul className="space-y-1">
                          {enrichment.emails.map((email, index) => (
                            <li key={index} className="text-sm text-gray-800">
                              <a href={`mailto:${email.email}`} className="text-blue-600 hover:underline">
                                {email.email}
                              </a>
                              <span className="text-gray-500 ml-2">({email.type})</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Phones */}
                    {enrichment.phones && enrichment.phones.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-xs font-medium text-gray-700 mb-2">TELEFONOS ENCONTRADOS</h5>
                        <ul className="space-y-1">
                          {enrichment.phones.map((phone, index) => (
                            <li key={index} className="text-sm text-gray-800">
                              <a href={`tel:${phone.number}`} className="text-blue-600 hover:underline">
                                {phone.number}
                              </a>
                              <span className="text-gray-500 ml-2">({phone.type})</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Address */}
                    {enrichment.address && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-xs font-medium text-gray-700">DIRECCION</h5>
                          {enrichment.addressScore && (
                            <ConfidenceBadge score={enrichment.addressScore} />
                          )}
                        </div>
                        <p className="text-sm text-gray-800">{enrichment.address}</p>
                      </div>
                    )}

                    {/* Social Profiles */}
                    {enrichment.socialProfiles && Object.keys(enrichment.socialProfiles).length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-xs font-medium text-gray-700 mb-2">REDES SOCIALES</h5>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(enrichment.socialProfiles).map(([platform, url]) => (
                            <a
                              key={platform}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
                            >
                              {platform}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Metadata */}
                {enrichment.aiProvidersUsed && (
                  <div className="pt-4 border-t border-green-200">
                    <p className="text-xs text-gray-500">
                      Providers: {enrichment.aiProvidersUsed.join(', ')}
                    </p>
                    {enrichment.enrichedAt && (
                      <p className="text-xs text-gray-500">
                        Actualizado: {new Date(enrichment.enrichedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No data yet */}
      {!enrichment && !enrichError && !isProcessing && (
        <div className="text-center py-8">
          <SparklesIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Sin datos de enriquecimiento</h3>
          <p className="mt-1 text-sm text-gray-500">
            Haz clic en &quot;Rapido&quot; o &quot;Completo&quot; para enriquecer este cliente con IA.
          </p>
        </div>
      )}

      {/* Información sobre el servicio */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900">Acerca de esta funcionalidad</h4>
            <p className="text-sm text-blue-800 mt-1">
              Esta herramienta utiliza inteligencia artificial (OpenAI, Gemini, Grok, DeepSeek) para
              buscar y validar informacion publica sobre el cliente. Los resultados se guardan
              automaticamente y se muestran con nivel de confianza.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ConfidenceBadgeProps {
  score: number;
  showLabel?: boolean;
}

function ConfidenceBadge({ score, showLabel = true }: ConfidenceBadgeProps) {
  const percentage = Math.round(score * 100);

  let colorClass = 'bg-red-100 text-red-800 border-red-300';
  let label = 'Baja';
  let icon = '!';

  if (score >= 0.8) {
    colorClass = 'bg-green-100 text-green-800 border-green-300';
    label = 'Alta';
    icon = '✓';
  } else if (score >= 0.6) {
    colorClass = 'bg-yellow-100 text-yellow-800 border-yellow-300';
    label = 'Media';
    icon = '~';
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border ${colorClass}`}
      title={`Confianza: ${percentage}% - ${label}`}
    >
      <span className="font-bold">{icon}</span>
      <span>{percentage}%</span>
      {showLabel && <span className="hidden sm:inline">({label})</span>}
    </span>
  );
}