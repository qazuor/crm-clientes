'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import * as Tabs from '@radix-ui/react-tabs';
import { EnvelopeIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface BulkContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteIds: string[];
  onSuccess?: () => void;
}

interface Plantilla {
  id: string;
  nombre: string;
  canal: 'EMAIL' | 'WHATSAPP';
  asunto: string | null;
  cuerpo: string;
}

interface BulkEmailResult {
  total: number;
  successful: number;
  failed: number;
  details: Array<{
    clienteId: string;
    nombre: string;
    success: boolean;
    error?: string;
  }>;
}

interface BulkWhatsAppItem {
  clienteId: string;
  nombre: string;
  url: string;
  mensajeId: string;
}

interface BulkWhatsAppResult {
  items: BulkWhatsAppItem[];
  errors: Array<{
    clienteId: string;
    nombre: string;
    error: string;
  }>;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

export function BulkContactModal({ isOpen, onClose, clienteIds, onSuccess }: BulkContactModalProps) {
  const [tab, setTab] = useState<'email' | 'whatsapp'>('email');
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [selectedPlantillaId, setSelectedPlantillaId] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailResult, setEmailResult] = useState<BulkEmailResult | null>(null);
  const [waResult, setWaResult] = useState<BulkWhatsAppResult | null>(null);

  const fetchPlantillas = useCallback(async (canal: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/plantillas?canal=${canal}&esActiva=true`);
      const data = await res.json();
      if (data.success) {
        setPlantillas(data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const canal = tab === 'email' ? 'EMAIL' : 'WHATSAPP';
      fetchPlantillas(canal);
      setSelectedPlantillaId('');
      setEmailResult(null);
      setWaResult(null);
    }
  }, [isOpen, tab, fetchPlantillas]);

  const handleBulkEmail = async () => {
    if (!selectedPlantillaId) return;
    setSending(true);
    setEmailResult(null);

    try {
      const res = await fetch('/api/mensajes/send-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteIds,
          plantillaId: selectedPlantillaId,
          canal: 'EMAIL',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEmailResult(data.data);
        onSuccess?.();
      }
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const handleBulkWhatsApp = async () => {
    if (!selectedPlantillaId) return;
    setSending(true);
    setWaResult(null);

    try {
      const res = await fetch('/api/mensajes/send-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteIds,
          plantillaId: selectedPlantillaId,
          canal: 'WHATSAPP',
        }),
      });

      const data = await res.json();
      if (data.success || data.data) {
        setWaResult(data.data);
        onSuccess?.();
      }
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={`Contacto masivo (${clienteIds.length} clientes)`}
      size="lg"
    >
      <Tabs.Root value={tab} onValueChange={(v) => setTab(v as 'email' | 'whatsapp')}>
        <Tabs.List className="flex border-b border-gray-200 mb-4">
          <Tabs.Trigger
            value="email"
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'email'
                ? 'border-blue-500 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <EnvelopeIcon className="h-4 w-4" />
            Email Masivo
          </Tabs.Trigger>
          <Tabs.Trigger
            value="whatsapp"
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'whatsapp'
                ? 'border-green-500 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <WhatsAppIcon className="h-4 w-4" />
            WhatsApp Individual
          </Tabs.Trigger>
        </Tabs.List>

        {/* EMAIL TAB */}
        <Tabs.Content value="email">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              Se enviarán <strong>{clienteIds.length}</strong> emails personalizados con la plantilla seleccionada.
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plantilla</label>
              {loading ? (
                <p className="text-sm text-gray-400">Cargando...</p>
              ) : plantillas.length === 0 ? (
                <p className="text-sm text-gray-400">No hay plantillas de email activas</p>
              ) : (
                <select
                  value={selectedPlantillaId}
                  onChange={(e) => setSelectedPlantillaId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Seleccionar plantilla...</option>
                  {plantillas.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Email Results */}
            {emailResult && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
                  Resultado: {emailResult.successful}/{emailResult.total} enviados
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                  {emailResult.details.map((d) => (
                    <div key={d.clienteId} className="flex items-center justify-between px-4 py-2 text-sm">
                      <span className="text-gray-900">{d.nombre}</span>
                      {d.success ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircleIcon className="h-5 w-5" />
                          <span className="text-xs">{d.error}</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Tabs.Content>

        {/* WHATSAPP TAB */}
        <Tabs.Content value="whatsapp">
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
              Selecciona una plantilla y luego abre WhatsApp individualmente para cada cliente.
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plantilla</label>
              {loading ? (
                <p className="text-sm text-gray-400">Cargando...</p>
              ) : plantillas.length === 0 ? (
                <p className="text-sm text-gray-400">No hay plantillas de WhatsApp activas</p>
              ) : (
                <select
                  value={selectedPlantillaId}
                  onChange={(e) => setSelectedPlantillaId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Seleccionar plantilla...</option>
                  {plantillas.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              )}
            </div>

            {/* WhatsApp Results - List with individual buttons */}
            {waResult && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
                  {waResult.items.length} mensajes preparados
                  {waResult.errors.length > 0 && `, ${waResult.errors.length} errores`}
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                  {waResult.items.map((item) => (
                    <div key={item.clienteId} className="flex items-center justify-between px-4 py-2">
                      <span className="text-sm text-gray-900">{item.nombre}</span>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-md text-xs font-medium hover:bg-green-700"
                      >
                        <WhatsAppIcon className="h-3 w-3" />
                        Abrir
                      </a>
                    </div>
                  ))}
                  {waResult.errors.map((err) => (
                    <div key={err.clienteId} className="flex items-center justify-between px-4 py-2 bg-red-50">
                      <span className="text-sm text-gray-900">{err.nombre}</span>
                      <span className="text-xs text-red-600">{err.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Tabs.Content>
      </Tabs.Root>

      <ModalFooter>
        <Button variant="outline" size="sm" onClick={onClose}>
          Cerrar
        </Button>
        {tab === 'email' && !emailResult && (
          <Button
            size="sm"
            disabled={!selectedPlantillaId || sending}
            onClick={handleBulkEmail}
          >
            {sending ? 'Enviando...' : `Enviar ${clienteIds.length} Emails`}
          </Button>
        )}
        {tab === 'whatsapp' && !waResult && (
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={!selectedPlantillaId || sending}
            onClick={handleBulkWhatsApp}
          >
            {sending ? 'Preparando...' : 'Preparar WhatsApp'}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
