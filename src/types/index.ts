// Tipos base derivados del schema de Prisma
export type UserRole = 'ADMIN' | 'MANAGER' | 'AGENT'

export type FuenteCliente =
  | 'IMPORTADO'
  | 'MANUAL'
  | 'REFERIDO'
  | 'CONTACTO_CLIENTE'

export type EstadoCliente =
  | 'NUEVO'
  | 'PRIMER_CONTACTO'
  | 'EN_TRATATIVAS'
  | 'EN_DESARROLLO'
  | 'FINALIZADO'
  | 'RECONTACTO'

export type PrioridadCliente = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA'

export type EnrichmentStatusType = 'NONE' | 'PENDING' | 'PARTIAL' | 'COMPLETE'

export type TipoActividad =
  | 'LLAMADA'
  | 'EMAIL'
  | 'REUNION'
  | 'TAREA'
  | 'NOTA'
  | 'PROPUESTA'
  | 'SEGUIMIENTO'

export type CanalContacto = 'EMAIL' | 'WHATSAPP'
export type EstadoMensaje = 'PENDIENTE' | 'ENVIADO' | 'ERROR'

// Interfaces principales
export interface User {
  id: string
  email: string
  name: string | null
  password?: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

export interface Cliente {
  id: string
  nombre: string
  email?: string | null
  telefono?: string | null
  whatsapp?: string | null
  instagram?: string | null
  facebook?: string | null
  linkedin?: string | null
  twitter?: string | null
  direccion?: string | null
  ciudad?: string | null
  provincia?: string | null
  codigoPostal?: string | null
  industria?: string | null
  sitioWeb?: string | null
  tieneSSL?: boolean | null
  esResponsive?: boolean | null
  fuente: FuenteCliente
  estado: EstadoCliente
  prioridad: PrioridadCliente
  fechaCreacion: Date
  fechaModific: Date
  ultimoContacto?: Date | null
  ultimaIA?: Date | null
  enrichmentStatus?: EnrichmentStatusType
  notas?: string | null
  actividades?: Actividad[]
}

export interface Actividad {
  id: string
  tipo: TipoActividad
  descripcion: string
  fecha: Date
  clienteId: string
  usuarioId: string
  resultado?: string | null
  proximoPaso?: string | null
  cliente?: Cliente
  usuario?: User
}

// DTOs para formularios
export interface CreateClienteDTO {
  nombre: string
  email?: string
  telefono?: string
  whatsapp?: string
  instagram?: string
  facebook?: string
  linkedin?: string
  twitter?: string
  direccion?: string
  ciudad?: string
  provincia?: string
  codigoPostal?: string
  industria?: string
  sitioWeb?: string
  tieneSSL?: boolean
  esResponsive?: boolean
  fuente: FuenteCliente
  estado: EstadoCliente
  prioridad: PrioridadCliente
  notas?: string
}

export interface UpdateClienteDTO extends Partial<CreateClienteDTO> {
  id: string
}

export interface CreateActividadDTO {
  tipo: TipoActividad
  descripcion: string
  clienteId: string
  resultado?: string
  proximoPaso?: string
}

export interface UpdateActividadDTO extends Partial<CreateActividadDTO> {
  id: string
}

// Tipos de respuesta de API
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Tipos de filtros
export interface ClienteFilters {
  search?: string
  estado?: EstadoCliente
  prioridad?: PrioridadCliente
  fuente?: FuenteCliente
  industria?: string
  fechaDesde?: Date
  fechaHasta?: Date
  limit?: number
  offset?: number
  sortBy?: keyof Cliente
  sortOrder?: 'asc' | 'desc'
}

export interface ActividadFilters {
  clienteId?: string
  usuarioId?: string
  tipo?: TipoActividad
  fechaDesde?: Date
  fechaHasta?: Date
  limit?: number
  offset?: number
}

// Tipos de estadísticas
export interface ClienteStats {
  total: number
  porEstado: Record<EstadoCliente, number>
  porPrioridad: Record<PrioridadCliente, number>
  porFuente: Record<FuenteCliente, number>
  nuevosUltimoMes: number
}

export interface ActividadStats {
  total: number
  porTipo: Record<TipoActividad, number>
  ultimaSemana: number
  promedioSemanal: number
}

// Tipos de configuración
export interface AppConfig {
  itemsPerPage: number
  maxFileSize: number
  allowedFileTypes: string[]
  timezone: string
}

// Tipos de sesión
export interface SessionUser {
  id: string
  email: string
  name: string | null
  role: UserRole
}

export interface ExtendedSession {
  user: SessionUser
  expires: string
}

// Tipos de notificación
export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: Date
  read: boolean
  userId: string
}

// Plantillas de contacto
export interface PlantillaContacto {
  id: string
  nombre: string
  descripcion?: string | null
  canal: CanalContacto
  asunto?: string | null
  cuerpo: string
  esActiva: boolean
  creadoPorId: string
  createdAt: Date
  updatedAt: Date
  creadoPor?: User
}

export interface CreatePlantillaDTO {
  nombre: string
  descripcion?: string
  canal: CanalContacto
  asunto?: string
  cuerpo: string
}

export interface UpdatePlantillaDTO extends Partial<CreatePlantillaDTO> {
  id: string
}

// Mensajes
export interface Mensaje {
  id: string
  canal: CanalContacto
  destinatario: string
  asunto?: string | null
  cuerpo: string
  estado: EstadoMensaje
  errorDetalle?: string | null
  clienteId: string
  usuarioId: string
  plantillaId?: string | null
  createdAt: Date
  updatedAt: Date
  cliente?: Cliente
  usuario?: User
  plantilla?: PlantillaContacto
}

export interface SendMensajeDTO {
  clienteId: string
  plantillaId: string
  canal: CanalContacto
}

export interface SendBulkMensajeDTO {
  clienteIds: string[]
  plantillaId: string
  canal: CanalContacto
}

// Tipos de exportación
export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'pdf'
  filters?: ClienteFilters
  fields?: (keyof Cliente)[]
}

// Tipos de importación
export interface ImportResult {
  success: boolean
  importedCount: number
  skippedCount: number
  errorCount: number
  errors?: string[]
  duplicates?: string[]
}