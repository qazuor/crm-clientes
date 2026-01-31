import { prisma } from '@/lib/prisma';
import { TipoActividad } from '@prisma/client';

interface RegistrarActividadParams {
  tipo: TipoActividad;
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
    tipo: TipoActividad.CLIENTE_CREADO,
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
    tipo: TipoActividad.CLIENTE_EDITADO,
    clienteId,
    usuarioId,
    descripcion: `Información del cliente "${nombreCliente}" fue actualizada`,
    resultado: `Campos modificados: ${campos}`,
    proximoPaso: 'Verificar que la información sea correcta'
  });
}

export async function registrarClienteEliminado(clienteId: string, usuarioId: string, nombreCliente: string) {
  return registrarActividadAutomatica({
    tipo: TipoActividad.CLIENTE_ELIMINADO,
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
    tipo: TipoActividad.IA_ENRIQUECIMIENTO,
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
    tipo: TipoActividad.CONTACTO_AUTOMATICO,
    clienteId,
    usuarioId,
    descripcion: `Contacto automático realizado con cliente "${nombreCliente}" via ${tipoContacto}`,
    resultado,
    proximoPaso: 'Revisar respuesta y planificar seguimiento'
  });
}

export async function registrarEmailEnviado(
  clienteId: string,
  usuarioId: string,
  nombreCliente: string,
  asunto: string,
  nombrePlantilla?: string
) {
  const desc = nombrePlantilla
    ? `Email enviado a "${nombreCliente}" usando plantilla "${nombrePlantilla}"`
    : `Email enviado a "${nombreCliente}"`;
  return registrarActividadAutomatica({
    tipo: TipoActividad.EMAIL,
    clienteId,
    usuarioId,
    descripcion: desc,
    resultado: `Asunto: ${asunto}`,
    proximoPaso: 'Esperar respuesta del cliente'
  });
}

export async function registrarWhatsAppEnviado(
  clienteId: string,
  usuarioId: string,
  nombreCliente: string,
  preview: string,
  nombrePlantilla?: string
) {
  const desc = nombrePlantilla
    ? `Mensaje de WhatsApp enviado a "${nombreCliente}" usando plantilla "${nombrePlantilla}"`
    : `Mensaje de WhatsApp enviado a "${nombreCliente}"`;
  return registrarActividadAutomatica({
    tipo: TipoActividad.CONTACTO_AUTOMATICO,
    clienteId,
    usuarioId,
    descripcion: desc,
    resultado: `Mensaje: ${preview}...`,
    proximoPaso: 'Revisar respuesta y planificar seguimiento'
  });
}

// Note: CAMBIO_ESTADO, CAMBIO_PRIORIDAD, CAMBIO_AGENTE are recorded as NOTA type
// since they are informational notes about changes
export async function registrarCambioEstado(
  clienteId: string,
  usuarioId: string,
  nombreCliente: string,
  estadoAnterior: string,
  estadoNuevo: string
) {
  return registrarActividadAutomatica({
    tipo: TipoActividad.NOTA,
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
    tipo: TipoActividad.NOTA,
    clienteId,
    usuarioId,
    descripcion: `Prioridad del cliente "${nombreCliente}" cambió de "${prioridadAnterior}" a "${prioridadNueva}"`,
    resultado: `Prioridad actualizada: ${prioridadNueva}`
  });
}

