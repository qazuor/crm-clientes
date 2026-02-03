'use client';

import { useState, useEffect, useMemo } from 'react';
import { CheckCircleIcon, XCircleIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import type { ApiKeyResponse, ApiKeyProvider, AIProvider } from '@/types/enrichment';
import { PROVIDER_INFO, AI_PROVIDER_MODELS } from '@/types/enrichment';
import { useApiKeys, useCreateApiKey, useUpdateApiKey, useDeleteApiKey } from '@/hooks/useApiKeys';

// Provider row component
function ProviderRow({
  provider,
  info,
  existingKey,
  onSave,
  onDelete,
  isSaving,
}: {
  provider: ApiKeyProvider;
  info: { name: string; description: string; category: 'ai' | 'external' };
  existingKey?: ApiKeyResponse;
  onSave: (provider: ApiKeyProvider, apiKey: string, model?: string, enabled?: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isSaving: boolean;
}) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [enabled, setEnabled] = useState(existingKey?.enabled ?? true);
  const [showKey, setShowKey] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [localSaving, setLocalSaving] = useState(false);

  const isAI = info.category === 'ai';
  const availableModels = useMemo(
    () => (isAI ? AI_PROVIDER_MODELS[provider as AIProvider] : []),
    [isAI, provider]
  );

  // Initialize model from existing key or default
  useEffect(() => {
    if (existingKey?.model) {
      setModel(existingKey.model);
    } else if (isAI && availableModels.length > 0) {
      setModel(availableModels[0]);
    }
  }, [existingKey, isAI, availableModels]);

  // Track enabled changes
  useEffect(() => {
    if (existingKey && enabled !== existingKey.enabled) {
      setIsDirty(true);
    }
  }, [enabled, existingKey]);

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    setRevealedKey(null); // Clear revealed key when user types
    setIsDirty(value.length > 0 || !!(existingKey && enabled !== existingKey.enabled));
  };

  const handleToggleShowKey = async () => {
    if (showKey) {
      // Hiding the key
      setShowKey(false);
      setRevealedKey(null);
      return;
    }

    // If there's text in the input, just toggle visibility
    if (apiKey) {
      setShowKey(true);
      return;
    }

    // If there's an existing key, fetch the real value
    if (existingKey) {
      setIsRevealing(true);
      try {
        const response = await fetch(`/api/admin/api-keys/${existingKey.id}/reveal`);
        const data = await response.json();
        if (data.success && data.data?.apiKey) {
          setRevealedKey(data.data.apiKey);
          setShowKey(true);
        }
      } catch (error) {
        console.error('Error revealing key:', error);
      } finally {
        setIsRevealing(false);
      }
    } else {
      setShowKey(true);
    }
  };

  const handleModelChange = (value: string) => {
    setModel(value);
    if (existingKey) {
      setIsDirty(true);
    }
  };

  const handleSave = async () => {
    if (!apiKey && !existingKey) return;

    setLocalSaving(true);
    try {
      await onSave(provider, apiKey || '', isAI ? model : undefined, enabled);
      setApiKey('');
      setIsDirty(false);
    } finally {
      setLocalSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingKey) return;
    if (!confirm(`¿Eliminar la API key de ${info.name}?`)) return;

    setLocalSaving(true);
    try {
      await onDelete(existingKey.id);
    } finally {
      setLocalSaving(false);
    }
  };

  const isConfigured = !!existingKey;
  const showSaveButton = isDirty || (!isConfigured && apiKey.length > 0);

  return (
    <div className={`p-4 rounded-lg border ${isConfigured ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-start gap-4">
        {/* Status indicator */}
        <div className="pt-1">
          {isConfigured ? (
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
          ) : (
            <XCircleIcon className="h-5 w-5 text-gray-400" />
          )}
        </div>

        {/* Provider info and inputs */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-gray-900">{info.name}</h4>
            {isConfigured && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                existingKey.enabled
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {existingKey.enabled ? 'Activa' : 'Desactivada'}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-3">{info.description}</p>

          <div className="flex flex-wrap items-end gap-3">
            {/* API Key input */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                API Key {isConfigured && '(dejar vacío para mantener)'}
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey || (showKey && revealedKey ? revealedKey : '')}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder={isConfigured ? existingKey.maskedKey : 'Ingresa tu API key...'}
                  readOnly={showKey && !!revealedKey && !apiKey}
                  className={`w-full rounded-md border border-gray-300 py-2 px-3 pr-10 text-sm font-mono text-gray-900 bg-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                             placeholder:text-gray-400 ${showKey && revealedKey && !apiKey ? 'bg-gray-50' : ''}`}
                />
                <button
                  type="button"
                  onClick={handleToggleShowKey}
                  disabled={isRevealing}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  {isRevealing ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                  ) : showKey ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Model selector for AI providers */}
            {isAI && availableModels.length > 0 && (
              <div className="w-48">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Modelo
                </label>
                <select
                  value={model}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm text-gray-900 bg-white
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {availableModels.map((m) => (
                    <option key={m} value={m} className="text-gray-900">
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Enable/disable toggle for existing keys */}
            {isConfigured && (
              <div className="flex items-center gap-2">
                <label className="block text-xs font-medium text-gray-600">
                  Habilitada
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setEnabled(!enabled);
                    setIsDirty(true);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    enabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              {showSaveButton && (
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={localSaving || isSaving || (!apiKey && !existingKey)}
                >
                  {localSaving ? 'Guardando...' : isConfigured ? 'Actualizar' : 'Guardar'}
                </Button>
              )}
              {isConfigured && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={localSaving || isSaving}
                >
                  Eliminar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ApiKeyList() {
  const { data: apiKeys, isLoading, error } = useApiKeys();
  const { mutateAsync: createKey, isPending: isCreating } = useCreateApiKey();
  const { mutateAsync: updateKey, isPending: isUpdating } = useUpdateApiKey();
  const { mutateAsync: deleteKey, isPending: isDeleting } = useDeleteApiKey();
  const [filter, setFilter] = useState<'all' | 'ai' | 'external'>('all');

  const isSaving = isCreating || isUpdating || isDeleting;

  // Get existing key by provider
  const getExistingKey = (provider: ApiKeyProvider): ApiKeyResponse | undefined => {
    return apiKeys?.find((k) => k.provider === provider);
  };

  // Handle save (create or update)
  const handleSave = async (
    provider: ApiKeyProvider,
    apiKey: string,
    model?: string,
    enabled?: boolean
  ) => {
    const existingKey = getExistingKey(provider);

    if (existingKey) {
      // Update existing
      await updateKey({
        id: existingKey.id,
        dto: {
          ...(apiKey && { apiKey }),
          ...(model !== undefined && { model }),
          ...(enabled !== undefined && { enabled }),
        },
      });
    } else {
      // Create new
      await createKey({
        provider,
        apiKey,
        ...(model && { model }),
      });
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    await deleteKey(id);
  };

  // Group providers by category
  const aiProviders = Object.entries(PROVIDER_INFO)
    .filter(([, info]) => info.category === 'ai')
    .sort((a, b) => a[1].name.localeCompare(b[1].name));

  const externalProviders = Object.entries(PROVIDER_INFO)
    .filter(([, info]) => info.category === 'external')
    .sort((a, b) => a[1].name.localeCompare(b[1].name));

  // Count configured keys
  const configuredAI = apiKeys?.filter(
    (k) => PROVIDER_INFO[k.provider as ApiKeyProvider]?.category === 'ai'
  ).length ?? 0;
  const configuredExternal = apiKeys?.filter(
    (k) => PROVIDER_INFO[k.provider as ApiKeyProvider]?.category === 'external'
  ).length ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error al cargar las API keys</p>
        <p className="text-sm text-gray-500 mt-1">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Configuracion de API Keys</h2>
        <p className="text-sm text-gray-500">
          Configura las claves de acceso para los servicios de enriquecimiento. Las keys se almacenan encriptadas.
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-600">
          <span className="font-medium text-green-600">{configuredAI}</span> de {aiProviders.length} proveedores IA configurados
        </span>
        <span className="text-gray-400">|</span>
        <span className="text-gray-600">
          <span className="font-medium text-green-600">{configuredExternal}</span> de {externalProviders.length} APIs externas configuradas
        </span>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { value: 'all', label: 'Todas' },
          { value: 'ai', label: `IA (${aiProviders.length})` },
          { value: 'external', label: `Externas (${externalProviders.length})` },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value as 'all' | 'ai' | 'external')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === opt.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* AI Providers */}
      {(filter === 'all' || filter === 'ai') && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Proveedores de IA
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            Estos proveedores se usan para el enriquecimiento inteligente de clientes. Configura al menos uno.
          </p>
          <div className="space-y-3">
            {aiProviders.map(([provider, info]) => (
              <ProviderRow
                key={provider}
                provider={provider as ApiKeyProvider}
                info={info}
                existingKey={getExistingKey(provider as ApiKeyProvider)}
                onSave={handleSave}
                onDelete={handleDelete}
                isSaving={isSaving}
              />
            ))}
          </div>
        </div>
      )}

      {/* External APIs */}
      {(filter === 'all' || filter === 'external') && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            APIs Externas
          </h3>
          <p className="text-xs text-gray-400 mb-4">
            APIs opcionales para obtener datos adicionales como capturas de pantalla, verificacion de emails, etc.
          </p>
          <div className="space-y-3">
            {externalProviders.map(([provider, info]) => (
              <ProviderRow
                key={provider}
                provider={provider as ApiKeyProvider}
                info={info}
                existingKey={getExistingKey(provider as ApiKeyProvider)}
                onSave={handleSave}
                onDelete={handleDelete}
                isSaving={isSaving}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
