'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { UltimaIADisplay } from '@/components/UltimaIADisplay';

interface Cliente {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  twitter: string | null;
  sitioWeb: string | null;
  tieneSSL: boolean | null;
  esResponsive: boolean | null;
  direccion: string | null;
  ciudad: string | null;
  provincia: string | null;
  codigoPostal: string | null;
  industria: string | null;
  fuente: string;
  estado: string;
  prioridad: string;
  scoreConversion: number | null;
  agentId: string | null;
  notas: string | null;
  ultimaIA?: Date | null;
}

interface Usuario {
  id: string;
  name: string | null;
  email: string;
}

interface EditarClienteFormProps {
  cliente: Cliente;
  usuarios: Usuario[];
}

const ESTADOS = ['NUEVO', 'CONTACTADO', 'CALIFICADO', 'PERDIDO'];
const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];
const FUENTES = ['MANUAL', 'WEBSITE', 'REFERIDO', 'LINKEDIN', 'EVENTO', 'LLAMADA_FRIA', 'IMPORTADO'];
const INDUSTRIAS = ['GASTRONOMIA', 'SALUD', 'INDUMENTARIA', 'BELLEZA', 'DEPORTES', 'COMERCIO', 'CONSTRUCCION', 'SERVICIOS', 'INDUSTRIA', 'TURISMO', 'CULTURA', 'OTROS'];

export default function EditarClienteForm({ cliente, usuarios }: EditarClienteFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
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
    scoreConversion: cliente.scoreConversion?.toString() || '0',
    agentId: cliente.agentId || '',
    notas: cliente.notas || ''
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/clientes/${cliente.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          scoreConversion: parseFloat(formData.scoreConversion) || 0,
          agentId: formData.agentId || null,
          tieneSSL: formData.tieneSSL === '' ? null : formData.tieneSSL === 'true',
          esResponsive: formData.esResponsive === '' ? null : formData.esResponsive === 'true',
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al actualizar el cliente');
      }

      // Redirigir a la página de detalles del cliente
      router.push(`/clientes/${cliente.id}`);
      router.refresh();
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error al actualizar el cliente');
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              />
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              />
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

            <div>
              <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700">
                WhatsApp
              </label>
              <input
                type="tel"
                id="whatsapp"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                placeholder="+54 9 11 1234-5678"
              />
            </div>

            <div>
              <label htmlFor="instagram" className="block text-sm font-medium text-gray-700">
                Instagram
              </label>
              <input
                type="text"
                id="instagram"
                name="instagram"
                value={formData.instagram}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                placeholder="@usuario (sin @)"
              />
            </div>

            <div>
              <label htmlFor="facebook" className="block text-sm font-medium text-gray-700">
                Facebook
              </label>
              <input
                type="text"
                id="facebook"
                name="facebook"
                value={formData.facebook}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                placeholder="Página o perfil de Facebook"
              />
            </div>

            <div>
              <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700">
                LinkedIn
              </label>
              <input
                type="text"
                id="linkedin"
                name="linkedin"
                value={formData.linkedin}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                placeholder="Perfil de LinkedIn"
              />
            </div>

            <div>
              <label htmlFor="twitter" className="block text-sm font-medium text-gray-700">
                Twitter
              </label>
              <input
                type="text"
                id="twitter"
                name="twitter"
                value={formData.twitter}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                placeholder="@usuario (sin @)"
              />
            </div>
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                placeholder="https://www.ejemplo.com"
              />
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
            <div>
              <label htmlFor="estado" className="block text-sm font-medium text-gray-700">
                Estado
              </label>
              <select
                id="estado"
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                {ESTADOS.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="prioridad" className="block text-sm font-medium text-gray-700">
                Prioridad
              </label>
              <select
                id="prioridad"
                name="prioridad"
                value={formData.prioridad}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                {PRIORIDADES.map((prioridad) => (
                  <option key={prioridad} value={prioridad}>
                    {prioridad}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="fuente" className="block text-sm font-medium text-gray-700">
                Fuente
              </label>
              <select
                id="fuente"
                name="fuente"
                value={formData.fuente}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                {FUENTES.map((fuente) => (
                  <option key={fuente} value={fuente}>
                    {fuente}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="scoreConversion" className="block text-sm font-medium text-gray-700">
                Score de Conversión (0-1)
              </label>
              <input
                type="number"
                id="scoreConversion"
                name="scoreConversion"
                min="0"
                max="1"
                step="0.1"
                value={formData.scoreConversion}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              />
            </div>

            <div>
              <label htmlFor="agentId" className="block text-sm font-medium text-gray-700">
                Agente Asignado
              </label>
              <select
                id="agentId"
                name="agentId"
                value={formData.agentId}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                <option value="">Sin asignar</option>
                {usuarios.map((usuario) => (
                  <option key={usuario.id} value={usuario.id}>
                    {usuario.name || usuario.email}
                  </option>
                ))}
              </select>
            </div>
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              placeholder="Agregar notas adicionales sobre el cliente..."
            />
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            <UltimaIADisplay fecha={cliente.ultimaIA} size="sm" />
          </div>
        </div>
        <div className="flex space-x-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.back()}
            disabled={isLoading}
          >
            <XMarkIcon className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
          >
            <CheckIcon className="h-4 w-4 mr-2" />
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>
    </form>
  );
}