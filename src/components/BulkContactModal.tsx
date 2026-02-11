'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import * as Tabs from '@radix-ui/react-tabs';
import { EnvelopeIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { WhatsAppIcon } from '@/components/ui/SocialIcons';

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
