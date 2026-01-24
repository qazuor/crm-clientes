import { QuotaStatus } from '@/components/enrichment/QuotaStatus';
import { Button } from '@/components/ui/Button';

export default function EnrichmentAdminPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🔧 Administración de Enriquecimiento
              </h1>
              <p className="text-gray-600 mt-2">
                Monitoreo y gestión del sistema de enriquecimiento de datos
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center text-green-600 text-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Sistema Activo
              </div>
            </div>
          </div>
        </div>

        {/* Quota Status */}
        <div className="mb-8">
          <QuotaStatus />
        </div>

        {/* System Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* Services Overview */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              🚀 Servicios Disponibles
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                <span className="text-2xl">📸</span>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Screenshots</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Capturas de pantalla automáticas usando shot.screenshotapi.net
                  </p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>• Desktop (1920x1080) y Mobile (375x667)</div>
                    <div>• Formato PNG, full page</div>
                    <div>• Límite: 33 capturas/día</div>
                    <div>• Gratis, sin API key</div>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
                <span className="text-2xl">⚡</span>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">PageSpeed Insights</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Análisis de performance usando Google PageSpeed Insights
                  </p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>• Core Web Vitals (FCP, LCP, FID, CLS)</div>
                    <div>• Score mobile y desktop</div>
                    <div>• Límite: 800 análisis/día</div>
                    <div>• Gratis, sin API key</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Statistics */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              📊 Estadísticas de Uso
            </h3>
            
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Screenshots tomados hoy
                  </span>
                  <span className="text-lg font-bold text-blue-600">
                    0 / 33
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Análisis PageSpeed hoy
                  </span>
                  <span className="text-lg font-bold text-green-600">
                    0 / 800
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500 space-y-1">
                  <p><strong>Reset diario:</strong> Medianoche (00:00 UTC-3)</p>
                  <p><strong>Almacenamiento:</strong> Local (/public/screenshots)</p>
                  <p><strong>Base de datos:</strong> SQLite con campos JSON</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            🔍 Estado del Sistema
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-2">🟢</div>
              <div className="text-sm font-medium text-gray-900">API Screenshots</div>
              <div className="text-xs text-gray-500">shot.screenshotapi.net</div>
              <div className="text-xs text-green-600 mt-1">Operativo</div>
            </div>

            <div className="text-center">
              <div className="text-3xl mb-2">🟢</div>
              <div className="text-sm font-medium text-gray-900">PageSpeed API</div>
              <div className="text-xs text-gray-500">Google PageSpeed</div>
              <div className="text-xs text-green-600 mt-1">Operativo</div>
            </div>

            <div className="text-center">
              <div className="text-3xl mb-2">🟢</div>
              <div className="text-sm font-medium text-gray-900">Base de Datos</div>
              <div className="text-xs text-gray-500">SQLite + Prisma</div>
              <div className="text-xs text-green-600 mt-1">Conectada</div>
            </div>
          </div>
        </div>

        {/* Logs Panel */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              📋 Logs del Sistema
            </h3>
            <Button variant="outline" size="sm">
              🔄 Actualizar
            </Button>
          </div>
          
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
            <div>[{new Date().toISOString()}] Sistema de enriquecimiento iniciado</div>
            <div>[{new Date().toISOString()}] Quota manager: Límites diarios establecidos</div>
            <div>[{new Date().toISOString()}] Screenshot service: Directorio configurado</div>
            <div>[{new Date().toISOString()}] PageSpeed service: API conectada</div>
            <div>[{new Date().toISOString()}] ✅ Todos los servicios operativos</div>
          </div>
          
          <div className="mt-4 text-xs text-gray-500">
            Los logs se muestran en tiempo real. Los errores aparecen en rojo, las advertencias en amarillo.
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-blue-50 p-6 rounded-lg border-l-4 border-l-blue-500">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            🔧 Acciones Rápidas
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="text-left justify-start">
              🔄 Reset Quotas
            </Button>
            
            <Button variant="outline" className="text-left justify-start">
              🧹 Limpiar Screenshots
            </Button>
            
            <Button variant="outline" className="text-left justify-start">
              📊 Exportar Estadísticas
            </Button>
            
            <Button variant="outline" className="text-left justify-start">
              ⚙️ Configuración
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}