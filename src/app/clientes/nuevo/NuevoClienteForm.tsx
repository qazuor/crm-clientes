'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { useForm } from '@tanstack/react-form';
import { Button } from '@/components/ui/Button';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

/**
 * Validation schema for the new client form.
 * Simplified version of CreateClienteDTOSchema for form-level onBlur validation.
 */
const formSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(255, 'El nombre es muy largo'),
  email: z.string().email('Email invalido').max(255).or(z.literal('')),
  telefono: z.string().max(50),
  industria: z.string(),
  direccion: z.string().max(500),
  ciudad: z.string().max(100),
  provincia: z.string().max(100),
  codigoPostal: z.string().max(20),
  fuente: z.string(),
  estado: z.string(),
  prioridad: z.string(),
  notas: z.string().max(5000),
});

const INDUSTRIAS = [
  { value: '', label: 'Seleccionar industria' },
  { value: 'Tecnología', label: 'Tecnología' },
  { value: 'Salud', label: 'Salud' },
  { value: 'Educación', label: 'Educación' },
  { value: 'Finanzas', label: 'Finanzas' },
  { value: 'Retail', label: 'Retail' },
  { value: 'Manufactura', label: 'Manufactura' },
  { value: 'Servicios', label: 'Servicios' },
  { value: 'Otro', label: 'Otro' },
] as const;

const FUENTES = [
  { value: 'MANUAL', label: 'Manual' },
  { value: 'REFERIDO', label: 'Referido' },
  { value: 'CONTACTO_CLIENTE', label: 'Contacto del cliente' },
  { value: 'IMPORTADO', label: 'Importado' },
] as const;

const ESTADOS = [
  { value: 'NUEVO', label: 'Nuevo' },
  { value: 'PRIMER_CONTACTO', label: 'Primer contacto' },
  { value: 'EN_TRATATIVAS', label: 'En tratativas' },
  { value: 'EN_DESARROLLO', label: 'En desarrollo' },
  { value: 'FINALIZADO', label: 'Finalizado' },
  { value: 'RECONTACTO', label: 'Recontacto' },
] as const;

const PRIORIDADES = [
  { value: 'BAJA', label: 'Baja' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'CRITICA', label: 'Critica' },
] as const;

/** Returns CSS classes for field border based on validation state */
function fieldBorderClass(isTouched: boolean, isValid: boolean): string {
  if (!isTouched) return 'border-gray-300';
  return isValid ? 'border-green-400' : 'border-red-400';
}

/** Extracts a display string from a TanStack Form field error */
function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

/** Inline error message for a form field */
function FieldError({ errors, isTouched }: {
  readonly errors: readonly unknown[];
  readonly isTouched: boolean;
}) {
  if (!isTouched || errors.length === 0) return null;
  return (
    <p className="mt-1 text-sm text-red-600">
      {getErrorMessage(errors[0])}
    </p>
  );
}

/**
 * Client-side form for creating a new client.
 * Uses TanStack Form with Zod validation (onBlur).
 */
