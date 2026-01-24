'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface QuotaInfo {
  service: string;
  used: number;
  limit: number;
  available: number;
  percentage: number;
  resetIn: string;
}

const SERVICE_LABELS = {
  screenshots: 'Screenshots',
  pagespeed: 'PageSpeed',
  serpapi: 'SerpAPI',
  builtwith: 'BuiltWith'
};

const SERVICE_ICONS = {
  screenshots: '📸',
  pagespeed: '⚡',
  serpapi: '🔍',
  builtwith: '🔧'
};

export function QuotaStatus() {
  const [quotas, setQuotas] = useState<QuotaInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const fetchQuotas = async () => {
    try {
      const response = await fetch('/api/quotas');
      const result = await response.json();
      
      if (result.success) {
        setQuotas(result.data);
        setLastUpdate(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Error fetching quotas:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetQuotas = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/quotas', { method: 'POST' });
      const result = await response.json();
      
      if (result.success) {
        await fetchQuotas();
      }
    } catch (error) {
      console.error('Error resetting quotas:', error);
    }
  };

  useEffect(() => {
    fetchQuotas();
    
    // Auto-refresh cada 5 minutos
    const interval = setInterval(fetchQuotas, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    if (percentage >= 50) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getStatusText = (percentage: number) => {
    if (percentage >= 90) return 'Crítico';
    if (percentage >= 70) return 'Alto';
    if (percentage >= 50) return 'Medio';
    return 'Normal';
  };

  if (loading && quotas.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-8 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Estado de Quotas APIs
          </h3>
          {lastUpdate && (
            <p className="text-sm text-gray-500 mt-1">
              Última actualización: {lastUpdate}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={fetchQuotas} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            {loading ? '...' : '🔄 Actualizar'}
          </Button>
          <Button 
            onClick={resetQuotas} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            🔄 Reset
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {quotas.map((quota) => {
          const serviceName = quota.service as keyof typeof SERVICE_LABELS;
          const label = SERVICE_LABELS[serviceName] || quota.service;
          const icon = SERVICE_ICONS[serviceName] || '📊';
          const statusColor = getStatusColor(quota.percentage);
          const statusText = getStatusText(quota.percentage);
          
          return (
            <div key={quota.service} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{icon}</span>
                  <span className="font-medium text-gray-900">{label}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    quota.percentage >= 90 ? 'bg-red-100 text-red-800' :
                    quota.percentage >= 70 ? 'bg-yellow-100 text-yellow-800' :
                    quota.percentage >= 50 ? 'bg-orange-100 text-orange-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {statusText}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {quota.used} / {quota.limit}
                  </div>
                  <div className="text-xs text-gray-500">
                    {quota.available} disponibles
                  </div>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`${statusColor} h-2 rounded-full transition-all duration-300`}
                  style={{ width: `${Math.min(quota.percentage, 100)}%` }}
                />
              </div>
              
              <div className="flex justify-between text-xs text-gray-500">
                <span>{quota.percentage.toFixed(1)}% utilizado</span>
                <span>Reset en: {quota.resetIn}</span>
              </div>
            </div>
          );
        })}
      </div>

      {quotas.length === 0 && !loading && (
        <div className="text-center text-gray-500 py-8">
          No se pudieron cargar las quotas
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Límites diarios:</strong> Basados en quotas mensuales gratuitas</p>
          <p><strong>Reset automático:</strong> Medianoche cada día</p>
          <p><strong>Estado:</strong> 🟢 Normal (0-50%) • 🟡 Medio (50-70%) • 🟠 Alto (70-90%) • 🔴 Crítico (90%+)</p>
        </div>
      </div>
    </div>
  );
}