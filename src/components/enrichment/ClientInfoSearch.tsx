'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
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

interface SearchResult {
  success: boolean;
  data?: {
    informacionGeneral?: string;
    contactosEncontrados?: string[];
    redesSocialesEncontradas?: string[];
    sitioWebEncontrado?: string;
    observaciones?: string;
  };
  error?: string;
}

interface ClientInfoSearchProps {
  cliente: Cliente;
}

export function ClientInfoSearch({ cliente }: ClientInfoSearchProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

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
    setIsLoading(true);
    setSearchResult(null);

    try {
      // TODO: Implementar llamada a API de OpenAI para buscar información
      // Por ahora simulamos una búsqueda
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockResult: SearchResult = {
        success: true,
        data: {
          informacionGeneral: `Se encontró información sobre ${cliente.nombre}, empresa del rubro ${cliente.industria || 'no especificado'}. Ubicada en ${cliente.ciudad || 'ubicación no especificada'}.`,
          contactosEncontrados: [
            cliente.email ? `Email confirmado: ${cliente.email}` : undefined,
            cliente.telefono ? `Teléfono confirmado: ${cliente.telefono}` : undefined,
            'Email adicional encontrado: info@empresa.com'
          ].filter((item): item is string => Boolean(item)),
          redesSocialesEncontradas: [
            'Instagram: @empresa_oficial',
            'Facebook: /empresa.oficial',
            'LinkedIn: /company/empresa'
          ],
          sitioWebEncontrado: cliente.sitioWeb || 'www.empresa-encontrada.com',
          observaciones: 'Empresa activa en redes sociales con presencia digital moderada.'
        }
      };

      setSearchResult(mockResult);
    } catch (error) {
      setSearchResult({
        success: false,
        error: 'Error al buscar información del cliente'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="client-info-search" className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <MagnifyingGlassIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Búsqueda de Información (IA)</h3>
            <p className="text-sm text-gray-500">
              Buscar información adicional del cliente usando inteligencia artificial
            </p>
          </div>
        </div>
        
        <Button
          onClick={handleSearch}
          disabled={isLoading}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <SparklesIcon className="h-4 w-4 animate-pulse" />
              <span>Buscando...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <MagnifyingGlassIcon className="h-4 w-4" />
              <span>Buscar Info</span>
            </div>
          )}
        </Button>
      </div>

      {/* Información del cliente */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Datos disponibles para la búsqueda:</h4>
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
              <span className="text-gray-600">Dirección:</span>
              <span className="font-medium">{cliente.direccion}</span>
            </div>
          )}
        </div>
      </div>

      {/* Resultados */}
      {searchResult && (
        <div className="space-y-4">
          {searchResult.success ? (
            <div className="border border-green-200 bg-green-50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-green-900 mb-3">Información encontrada</h4>
                  
                  {searchResult.data?.informacionGeneral && (
                    <div className="mb-4">
                      <h5 className="text-xs font-medium text-gray-700 mb-2">INFORMACIÓN GENERAL</h5>
                      <p className="text-sm text-gray-800">{searchResult.data.informacionGeneral}</p>
                    </div>
                  )}

                  {searchResult.data?.contactosEncontrados && searchResult.data.contactosEncontrados.length > 0 && (
                    <div className="mb-4">
                      <h5 className="text-xs font-medium text-gray-700 mb-2">CONTACTOS ENCONTRADOS</h5>
                      <ul className="space-y-1">
                        {searchResult.data.contactosEncontrados.map((contacto, index) => (
                          <li key={index} className="text-sm text-gray-800">• {contacto}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {searchResult.data?.redesSocialesEncontradas && searchResult.data.redesSocialesEncontradas.length > 0 && (
                    <div className="mb-4">
                      <h5 className="text-xs font-medium text-gray-700 mb-2">REDES SOCIALES</h5>
                      <ul className="space-y-1">
                        {searchResult.data.redesSocialesEncontradas.map((red, index) => (
                          <li key={index} className="text-sm text-gray-800">• {red}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {searchResult.data?.sitioWebEncontrado && (
                    <div className="mb-4">
                      <h5 className="text-xs font-medium text-gray-700 mb-2">SITIO WEB</h5>
                      <p className="text-sm text-gray-800">• {searchResult.data.sitioWebEncontrado}</p>
                    </div>
                  )}

                  {searchResult.data?.observaciones && (
                    <div>
                      <h5 className="text-xs font-medium text-gray-700 mb-2">OBSERVACIONES</h5>
                      <p className="text-sm text-gray-800">{searchResult.data.observaciones}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-red-200 bg-red-50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-red-900">Error en la búsqueda</h4>
                  <p className="text-sm text-red-800 mt-1">
                    {searchResult.error || 'No se pudo completar la búsqueda'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Información sobre el servicio */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900">Acerca de esta funcionalidad</h4>
            <p className="text-sm text-blue-800 mt-1">
              Esta herramienta utiliza inteligencia artificial para buscar información pública disponible 
              sobre el cliente en internet, incluyendo contactos, redes sociales y presencia digital.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}