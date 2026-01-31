'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import * as Tabs from '@radix-ui/react-tabs';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { render } from '@/lib/services/template-render-service';
import { htmlToWhatsApp } from '@/lib/services/whatsapp-format-service';

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

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
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