export function NuevoClienteForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');

  const form = useForm({
    defaultValues: {
      nombre: '',
      email: '',
      telefono: '',
      industria: '',
      direccion: '',
      ciudad: '',
      provincia: '',
      codigoPostal: '',
      fuente: 'MANUAL',
      estado: 'NUEVO',
      prioridad: 'MEDIA',
      notas: '',
    },
    validators: {
      onBlur: formSchema,
    },
    onSubmit: async ({ value }) => {
      setServerError('');
      try {
        const body = {
          ...value,
          email: value.email || null,
          telefono: value.telefono || null,
          industria: value.industria || null,
          direccion: value.direccion || null,
          ciudad: value.ciudad || null,
          provincia: value.provincia || null,
          codigoPostal: value.codigoPostal || null,
          notas: value.notas || null,
        };

        const response = await fetch('/api/clientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Error al crear el cliente');
        }

        router.push('/clientes');
        router.refresh();
      } catch (error) {
        logger.error('Error creating client', error instanceof Error ? error : new Error(String(error)));
        setServerError(error instanceof Error ? error.message : 'Error al crear el cliente');
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-6 p-6"
    >
      {serverError && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{serverError}</p>
        </div>
      )}

      {/* Basic Info */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Informacion Basica
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <form.Field name="nombre">
            {(field) => (
              <div>
                <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                  Nombre *
                </label>
                <input
                  type="text"
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  autoFocus
                  className={`mt-1 block w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${fieldBorderClass(field.state.meta.isTouched, field.state.meta.isValid)}`}
                  placeholder="Nombre del cliente"
                />
                <FieldError errors={field.state.meta.errors} isTouched={field.state.meta.isTouched} />
              </div>
            )}
          </form.Field>

          <form.Field name="email">
            {(field) => (
              <div>
                <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className={`mt-1 block w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${fieldBorderClass(field.state.meta.isTouched, field.state.meta.isValid)}`}
                  placeholder="cliente@ejemplo.com"
                />
                <FieldError errors={field.state.meta.errors} isTouched={field.state.meta.isTouched} />
              </div>
            )}
          </form.Field>

          <form.Field name="telefono">
            {(field) => (
              <div>
                <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                  Telefono
                </label>
                <input
                  type="tel"
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className={`mt-1 block w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${fieldBorderClass(field.state.meta.isTouched, field.state.meta.isValid)}`}
                  placeholder="+54 11 1234-5678"
                />
                <FieldError errors={field.state.meta.errors} isTouched={field.state.meta.isTouched} />
              </div>
            )}
          </form.Field>

          <form.Field name="industria">
            {(field) => (
              <div>
                <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                  Industria
                </label>
                <select
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {INDUSTRIAS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
          </form.Field>
        </div>
      </div>

      {/* Address */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Direccion
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <form.Field name="direccion">
              {(field) => (
                <div>
                  <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                    Direccion
                  </label>
                  <input
                    type="text"
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className={`mt-1 block w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${fieldBorderClass(field.state.meta.isTouched, field.state.meta.isValid)}`}
                    placeholder="Calle y numero"
                  />
                  <FieldError errors={field.state.meta.errors} isTouched={field.state.meta.isTouched} />
                </div>
              )}
            </form.Field>
          </div>

          <form.Field name="ciudad">
            {(field) => (
              <div>
                <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                  Ciudad
                </label>
                <input
                  type="text"
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className={`mt-1 block w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${fieldBorderClass(field.state.meta.isTouched, field.state.meta.isValid)}`}
                  placeholder="Ciudad"
                />
                <FieldError errors={field.state.meta.errors} isTouched={field.state.meta.isTouched} />
              </div>
            )}
          </form.Field>

          <form.Field name="provincia">
            {(field) => (
              <div>
                <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                  Provincia
                </label>
                <input
                  type="text"
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className={`mt-1 block w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${fieldBorderClass(field.state.meta.isTouched, field.state.meta.isValid)}`}
                  placeholder="Provincia"
                />
                <FieldError errors={field.state.meta.errors} isTouched={field.state.meta.isTouched} />
              </div>
            )}
          </form.Field>

          <form.Field name="codigoPostal">
            {(field) => (
              <div>
                <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                  Codigo Postal
                </label>
                <input
                  type="text"
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className={`mt-1 block w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${fieldBorderClass(field.state.meta.isTouched, field.state.meta.isValid)}`}
                  placeholder="1234"
                />
                <FieldError errors={field.state.meta.errors} isTouched={field.state.meta.isTouched} />
              </div>
            )}
          </form.Field>
        </div>
      </div>

      {/* CRM Config */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Configuracion CRM
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <form.Field name="fuente">
            {(field) => (
              <div>
                <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                  Fuente
                </label>
                <select
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {FUENTES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
          </form.Field>

          <form.Field name="estado">
            {(field) => (
              <div>
                <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                  Estado
                </label>
                <select
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {ESTADOS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
          </form.Field>

          <form.Field name="prioridad">
            {(field) => (
              <div>
                <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                  Prioridad
                </label>
                <select
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {PRIORIDADES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
          </form.Field>
        </div>
      </div>

      {/* Notes */}
      <form.Field name="notas">
        {(field) => (
          <div>
            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
              Notas
            </label>
            <textarea
              id={field.name}
              name={field.name}
              rows={3}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              className={`mt-1 block w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${fieldBorderClass(field.state.meta.isTouched, field.state.meta.isValid)}`}
              placeholder="Informacion adicional del cliente..."
            />
            <FieldError errors={field.state.meta.errors} isTouched={field.state.meta.isTouched} />
          </div>
        )}
      </form.Field>

      {/* Buttons */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <Link href="/clientes">
          <Button variant="outline">
            Cancelar
          </Button>
        </Link>
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting] as const}
        >
          {([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isSubmitting ? 'Guardando...' : 'Agregar Cliente'}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
