'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { CheckIcon, XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { UltimaIADisplay } from '@/components/UltimaIADisplay';
import dynamic from 'next/dynamic';

const EnrichmentModal = dynamic(
  () => import('@/components/enrichment/EnrichmentModal').then((m) => m.EnrichmentModal),
  { ssr: false },
);
import { logger } from '@/lib/logger';
import type { EditarClienteFormProps } from './editar-cliente-types';
import { ESTADOS, PRIORIDADES, FUENTES, INDUSTRIAS } from './editar-cliente-types';

/** Field-level validation schemas for fields with meaningful constraints */
const fieldValidators: Record<string, z.ZodType> = {
  nombre: z.string().min(1, 'El nombre es requerido').max(255, 'El nombre es muy largo'),
  email: z.string().email('Email invalido').max(255).or(z.literal('')),
  sitioWeb: z.string().url('URL invalida').max(500).or(z.literal('')),
  notas: z.string().max(5000, 'Maximo 5000 caracteres'),
};

/** Validated field names */
const VALIDATED_FIELDS = new Set(Object.keys(fieldValidators));

export function EditarClienteForm({ cliente }: EditarClienteFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [enrichModalOpen, setEnrichModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: cliente.nombre || '',
    email: cliente.email || '',
    telefono: cliente.telefono || '',
    whatsapp: cliente.whatsapp || '',
    instagram: cliente.instagram || '',
    facebook: cliente.facebook || '',
    linkedin: cliente.linkedin || '',
    twitter: cliente.twitter || '',
    sitioWeb: cliente.sitioWeb || '',
    tieneSSL: cliente.tieneSSL?.toString() || '',
    esResponsive: cliente.esResponsive?.toString() || '',
    direccion: cliente.direccion || '',
    ciudad: cliente.ciudad || '',
    provincia: cliente.provincia || '',
    codigoPostal: cliente.codigoPostal || '',
    industria: cliente.industria || '',
    fuente: cliente.fuente || 'MANUAL',
    estado: cliente.estado || 'NUEVO',
    prioridad: cliente.prioridad || 'MEDIA',
    notas: cliente.notas || ''
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const initialData = useRef(formData);
  const isDirty = useMemo(() => JSON.stringify(formData) !== JSON.stringify(initialData.current), [formData]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const validateField = useCallback((name: string, value: string) => {
    const validator = fieldValidators[name];
    if (!validator) return;
    const result = validator.safeParse(value);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (result.success) { delete next[name]; } else { next[name] = result.error.issues[0].message; }
      return next;
    });
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => new Set(prev).add(name));
    validateField(name, value);
  }, [validateField]);

  const hasErrors = Object.keys(fieldErrors).length > 0 || !formData.nombre.trim();

  /** Returns border CSS class based on field validation state */
  const borderClass = (name: string) => {
    if (!touched.has(name) || !VALIDATED_FIELDS.has(name)) return 'border-gray-300';
    return fieldErrors[name] ? 'border-red-400' : 'border-green-400';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const body = {
        ...formData,
        tieneSSL: formData.tieneSSL === '' ? null : formData.tieneSSL === 'true',
        esResponsive: formData.esResponsive === '' ? null : formData.esResponsive === 'true',
      };
      const response = await fetch(`/api/clientes/${cliente.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Error al actualizar el cliente');
      router.push(`/clientes/${cliente.id}`);
      router.refresh();
    } catch (err) {
      logger.error('Error updating client', err instanceof Error ? err : new Error(String(err)));
      setError(err instanceof Error ? err.message : 'Error al actualizar el cliente');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg border">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Información del Cliente
        </h3>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      <div className="p-6 space-y-8">
        {/* Información básica */}
        <div>
          <h4 className="text-base font-medium text-gray-900 mb-4">Información Básica</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
                Nombre *
              </label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                required
                value={formData.nombre}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`mt-1 block w-full px-3 py-2 border ${borderClass('nombre')} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white`}
              />
              {touched.has('nombre') && fieldErrors.nombre && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.nombre}</p>
              )}
            </div>

            <div>
              <label htmlFor="industria" className="block text-sm font-medium text-gray-700">
                Industria
              </label>
              <select
                id="industria"
                name="industria"
                value={formData.industria}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                <option value="">Seleccionar industria</option>
                {INDUSTRIAS.map((industria) => (
                  <option key={industria} value={industria}>
                    {industria}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div>
          <h4 className="text-base font-medium text-gray-900 mb-4">Contacto</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`mt-1 block w-full px-3 py-2 border ${borderClass('email')} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white`}
              />
              {touched.has('email') && fieldErrors.email && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">
                Teléfono
              </label>
              <input
                type="tel"
                id="telefono"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              />
            </div>

            {([
              { id: 'whatsapp', label: 'WhatsApp', type: 'tel', placeholder: '+54 9 11 1234-5678' },
              { id: 'instagram', label: 'Instagram', type: 'text', placeholder: '@usuario (sin @)' },
              { id: 'facebook', label: 'Facebook', type: 'text', placeholder: 'Pagina o perfil de Facebook' },
              { id: 'linkedin', label: 'LinkedIn', type: 'text', placeholder: 'Perfil de LinkedIn' },
              { id: 'twitter', label: 'Twitter', type: 'text', placeholder: '@usuario (sin @)' },
            ] as const).map((field) => (
              <div key={field.id}>
                <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">{field.label}</label>
                <input
                  type={field.type}
                  id={field.id}
                  name={field.id}
                  value={formData[field.id]}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder={field.placeholder}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Sitio Web */}
        <div>
          <h4 className="text-base font-medium text-gray-900 mb-4">Sitio Web</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label htmlFor="sitioWeb" className="block text-sm font-medium text-gray-700">
                URL del sitio web
              </label>
              <input
                type="url"
                id="sitioWeb"
                name="sitioWeb"
                value={formData.sitioWeb}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`mt-1 block w-full px-3 py-2 border ${borderClass('sitioWeb')} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white`}
                placeholder="https://www.ejemplo.com"
              />
              {touched.has('sitioWeb') && fieldErrors.sitioWeb && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.sitioWeb}</p>
              )}
            </div>

            <div>
              <label htmlFor="tieneSSL" className="block text-sm font-medium text-gray-700">
                Certificado SSL
              </label>
              <select
                id="tieneSSL"
                name="tieneSSL"
                value={formData.tieneSSL}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                <option value="">No evaluado</option>
                <option value="true">Sí tiene SSL</option>
                <option value="false">No tiene SSL</option>
              </select>
            </div>

            <div>
              <label htmlFor="esResponsive" className="block text-sm font-medium text-gray-700">
                Diseño Responsive
              </label>
              <select
                id="esResponsive"
                name="esResponsive"
                value={formData.esResponsive}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                <option value="">No evaluado</option>
                <option value="true">Sí es responsive</option>
                <option value="false">No es responsive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ubicación */}
        <div>
          <h4 className="text-base font-medium text-gray-900 mb-4">Ubicación</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="direccion" className="block text-sm font-medium text-gray-700">
                Dirección
              </label>
              <input
                type="text"
                id="direccion"
                name="direccion"
                value={formData.direccion}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              />
            </div>

            <div>
              <label htmlFor="ciudad" className="block text-sm font-medium text-gray-700">
                Ciudad
              </label>
              <input
                type="text"
                id="ciudad"
                name="ciudad"
                value={formData.ciudad}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              />
            </div>

            <div>
              <label htmlFor="provincia" className="block text-sm font-medium text-gray-700">
                Provincia
              </label>
              <input
                type="text"
                id="provincia"
                name="provincia"
                value={formData.provincia}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              />
            </div>

            <div>
              <label htmlFor="codigoPostal" className="block text-sm font-medium text-gray-700">
                Código Postal
              </label>
              <input
                type="text"
                id="codigoPostal"
                name="codigoPostal"
                value={formData.codigoPostal}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Gestión comercial */}
        <div>
          <h4 className="text-base font-medium text-gray-900 mb-4">Gestión Comercial</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {([
              { id: 'estado', label: 'Estado', options: ESTADOS },
              { id: 'prioridad', label: 'Prioridad', options: PRIORIDADES },
              { id: 'fuente', label: 'Fuente', options: FUENTES },
            ] as const).map((field) => (
              <div key={field.id}>
                <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">{field.label}</label>
                <select id={field.id} name={field.id} value={formData[field.id]} onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
        {/* Notas */}
        <div>
          <h4 className="text-base font-medium text-gray-900 mb-4">Notas</h4>
          <div>
            <label htmlFor="notas" className="block text-sm font-medium text-gray-700">
              Comentarios adicionales
            </label>
            <textarea
              id="notas"
              name="notas"
              rows={4}
              value={formData.notas}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`mt-1 block w-full px-3 py-2 border ${borderClass('notas')} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white`}
              placeholder="Agregar notas adicionales sobre el cliente..."
            />
            {touched.has('notas') && fieldErrors.notas && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.notas}</p>
            )}
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            <UltimaIADisplay fecha={cliente.ultimaIA} size="sm" />
          </div>
          <button
            type="button"
            onClick={() => setEnrichModalOpen(true)}
            className="inline-flex items-center rounded bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
          >
            <SparklesIcon className="h-3.5 w-3.5 mr-1" />
            Enriquecer
          </button>
        </div>
        <div className="flex space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => isDirty ? setShowLeaveDialog(true) : router.back()}
            disabled={isLoading}
          >
            <XMarkIcon className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading || hasErrors}
          >
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckIcon className="h-4 w-4 mr-2" />}
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>

      <ConfirmationDialog
        open={showLeaveDialog}
        onOpenChange={setShowLeaveDialog}
        title="Cambios sin guardar"
        description="Tienes cambios sin guardar. Si sales ahora, se perderan los cambios realizados."
        confirmText="Salir sin guardar"
        variant="destructive"
        onConfirm={() => router.back()}
      />
      <EnrichmentModal
        isOpen={enrichModalOpen}
        onClose={() => setEnrichModalOpen(false)}
        clienteIds={[cliente.id]}
        clienteNames={[cliente.nombre]}
        clientHasWebsite={!!cliente.sitioWeb}
      />
    </form>
  );
}