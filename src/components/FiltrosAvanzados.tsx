'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { FilterBadge, FilterBadgeGroup } from '@/components/ui/FilterBadge';
import { DatePicker } from '@/components/ui/DatePicker';
import {
  FunnelIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface FiltrosAvanzadosProps {
  search: string;
  estado: string;
  industria: string;
  ciudad: string;
  fechaDesde: string;
  fechaHasta: string;
  conIA: string;
  conEmail: string;
  conTelefono: string;
  conSitioWeb: string;
  sortField: string;
  sortOrder: string;
  industriasDisponibles: string[];
  ciudadesDisponibles: string[];
  mostrarFiltros?: string;
  columnas?: string;
}

export function FiltrosAvanzados({
  search,
  estado,
  industria,
  ciudad,
  fechaDesde,
  fechaHasta,
  conIA,
  conEmail,
  conTelefono,
  conSitioWeb,
  sortField,
  sortOrder,
  industriasDisponibles,
  ciudadesDisponibles,
  mostrarFiltros,
  columnas
}: FiltrosAvanzadosProps) {
  const router = useRouter();
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(mostrarFiltros === 'true');

  /** Parse ISO date string to Date object */
  const parseDate = (dateStr: string): Date | undefined => {
    if (!dateStr) return undefined;
    const parsed = new Date(dateStr + 'T00:00:00');
    return isNaN(parsed.getTime()) ? undefined : parsed;
  };

  /** Format Date to ISO date string (YYYY-MM-DD) */
  const formatDate = (date: Date | undefined): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const [desdeDate, setDesdeDate] = useState<Date | undefined>(() => parseDate(fechaDesde));
  const [hastaDate, setHastaDate] = useState<Date | undefined>(() => parseDate(fechaHasta));

  const hayFiltrosActivos = search || estado || industria || ciudad || fechaDesde || fechaHasta || conIA || conEmail || conTelefono || conSitioWeb;

  /** Build active filter entries for badges */
  const activeFilters: Array<{ key: string; label: string; value: string }> = [];
  if (search) activeFilters.push({ key: 'search', label: 'Buscar', value: search });
  if (estado) activeFilters.push({ key: 'estado', label: 'Estado', value: estado.replace(/_/g, ' ') });
  if (industria) activeFilters.push({ key: 'industria', label: 'Industria', value: industria });
  if (ciudad) activeFilters.push({ key: 'ciudad', label: 'Ciudad', value: ciudad });
  if (fechaDesde) activeFilters.push({ key: 'fechaDesde', label: 'Desde', value: fechaDesde });
  if (fechaHasta) activeFilters.push({ key: 'fechaHasta', label: 'Hasta', value: fechaHasta });
  if (conIA) activeFilters.push({ key: 'conIA', label: 'IA', value: conIA === 'si' ? 'Con IA' : 'Sin IA' });
  if (conEmail) activeFilters.push({ key: 'conEmail', label: 'Email', value: conEmail === 'si' ? 'Con Email' : 'Sin Email' });
  if (conTelefono) activeFilters.push({ key: 'conTelefono', label: 'Tel', value: conTelefono === 'si' ? 'Con Tel' : 'Sin Tel' });
  if (conSitioWeb) activeFilters.push({ key: 'conSitioWeb', label: 'Web', value: conSitioWeb === 'si' ? 'Con Web' : 'Sin Web' });

  /** Remove a single filter and navigate */
  const removeFilter = (key: string) => {
    const url = new URL(window.location.href);
    url.searchParams.delete(key);
    router.push(url.pathname + url.search);
  };

  /** Remove all filters */
  const clearAllFilters = () => {
    router.push('/clientes');
  };

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
              autoFocus
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

        {/* Active filter badges */}
        {activeFilters.length > 0 && (
          <FilterBadgeGroup count={activeFilters.length} onClearAll={clearAllFilters}>
            {activeFilters.map((f) => (
              <FilterBadge
                key={f.key}
                label={f.label}
                value={f.value}
                onRemove={() => removeFilter(f.key)}
              />
            ))}
          </FilterBadgeGroup>
        )}

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
                  <option value="PRIMER_CONTACTO">PRIMER CONTACTO</option>
                  <option value="EN_TRATATIVAS">EN TRATATIVAS</option>
                  <option value="EN_DESARROLLO">EN DESARROLLO</option>
                  <option value="FINALIZADO">FINALIZADO</option>
                  <option value="RECONTACTO">RECONTACTO</option>
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

              {/* Ciudad */}
              <div>
                <label htmlFor="ciudad" className="block text-xs font-semibold text-gray-700 mb-1">
                  Ciudad
                </label>
                <select
                  id="ciudad"
                  name="ciudad"
                  defaultValue={ciudad}
                  className={selectClassName}
                  style={selectStyle}
                >
                  <option value="">Todas</option>
                  {ciudadesDisponibles.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Fecha desde */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Desde
                </label>
                <input type="hidden" name="fechaDesde" value={formatDate(desdeDate)} />
                <DatePicker
                  value={desdeDate}
                  onChange={setDesdeDate}
                  placeholder="Desde"
                  maxDate={hastaDate}
                  label="Fecha desde"
                />
              </div>

              {/* Fecha hasta */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Hasta
                </label>
                <input type="hidden" name="fechaHasta" value={formatDate(hastaDate)} />
                <DatePicker
                  value={hastaDate}
                  onChange={setHastaDate}
                  placeholder="Hasta"
                  minDate={desdeDate}
                  label="Fecha hasta"
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