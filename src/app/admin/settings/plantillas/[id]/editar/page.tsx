'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { EmailEditor } from '@/components/EmailEditor';
import { VariableHelper } from '@/components/VariableHelper';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { render } from '@/lib/services/template-render-service';
import { htmlToWhatsApp } from '@/lib/services/whatsapp-format-service';

const CLIENTE_EJEMPLO = {
  nombre: 'Juan Pérez',
  email: 'juan@ejemplo.com',
  telefono: '+54 11 1234-5678',
  whatsapp: '+5411123456789',
  direccion: 'Av. Corrientes 1234',
  ciudad: 'Buenos Aires',
  provincia: 'Buenos Aires',
  codigoPostal: '1043',
  industria: 'Tecnología',
  sitioWeb: 'https://ejemplo.com',
  instagram: '@juanperez',
  facebook: 'juanperez',
  linkedin: 'juanperez',
  twitter: '@juanperez',
};

export default function EditarPlantillaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [canal, setCanal] = useState<'EMAIL' | 'WHATSAPP'>('EMAIL');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [asunto, setAsunto] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [esActiva, setEsActiva] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    async function fetchPlantilla() {
      try {
        const res = await fetch(`/api/plantillas/${id}`);
        const data = await res.json();
        if (data.success) {
          const p = data.data;
          setCanal(p.canal);
          setNombre(p.nombre);
          setDescripcion(p.descripcion || '');
          setAsunto(p.asunto || '');
          setCuerpo(p.cuerpo);
          setEsActiva(p.esActiva);
        }
      } catch {
        setError('Error al cargar la plantilla');
      } finally {
        setLoading(false);
      }
    }
    fetchPlantilla();
  }, [id]);

  const handleInsertVariable = useCallback((variable: string) => {
    setCuerpo((prev) => prev + variable);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const res = await fetch(`/api/plantillas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          descripcion: descripcion || null,
          canal,
          asunto: canal === 'EMAIL' ? asunto : null,
          cuerpo,
          esActiva,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al actualizar la plantilla');
        return;
      }

      router.push('/admin/settings/plantillas');
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const previewCuerpo = cuerpo ? render(cuerpo, CLIENTE_EJEMPLO) : '';
  const previewAsunto = asunto ? render(asunto, CLIENTE_EJEMPLO) : '';

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Cargando plantilla...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/settings/plantillas" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-3">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Volver a plantillas
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Editar Plantilla</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Canal (read-only info) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Canal</label>
          <div className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
            canal === 'EMAIL'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {canal}
          </div>
        </div>

        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre de la plantilla *
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        {/* Descripcion */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <input
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        {/* Asunto (solo EMAIL) */}
        {canal === 'EMAIL' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Asunto *
            </label>
            <input
              type="text"
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
        )}

        {/* Variables Helper */}
        <VariableHelper onInsert={handleInsertVariable} />

        {/* Cuerpo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contenido *
          </label>
          <EmailEditor
            value={cuerpo}
            onChange={setCuerpo}
            placeholder={canal === 'EMAIL' ? 'Escribe el contenido del email...' : 'Escribe el contenido del mensaje...'}
            mode={canal === 'EMAIL' ? 'email' : 'whatsapp'}
          />
        </div>

        {/* Estado */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="esActiva"
            checked={esActiva}
            onChange={(e) => setEsActiva(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="esActiva" className="text-sm text-gray-700">
            Plantilla activa
          </label>
        </div>

        {/* Preview */}
        <div>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {showPreview ? 'Ocultar preview' : 'Mostrar preview'}
          </button>
          {showPreview && cuerpo && (
            <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                Vista previa (datos de ejemplo)
              </div>
              {canal === 'EMAIL' && previewAsunto && (
                <div className="px-4 py-2 border-b border-gray-200 text-sm">
                  <span className="font-medium text-gray-600">Asunto: </span>
                  {previewAsunto}
                </div>
              )}
              <div className="p-4">
                {canal === 'EMAIL' ? (
                  <div
                    className="max-w-none text-gray-900 text-sm [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_li]:mb-1 [&_a]:text-blue-600 [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: previewCuerpo }}
                  />
                ) : (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{htmlToWhatsApp(previewCuerpo)}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link href="/admin/settings/plantillas">
            <Button variant="outline" type="button">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </div>
  );
}
