'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import * as Tabs from '@radix-ui/react-tabs';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { render } from '@/lib/services/template-render-service';
import { htmlToWhatsApp } from '@/lib/services/whatsapp-format-service';
import { WhatsAppIcon } from '@/components/ui/SocialIcons';

interface ClienteForContact {
  id: string;
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
  codigoPostal?: string | null;
  industria?: string | null;
  sitioWeb?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
}

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: ClienteForContact;
  onSuccess?: () => void;
  defaultTab?: 'email' | 'whatsapp';
}

interface Plantilla {
  id: string;
  nombre: string;
  canal: 'EMAIL' | 'WHATSAPP';
  asunto: string | null;
  cuerpo: string;
}

export function ContactModal({ isOpen, onClose, cliente, onSuccess, defaultTab = 'email' }: ContactModalProps) {
  const [tab, setTab] = useState(defaultTab);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [selectedPlantillaId, setSelectedPlantillaId] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
      setResult(null);
    }
  }, [isOpen, tab, fetchPlantillas]);

  const selectedPlantilla = plantillas.find((p) => p.id === selectedPlantillaId);

  const previewCuerpo = selectedPlantilla ? render(selectedPlantilla.cuerpo, cliente) : '';
  const previewAsunto = selectedPlantilla?.asunto ? render(selectedPlantilla.asunto, cliente) : '';

  const handleSendEmail = async () => {
    if (!selectedPlantillaId) return;
    setSending(true);
    setResult(null);

    try {
      const res = await fetch('/api/mensajes/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: cliente.id,
          plantillaId: selectedPlantillaId,
          canal: 'EMAIL',
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ type: 'success', message: 'Email enviado exitosamente' });
        onSuccess?.();
      } else {
        setResult({ type: 'error', message: data.error || 'Error al enviar' });
      }
    } catch {
      setResult({ type: 'error', message: 'Error de conexión' });
    } finally {
      setSending(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!selectedPlantillaId) return;
    setSending(true);
    setResult(null);

    try {
      const res = await fetch('/api/mensajes/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: cliente.id,
          plantillaId: selectedPlantillaId,
          canal: 'WHATSAPP',
        }),
      });

      const data = await res.json();

      if (res.ok && data.data?.url) {
        window.open(data.data.url, '_blank');
        setResult({ type: 'success', message: 'WhatsApp abierto en nueva pestaña' });
        onSuccess?.();
      } else {
        setResult({ type: 'error', message: data.error || 'Error al preparar' });
      }
    } catch {
      setResult({ type: 'error', message: 'Error de conexión' });
    } finally {
      setSending(false);
    }
  };

  const hasEmail = !!cliente.email;
  const hasWhatsApp = !!cliente.whatsapp;

  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={`Contactar a ${cliente.nombre}`}
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
            Email
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
            WhatsApp
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="email">
          {!hasEmail ? (
            <div className="text-center py-6">
              <EnvelopeIcon className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">Este cliente no tiene email registrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Destinatario: <span className="font-medium text-gray-900">{cliente.email}</span></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plantilla</label>
                {loading ? (
                  <p className="text-sm text-gray-400">Cargando plantillas...</p>
                ) : plantillas.length === 0 ? (
                  <p className="text-sm text-gray-400">No hay plantillas de email activas</p>
                ) : (
                  <select
                    value={selectedPlantillaId}
                    onChange={(e) => setSelectedPlantillaId(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:border-blue-500 focus:ring-blue-500"
                    autoFocus
                  >
                    <option value="">Seleccionar plantilla...</option>
                    {plantillas.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                )}
              </div>
              {selectedPlantilla && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500 uppercase">Preview</div>
                  {previewAsunto && (
                    <div className="px-3 py-1.5 border-b border-gray-200 text-sm">
                      <span className="text-gray-500">Asunto: </span>{previewAsunto}
                    </div>
                  )}
                  <div className="p-3 max-h-48 overflow-y-auto">
                    <div className="max-w-none text-gray-900 text-sm [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_li]:mb-1 [&_a]:text-blue-600 [&_a]:underline" dangerouslySetInnerHTML={{ __html: previewCuerpo }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </Tabs.Content>

        <Tabs.Content value="whatsapp">
          {!hasWhatsApp ? (
            <div className="text-center py-6">
              <WhatsAppIcon className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">Este cliente no tiene WhatsApp registrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Destinatario: <span className="font-medium text-gray-900">{cliente.whatsapp}</span></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plantilla</label>
                {loading ? (
                  <p className="text-sm text-gray-400">Cargando plantillas...</p>
                ) : plantillas.length === 0 ? (
                  <p className="text-sm text-gray-400">No hay plantillas de WhatsApp activas</p>
                ) : (
                  <select
                    value={selectedPlantillaId}
                    onChange={(e) => setSelectedPlantillaId(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:border-blue-500 focus:ring-blue-500"
                    autoFocus
                  >
                    <option value="">Seleccionar plantilla...</option>
                    {plantillas.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                )}
              </div>
              {selectedPlantilla && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500 uppercase">Preview</div>
                  <div className="p-3 max-h-48 overflow-y-auto">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{htmlToWhatsApp(previewCuerpo)}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>

      {result && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${
          result.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {result.message}
        </div>
      )}

      <ModalFooter>
        <Button variant="outline" size="sm" onClick={onClose}>
          Cerrar
        </Button>
        {tab === 'email' && hasEmail && (
          <Button
            size="sm"
            disabled={!selectedPlantillaId || sending}
            onClick={handleSendEmail}
          >
            {sending ? 'Enviando...' : 'Enviar Email'}
          </Button>
        )}
        {tab === 'whatsapp' && hasWhatsApp && (
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={!selectedPlantillaId || sending}
            onClick={handleSendWhatsApp}
          >
            {sending ? 'Preparando...' : 'Abrir WhatsApp'}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
