'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { 
  FunnelIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';

interface FiltrosAvanzadosProps {
  search: string;
  estado: string;
  industria: string;
  fechaDesde: string;
  fechaHasta: string;
  conIA: string;
  conEmail: string;
  conTelefono: string;
  conSitioWeb: string;
  sortField: string;
  sortOrder: string;
  industriasDisponibles: string[];
  mostrarFiltros?: string;
  columnas?: string;
}

export function FiltrosAvanzados({
  search,
  estado,
  industria,
  fechaDesde,
  fechaHasta,
  conIA,
  conEmail,
  conTelefono,
  conSitioWeb,
  sortField,
  sortOrder,
  industriasDisponibles,
  mostrarFiltros,
  columnas
}: FiltrosAvanzadosProps) {
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(mostrarFiltros === 'true');
  
  const hayFiltrosActivos = search || estado || industria || fechaDesde || fechaHasta || conIA || conEmail || conTelefono || conSitioWeb;

  const selectClassName = `w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white text-gray-900 appearance-none`;
  
  const selectStyle = {
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundSize: '16px 16px',
    backgroundPosition: 'right 0.5rem center',
    backgroundRepeat: 'no-repeat'
  };

  return (
    <div className="px-6 py-4 bg-gray-50 border-b">
      <form action="/clientes" method="GET" className="space-y-4">
        {/* Campos ocultos para preservar el estado */}
        <input type="hidden" name="sort" value={sortField} />
        <input type="hidden" name="order" value={sortOrder} />
        {columnas && <input type="hidden" name="columnas" value={columnas} />}
        {mostrarFiltros && <input type="hidden" name="mostrarFiltros" value={mostrarFiltros} />}
        
        {/* Búsqueda principal */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              name="search"
              placeholder="Buscar por nombre, email, teléfono, industria, dirección..."
              defaultValue={search}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white text-gray-900 placeholder-gray-500"
            />
          </div>
          
          <Button type="submit" className="px-6">
            Buscar
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFiltrosAbiertos(!filtrosAbiertos);
              // Agregar parámetro a la URL
              const url = new URL(window.location.href);
              if (!filtrosAbiertos) {
                url.searchParams.set('mostrarFiltros', 'true');
              } else {
                url.searchParams.delete('mostrarFiltros');
              }
              window.history.replaceState({}, '', url.toString());
            }}
            className="px-4"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Más Filtros
            {filtrosAbiertos ? 
              <ChevronUpIcon className="h-4 w-4 ml-1" /> : 
              <ChevronDownIcon className="h-4 w-4 ml-1" />
            }
          </Button>

          {hayFiltrosActivos && (
            <Link href="/clientes">
              <Button type="button" variant="outline" className="px-4">
                Limpiar
              </Button>
            </Link>
          )}
        </div>
        
        {/* Filtros detallados (colapsables) */}
        {filtrosAbiertos && (
          <>
            <input type="hidden" name="mostrarFiltros" value="true" />
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {/* Estado */}
              <div>
                <label htmlFor="estado" className="block text-xs font-semibold text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  id="estado"
                  name="estado"
                  defaultValue={estado}
                  className={selectClassName}
                  style={selectStyle}
                >
                  <option value="">Todos</option>
                  <option value="NUEVO">NUEVO</option>
                  <option value="CONTACTADO">CONTACTADO</option>
                  <option value="CALIFICADO">CALIFICADO</option>
                  <option value="PERDIDO">PERDIDO</option>
                </select>
              </div>

              {/* Industria */}
              <div>
                <label htmlFor="industria" className="block text-xs font-semibold text-gray-700 mb-1">
                  Industria
                </label>
                <select
                  id="industria"
                  name="industria"
                  defaultValue={industria}
                  className={selectClassName}
                  style={selectStyle}
                >
                  <option value="">Todas</option>
                  {industriasDisponibles.map(ind => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>

              {/* Fecha desde */}
              <div>
                <label htmlFor="fechaDesde" className="block text-xs font-semibold text-gray-700 mb-1">
                  <CalendarIcon className="h-3 w-3 inline mr-1" />
                  Desde
                </label>
                <input
                  id="fechaDesde"
                  type="date"
                  name="fechaDesde"
                  defaultValue={fechaDesde}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white text-gray-900"
                />
              </div>

              {/* Fecha hasta */}
              <div>
                <label htmlFor="fechaHasta" className="block text-xs font-semibold text-gray-700 mb-1">
                  <CalendarIcon className="h-3 w-3 inline mr-1" />
                  Hasta
                </label>
                <input
                  id="fechaHasta"
                  type="date"
                  name="fechaHasta"
                  defaultValue={fechaHasta}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white text-gray-900"
                />
              </div>

              {/* Con IA */}
              <div>
                <label htmlFor="conIA" className="block text-xs font-semibold text-gray-700 mb-1">
                  Con IA
                </label>
                <select
                  id="conIA"
                  name="conIA"
                  defaultValue={conIA}
                  className={selectClassName}
                  style={selectStyle}
                >
                  <option value="">Todos</option>
                  <option value="si">Con IA</option>
                  <option value="no">Sin IA</option>
                </select>
              </div>

              {/* Con Email */}
              <div>
                <label htmlFor="conEmail" className="block text-xs font-semibold text-gray-700 mb-1">
                  Con Email
                </label>
                <select
                  id="conEmail"
                  name="conEmail"
                  defaultValue={conEmail}
                  className={selectClassName}
                  style={selectStyle}
                >
                  <option value="">Todos</option>
                  <option value="si">Con Email</option>
                  <option value="no">Sin Email</option>
                </select>
              </div>
            </div>
            
            {/* Filtros adicionales en segunda fila */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Con Teléfono */}
              <div>
                <label htmlFor="conTelefono" className="block text-xs font-semibold text-gray-700 mb-1">
                  Con Teléfono
                </label>
                <select
                  id="conTelefono"
                  name="conTelefono"
                  defaultValue={conTelefono}
                  className={selectClassName}
                  style={selectStyle}
                >
                  <option value="">Todos</option>
                  <option value="si">Con Teléfono</option>
                  <option value="no">Sin Teléfono</option>
                </select>
              </div>

              {/* Con Sitio Web */}
              <div>
                <label htmlFor="conSitioWeb" className="block text-xs font-semibold text-gray-700 mb-1">
                  Con Sitio Web
                </label>
                <select
                  id="conSitioWeb"
                  name="conSitioWeb"
                  defaultValue={conSitioWeb}
                  className={selectClassName}
                  style={selectStyle}
                >
                  <option value="">Todos</option>
                  <option value="si">Con Sitio Web</option>
                  <option value="no">Sin Sitio Web</option>
                </select>
              </div>
              
              {/* Ordenar por */}
              <div>
                <label htmlFor="sort" className="block text-xs font-semibold text-gray-700 mb-1">
                  Ordenar por
                </label>
                <select
                  id="sort"
                  name="sort"
                  defaultValue={sortField}
                  className={selectClassName}
                  style={selectStyle}
                >
                  <option value="fechaCreacion">Fecha Creación</option>
                  <option value="nombre">Nombre</option>
                  <option value="email">Email</option>
                  <option value="estado">Estado</option>
                  <option value="industria">Industria</option>
                  <option value="ultimaIA">Última IA</option>
                  <option value="agente">Agente</option>
                </select>
              </div>
              
              {/* Dirección */}
              <div>
                <label htmlFor="order" className="block text-xs font-semibold text-gray-700 mb-1">
                  Dirección
                </label>
                <select
                  id="order"
                  name="order"
                  defaultValue={sortOrder}
                  className={selectClassName}
                  style={selectStyle}
                >
                  <option value="asc">Ascendente</option>
                  <option value="desc">Descendente</option>
                </select>
              </div>
            </div>
          </>
        )}
      </form>
    </div>
  );
}