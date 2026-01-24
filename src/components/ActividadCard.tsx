'use client';

import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ActividadCardProps {
  actividad: {
    id: string;
    tipo: string;
    descripcion: string;
    fecha: Date;
    resultado?: string | null;
    proximoPaso?: string | null;
    esAutomatica?: boolean;
    usuario?: {
      name: string | null;
      email: string;
    } | null;
  };
  Icon: React.ComponentType<{ className?: string }>;
}

const getTipoBadgeColor = (tipo: string, esAutomatica: boolean = false) => {
  // Colores especiales para actividades automáticas
  if (esAutomatica) {
    switch (tipo) {
      case 'CLIENTE_CREADO':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'CLIENTE_EDITADO':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'CLIENTE_ELIMINADO':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'IA_ENRIQUECIMIENTO':
        return 'bg-cyan-100 text-cyan-800 border border-cyan-200';
      case 'CONTACTO_AUTOMATICO':
        return 'bg-teal-100 text-teal-800 border border-teal-200';
      case 'CAMBIO_ESTADO':
        return 'bg-violet-100 text-violet-800 border border-violet-200';
      case 'CAMBIO_PRIORIDAD':
        return 'bg-rose-100 text-rose-800 border border-rose-200';
      case 'CAMBIO_AGENTE':
        return 'bg-lime-100 text-lime-800 border border-lime-200';
      default:
        return 'bg-slate-100 text-slate-800 border border-slate-200';
    }
  }
  
  // Colores para actividades manuales
  switch (tipo) {
    case 'LLAMADA':
      return 'bg-blue-100 text-blue-800';
    case 'EMAIL':
      return 'bg-green-100 text-green-800';
    case 'REUNION':
      return 'bg-purple-100 text-purple-800';
    case 'TAREA':
      return 'bg-orange-100 text-orange-800';
    case 'NOTA':
      return 'bg-gray-100 text-gray-800';
    case 'PROPUESTA':
      return 'bg-indigo-100 text-indigo-800';
    case 'SEGUIMIENTO':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export function ActividadCard({ actividad, Icon }: ActividadCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-start space-x-4">
        {/* Icono */}
        <div className="shrink-0">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <Icon className="h-5 w-5 text-gray-600" />
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTipoBadgeColor(actividad.tipo, actividad.esAutomatica)}`}>
                {actividad.tipo.replace('_', ' ')}
              </span>
              {actividad.esAutomatica && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
                  ⚙️ Automática
                </span>
              )}
              <span className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(actividad.fecha), { 
                  addSuffix: true, 
                  locale: es 
                })}
              </span>
            </div>
            <span className="text-xs text-gray-400">
              {new Date(actividad.fecha).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>

          {/* Descripción */}
          <div className="mb-3">
            <p className="text-gray-900 text-sm leading-relaxed">
              {actividad.descripcion}
            </p>
          </div>

          {/* Resultado */}
          {actividad.resultado && (
            <div className="mb-3 p-3 bg-green-50 border-l-4 border-green-200 rounded-r-md">
              <h4 className="text-sm font-medium text-green-800 mb-1">Resultado:</h4>
              <p className="text-sm text-green-700">{actividad.resultado}</p>
            </div>
          )}

          {/* Próximo paso */}
          {actividad.proximoPaso && (
            <div className="mb-3 p-3 bg-blue-50 border-l-4 border-blue-200 rounded-r-md">
              <h4 className="text-sm font-medium text-blue-800 mb-1">Próximo paso:</h4>
              <p className="text-sm text-blue-700">{actividad.proximoPaso}</p>
            </div>
          )}

          {/* Usuario */}
          {actividad.usuario && (
            <div className="flex items-center text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
              <span>Registrado por: {actividad.usuario.name || actividad.usuario.email}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}