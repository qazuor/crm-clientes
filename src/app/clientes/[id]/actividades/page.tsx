import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { NuevaActividadModal } from '@/components/NuevaActividadModal';
import { ActividadCard } from '@/components/ActividadCard';
import { 
  ArrowLeftIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftEllipsisIcon,
  DocumentTextIcon,
  ClockIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface ActividadesPageProps {
  params: Promise<{ id: string }>;
}

export default async function ActividadesPage({ params }: ActividadesPageProps) {
  const session = await auth();
  
  if (!session) {
    redirect('/auth/login');
  }

  const { id } = await params;

  // Obtener cliente
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      email: true,
      telefono: true,
      estado: true,
    }
  });

  if (!cliente) {
    redirect('/clientes');
  }

  // Obtener actividades del cliente  
  const actividades = await prisma.actividad.findMany({
    where: { clienteId: id },
    include: {
      usuario: {
        select: {
          name: true,
          email: true,
        }
      }
    },
    orderBy: { fecha: 'desc' },
  });

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'LLAMADA': return PhoneIcon;
      case 'EMAIL': return EnvelopeIcon;
      case 'REUNION': return UserGroupIcon;
      case 'TAREA': return ClipboardDocumentListIcon;
      case 'NOTA': return ChatBubbleLeftEllipsisIcon;
      case 'PROPUESTA': return DocumentTextIcon;
      case 'SEGUIMIENTO': return ClockIcon;
      // Actividades automáticas del sistema
      case 'CLIENTE_CREADO': return UserGroupIcon;
      case 'CLIENTE_EDITADO': return ClipboardDocumentListIcon;
      case 'CLIENTE_ELIMINADO': return ClipboardDocumentListIcon;
      case 'IA_ENRIQUECIMIENTO': return MagnifyingGlassIcon;
      case 'CONTACTO_AUTOMATICO': return PhoneIcon;
      case 'CAMBIO_ESTADO': return ClipboardDocumentListIcon;
      case 'CAMBIO_PRIORIDAD': return ClipboardDocumentListIcon;
      case 'CAMBIO_AGENTE': return UserGroupIcon;
      default: return ChatBubbleLeftEllipsisIcon;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href={`/clientes/${id}`}
                className="text-gray-500 hover:text-gray-700"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Actividades de {cliente.nombre}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {cliente.email && `${cliente.email} • `}
                  {cliente.telefono && `${cliente.telefono} • `}
                  Estado: {cliente.estado}
                </p>
              </div>
            </div>
            
            <NuevaActividadModal clienteId={id} clienteNombre={cliente.nombre} />
          </div>
        </div>

        {/* Lista de actividades */}
        <div className="space-y-6">
          {actividades.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
              <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Sin actividades</h3>
              <p className="mt-1 text-sm text-gray-500">
                No hay actividades registradas para este cliente.
              </p>
              <div className="mt-6">
                <NuevaActividadModal 
                  clienteId={id} 
                  clienteNombre={cliente.nombre}
                  variant="default"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {actividades.map((actividad) => {
                const IconComponent = getTipoIcon(actividad.tipo);
                return (
                  <ActividadCard
                    key={actividad.id}
                    actividad={actividad}
                    Icon={IconComponent}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}