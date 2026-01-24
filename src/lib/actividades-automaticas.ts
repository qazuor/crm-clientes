import { prisma } from '@/lib/prisma';

export type TipoActividadAutomatica = 
  | 'CLIENTE_CREADO'
  | 'CLIENTE_EDITADO' 
  | 'CLIENTE_ELIMINADO'
  | 'IA_ENRIQUECIMIENTO'
  | 'CONTACTO_AUTOMATICO'
  | 'CAMBIO_ESTADO'
  | 'CAMBIO_PRIORIDAD'
  | 'CAMBIO_AGENTE';

interface RegistrarActividadParams {
  tipo: TipoActividadAutomatica;
  clienteId: string;
  usuarioId: string;
  descripcion: string;
  resultado?: string;
  proximoPaso?: string;
}

export async function registrarActividadAutomatica({
  tipo,
  clienteId,
  usuarioId,
  descripcion,
  resultado,
  proximoPaso
}: RegistrarActividadParams) {
  try {
    await prisma.actividad.create({
      data: {
        tipo,
        descripcion,
        clienteId,
        usuarioId,
        resultado: resultado || null,
        proximoPaso: proximoPaso || null,
        esAutomatica: true,
        fecha: new Date()
      }
    });
  } catch (error) {
    console.error('Error registrando actividad automática:', error);
    // No lanzamos el error para evitar interrumpir el flujo principal
  }
}

// Funciones helper específicas para cada tipo de actividad
export async function registrarClienteCreado(clienteId: string, usuarioId: string, nombreCliente: string) {
  return registrarActividadAutomatica({
    tipo: 'CLIENTE_CREADO',
    clienteId,
    usuarioId,
    descripcion: `Cliente "${nombreCliente}" fue creado en el sistema`,
    resultado: 'Cliente agregado exitosamente',
    proximoPaso: 'Revisar y completar información del cliente'
  });
}

export async function registrarClienteEditado(
  clienteId: string, 
  usuarioId: string, 
  nombreCliente: string, 
  camposEditados: string[]
) {
  const campos = camposEditados.join(', ');
  return registrarActividadAutomatica({
    tipo: 'CLIENTE_EDITADO',
    clienteId,
    usuarioId,
    descripcion: `Información del cliente "${nombreCliente}" fue actualizada`,
    resultado: `Campos modificados: ${campos}`,
    proximoPaso: 'Verificar que la información sea correcta'
  });
}

export async function registrarClienteEliminado(clienteId: string, usuarioId: string, nombreCliente: string) {
  return registrarActividadAutomatica({
    tipo: 'CLIENTE_ELIMINADO',
    clienteId,
    usuarioId,
    descripcion: `Cliente "${nombreCliente}" fue eliminado del sistema`,
    resultado: 'Cliente removido de la base de datos'
  });
}

export async function registrarEnriquecimientoIA(
  clienteId: string, 
  usuarioId: string, 
  nombreCliente: string,
  tipoEnriquecimiento: string,
  datosObtenidos: string[]
) {
  const datos = datosObtenidos.join(', ');
  return registrarActividadAutomatica({
    tipo: 'IA_ENRIQUECIMIENTO',
    clienteId,
    usuarioId,
    descripcion: `Se enriqueció la información del cliente "${nombreCliente}" usando IA (${tipoEnriquecimiento})`,
    resultado: `Datos obtenidos: ${datos}`,
    proximoPaso: 'Revisar y validar la información obtenida'
  });
}

export async function registrarContactoAutomatico(
  clienteId: string,
  usuarioId: string,
  nombreCliente: string,
  tipoContacto: string,
  resultado: string
) {
  return registrarActividadAutomatica({
    tipo: 'CONTACTO_AUTOMATICO',
    clienteId,
    usuarioId,
    descripcion: `Contacto automático realizado con cliente "${nombreCliente}" via ${tipoContacto}`,
    resultado,
    proximoPaso: 'Revisar respuesta y planificar seguimiento'
  });
}

export async function registrarCambioEstado(
  clienteId: string,
  usuarioId: string,
  nombreCliente: string,
  estadoAnterior: string,
  estadoNuevo: string
) {
  return registrarActividadAutomatica({
    tipo: 'CAMBIO_ESTADO',
    clienteId,
    usuarioId,
    descripcion: `Estado del cliente "${nombreCliente}" cambió de "${estadoAnterior}" a "${estadoNuevo}"`,
    resultado: `Estado actualizado: ${estadoNuevo}`
  });
}

export async function registrarCambioPrioridad(
  clienteId: string,
  usuarioId: string,
  nombreCliente: string,
  prioridadAnterior: string,
  prioridadNueva: string
) {
  return registrarActividadAutomatica({
    tipo: 'CAMBIO_PRIORIDAD',
    clienteId,
    usuarioId,
    descripcion: `Prioridad del cliente "${nombreCliente}" cambió de "${prioridadAnterior}" a "${prioridadNueva}"`,
    resultado: `Prioridad actualizada: ${prioridadNueva}`
  });
}

export async function registrarCambioAgente(
  clienteId: string,
  usuarioId: string,
  nombreCliente: string,
  agenteAnterior: string | null,
  agenteNuevo: string | null
) {
  const desde = agenteAnterior || 'Sin asignar';
  const hacia = agenteNuevo || 'Sin asignar';
  
  return registrarActividadAutomatica({
    tipo: 'CAMBIO_AGENTE',
    clienteId,
    usuarioId,
    descripcion: `Agente asignado al cliente "${nombreCliente}" cambió de "${desde}" a "${hacia}"`,
    resultado: `Agente asignado: ${hacia}`,
    proximoPaso: agenteNuevo ? 'El nuevo agente debe revisar el cliente' : 'Asignar nuevo agente'
  });
}