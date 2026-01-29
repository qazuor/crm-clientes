'use client';

import { useState } from 'react';
import { ArrowPathIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { Slider } from '@/components/ui/Slider';
import { Tabs, TabContent } from '@/components/ui/Tabs';
import {
  useEnrichmentSettings,
  useUpdateEnrichmentSettings,
  useResetEnrichmentSettings,
} from '@/hooks/useEnrichmentSettings';
import type { MatchMode } from '@/types/enrichment';

const matchModeOptions: { value: MatchMode; label: string; description: string }[] = [
  {
    value: 'exact',
    label: 'Exacto',
    description: 'Solo coincidencias precisas',
  },
  {
    value: 'fuzzy',
    label: 'Difuso',
    description: 'Permite variaciones menores',
  },
  {
    value: 'broad',
    label: 'Amplio',
    description: 'Coincidencias aproximadas',
  },
];

const analysisToggles = [
  {
    key: 'enableScreenshots',
    label: 'Screenshots',
    description: 'Capturar capturas de pantalla del sitio web',
  },
  {
    key: 'enablePageSpeed',
    label: 'PageSpeed',
    description: 'Analizar rendimiento con Google PageSpeed',
  },
  {
    key: 'enableSsl',
    label: 'SSL/TLS',
    description: 'Verificar certificado SSL y seguridad',
  },
  {
    key: 'enableTechStack',
    label: 'Tech Stack',
    description: 'Detectar tecnologías utilizadas',
  },
  {
    key: 'enableSeo',
    label: 'SEO',
    description: 'Analizar meta tags y optimización',
  },
  {
    key: 'enableAccessibility',
    label: 'Accesibilidad',
    description: 'Verificar estándares de accesibilidad',
  },
  {
    key: 'enableSecurity',
    label: 'Seguridad',
    description: 'Analizar headers y configuración de seguridad',
  },
  {
    key: 'enableCrawlability',
    label: 'Crawlability',
    description: 'Verificar robots.txt y sitemap',
  },
] as const;

export function EnrichmentSettingsForm() {
  const { data: settings, isLoading, error } = useEnrichmentSettings();
  const { mutateAsync: updateSettings, isPending: isUpdating } = useUpdateEnrichmentSettings();
  const { mutateAsync: resetSettings, isPending: isResetting } = useResetEnrichmentSettings();

  const [activeTab, setActiveTab] = useState('ai');

  const handleUpdate = async (key: string, value: number | string | boolean) => {
    try {
      await updateSettings({ [key]: value });
    } catch (err) {
      console.error('Error updating setting:', err);
    }
  };

  const handleReset = async () => {
    if (!confirm('¿Restaurar todos los valores a su configuración por defecto?')) return;
    try {
      await resetSettings();
    } catch (err) {
      console.error('Error resetting settings:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error al cargar la configuración</p>
        <p className="text-sm text-gray-500 mt-1">
          {error?.message ?? 'No se pudo cargar la configuración'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Configuración de Enriquecimiento
          </h2>
          <p className="text-sm text-gray-500">
            Ajusta los parámetros de IA y análisis de sitios web
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={handleReset}
          disabled={isResetting}
        >
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          {isResetting ? 'Restaurando...' : 'Restaurar Defaults'}
        </Button>
      </div>

      <Tabs
        tabs={[
          { value: 'ai', label: 'Parámetros IA' },
          { value: 'analysis', label: 'Análisis de Sitios' },
        ]}
        value={activeTab}
        onValueChange={setActiveTab}
      >
        {/* AI Parameters Tab */}
        <TabContent value="ai">
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            {/* Temperature */}
            <div>
              <Slider
                label="Temperature"
                value={[settings.temperature]}
                onValueChange={([v]) => handleUpdate('temperature', v)}
                min={0}
                max={2}
                step={0.1}
                formatValue={(v) => v.toFixed(1)}
              />
              <p className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                <InformationCircleIcon className="h-4 w-4 flex-shrink-0" />
                Valores bajos producen respuestas más deterministas, valores altos
                más creatividad.
              </p>
            </div>

            {/* Top P */}
            <div>
              <Slider
                label="Top P"
                value={[settings.topP]}
                onValueChange={([v]) => handleUpdate('topP', v)}
                min={0}
                max={1}
                step={0.05}
                formatValue={(v) => v.toFixed(2)}
              />
              <p className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                <InformationCircleIcon className="h-4 w-4 flex-shrink-0" />
                Controla la diversidad de tokens considerados. 0.9 significa que
                considera el 90% superior.
              </p>
            </div>

            {/* Match Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modo de Coincidencia
              </label>
              <div className="flex gap-2">
                {matchModeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleUpdate('matchMode', opt.value)}
                    disabled={isUpdating}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 text-left transition-all ${
                      settings.matchMode === opt.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">{opt.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {opt.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Min Confidence Score */}
            <div>
              <Slider
                label="Score Mínimo de Confianza"
                value={[settings.minConfidenceScore]}
                onValueChange={([v]) => handleUpdate('minConfidenceScore', v)}
                min={0}
                max={1}
                step={0.05}
                formatValue={(v) => `${(v * 100).toFixed(0)}%`}
              />
              <p className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                <InformationCircleIcon className="h-4 w-4 flex-shrink-0" />
                Resultados con score menor a este valor no serán considerados.
              </p>
            </div>

            {/* Max Results Per Field */}
            <div>
              <Slider
                label="Máximo Resultados por Campo"
                value={[settings.maxResultsPerField]}
                onValueChange={([v]) => handleUpdate('maxResultsPerField', v)}
                min={1}
                max={10}
                step={1}
                formatValue={(v) => v.toString()}
              />
            </div>

            {/* Require Verification */}
            <div className="flex items-center justify-between py-3 border-t border-gray-100">
              <div>
                <div className="font-medium text-sm text-gray-900">
                  Requerir Verificación
                </div>
                <div className="text-xs text-gray-500">
                  Los resultados deben ser verificados por múltiples fuentes
                </div>
              </div>
              <Toggle
                enabled={settings.requireVerification}
                onChange={(enabled) =>
                  handleUpdate('requireVerification', enabled)
                }
              />
            </div>
          </div>
        </TabContent>

        {/* Website Analysis Tab */}
        <TabContent value="analysis">
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {analysisToggles.map((toggle) => (
              <div
                key={toggle.key}
                className="flex items-center justify-between px-6 py-4"
              >
                <div>
                  <div className="font-medium text-sm text-gray-900">
                    {toggle.label}
                  </div>
                  <div className="text-xs text-gray-500">{toggle.description}</div>
                </div>
                <Toggle
                  enabled={settings[toggle.key]}
                  onChange={(enabled) => handleUpdate(toggle.key, enabled)}
                />
              </div>
            ))}
          </div>
        </TabContent>
      </Tabs>

      {/* Last Updated */}
      <div className="text-xs text-gray-400 text-right">
        Última actualización:{' '}
        {new Date(settings.updatedAt).toLocaleString('es-ES')}
      </div>
    </div>
  );
}
