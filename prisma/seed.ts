import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...')

  // Limpiar datos existentes
  await prisma.actividad.deleteMany({})
  await prisma.cliente.deleteMany({})
  await prisma.session.deleteMany({})
  await prisma.account.deleteMany({})
  await prisma.user.deleteMany({})

  // Crear usuarios
  const hashedPassword = await bcrypt.hash('123456', 12)
  
  const admin = await prisma.user.create({
    data: {
      email: 'admin@crm.com',
      name: 'Administrador',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  const manager = await prisma.user.create({
    data: {
      email: 'manager@crm.com',
      name: 'Gerente de Ventas',
      password: hashedPassword,
      role: 'MANAGER',
    },
  })

  const agent1 = await prisma.user.create({
    data: {
      email: 'agent1@crm.com',
      name: 'Juan Pérez',
      password: hashedPassword,
      role: 'AGENT',
    },
  })

  const agent2 = await prisma.user.create({
    data: {
      email: 'agent2@crm.com',
      name: 'María González',
      password: hashedPassword,
      role: 'AGENT',
    },
  })

  console.log('✅ Usuarios creados')

  // Crear clientes de muestra
  const clientesData = [
    {
      nombre: 'Carlos Rodríguez',
      email: 'carlos@empresa1.com',
      telefono: '+54 11 1234-5678',
      direccion: 'Av. Corrientes 1234',
      ciudad: 'Buenos Aires',
      provincia: 'CABA',
      codigoPostal: '1043',
      industria: 'Tecnología',
      fuente: 'WEB' as const,
      estado: 'NUEVO' as const,
      prioridad: 'ALTA' as const,
      scoreConversion: 85,
      agentId: agent1.id,
      notas: 'Cliente potencial muy interesado en nuestros servicios'
    },
    {
      nombre: 'Ana López',
      email: 'ana.lopez@consultora.com',
      telefono: '+54 11 9876-5432',
      direccion: 'Av. Santa Fe 5678',
      ciudad: 'Buenos Aires',
      provincia: 'CABA',
      codigoPostal: '1425',
      industria: 'Consultoría',
      fuente: 'REFERIDO' as const,
      estado: 'CALIFICADO' as const,
      prioridad: 'MEDIA' as const,
      scoreConversion: 72,
      agentId: agent1.id,
      ultimoContacto: new Date('2026-01-20'),
      notas: 'Referido por cliente existente. Muy buenas perspectivas.'
    },
    {
      nombre: 'Empresa ABC S.A.',
      email: 'contacto@empresaabc.com',
      telefono: '+54 11 5555-1234',
      direccion: 'Av. Libertador 9999',
      ciudad: 'Buenos Aires',
      provincia: 'CABA',
      codigoPostal: '1425',
      industria: 'Manufactura',
      fuente: 'MARKETING' as const,
      estado: 'PROPUESTA_ENVIADA' as const,
      prioridad: 'ALTA' as const,
      scoreConversion: 90,
      agentId: agent2.id,
      ultimoContacto: new Date('2026-01-21'),
      notas: 'Propuesta enviada el 20/01. Seguimiento programado para mañana.'
    },
    {
      nombre: 'Roberto Silva',
      email: 'roberto@tienda.com',
      telefono: '+54 11 7777-8888',
      direccion: 'Calle Falsa 123',
      ciudad: 'Rosario',
      provincia: 'Santa Fe',
      codigoPostal: '2000',
      industria: 'Retail',
      fuente: 'COLD_CALL' as const,
      estado: 'CONTACTADO' as const,
      prioridad: 'BAJA' as const,
      scoreConversion: 45,
      agentId: agent2.id,
      ultimoContacto: new Date('2026-01-19'),
      notas: 'Primer contacto realizado. Mostró interés moderado.'
    },
    {
      nombre: 'Tech Solutions Ltda.',
      email: 'info@techsolutions.com',
      telefono: '+54 11 3333-4444',
      direccion: 'Puerto Madero 2000',
      ciudad: 'Buenos Aires',
      provincia: 'CABA',
      codigoPostal: '1107',
      industria: 'Tecnología',
      fuente: 'EVENTO' as const,
      estado: 'NEGOCIACION' as const,
      prioridad: 'CRITICA' as const,
      scoreConversion: 95,
      agentId: agent1.id,
      ultimoContacto: new Date('2026-01-21'),
      notas: 'En negociación final. Cliente clave para el trimestre.'
    }
  ]

  const clientes = await Promise.all(
    clientesData.map(data => 
      prisma.cliente.create({ data })
    )
  )

  console.log('✅ Clientes de muestra creados')

  // Crear actividades de muestra
  const actividadesData = [
    {
      tipo: 'LLAMADA' as const,
      descripcion: 'Llamada inicial de contacto',
      fecha: new Date('2026-01-20T10:30:00'),
      clienteId: clientes[0].id,
      usuarioId: agent1.id,
      resultado: 'Cliente muy interesado, programar reunión',
      proximoPaso: 'Enviar propuesta comercial'
    },
    {
      tipo: 'EMAIL' as const,
      descripcion: 'Envío de información comercial',
      fecha: new Date('2026-01-20T14:15:00'),
      clienteId: clientes[1].id,
      usuarioId: agent1.id,
      resultado: 'Email entregado y leído',
      proximoPaso: 'Seguimiento telefónico en 2 días'
    },
    {
      tipo: 'REUNION' as const,
      descripcion: 'Reunión de presentación comercial',
      fecha: new Date('2026-01-21T09:00:00'),
      clienteId: clientes[2].id,
      usuarioId: agent2.id,
      resultado: 'Reunión exitosa, cliente interesado',
      proximoPaso: 'Enviar propuesta formal'
    },
    {
      tipo: 'SEGUIMIENTO' as const,
      descripcion: 'Seguimiento post-propuesta',
      fecha: new Date('2026-01-21T16:30:00'),
      clienteId: clientes[2].id,
      usuarioId: agent2.id,
      resultado: 'Cliente solicitó ajustes menores',
      proximoPaso: 'Revisar propuesta y reenviar'
    },
    {
      tipo: 'NOTA' as const,
      descripcion: 'Cliente requiere implementación urgente',
      fecha: new Date('2026-01-21T11:45:00'),
      clienteId: clientes[4].id,
      usuarioId: agent1.id,
      resultado: 'Urgencia confirmada por cliente',
      proximoPaso: 'Acelerar proceso de cotización'
    }
  ]

  await Promise.all(
    actividadesData.map(data => 
      prisma.actividad.create({ data })
    )
  )

  console.log('✅ Actividades de muestra creadas')

  console.log('🎉 Seed completado exitosamente!')
  console.log('📊 Datos creados:')
  console.log(`   - ${await prisma.user.count()} usuarios`)
  console.log(`   - ${await prisma.cliente.count()} clientes`)
  console.log(`   - ${await prisma.actividad.count()} actividades`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error en el seed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })