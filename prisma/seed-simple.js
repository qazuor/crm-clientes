const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient({
  log: ['error', 'warn'],
})

async function main() {
  console.log('🌱 Iniciando sembrado de la base de datos...')
  
  try {
    // Limpiar datos existentes
    console.log('🧹 Limpiando datos existentes...')
    await prisma.actividad.deleteMany({})
    await prisma.cliente.deleteMany({})
    await prisma.account.deleteMany({})
    await prisma.session.deleteMany({})
    await prisma.user.deleteMany({})

    // Crear usuarios
    console.log('👥 Creando usuarios...')
    const hashedPassword = await bcrypt.hash('123456', 10)

    const admin = await prisma.user.create({
      data: {
        email: 'admin@crm.com',
        name: 'Admin Usuario',
        hashedPassword,
        role: 'ADMIN'
      }
    })

    const manager = await prisma.user.create({
      data: {
        email: 'manager@crm.com',
        name: 'Manager Usuario', 
        hashedPassword,
        role: 'MANAGER'
      }
    })

    const agent1 = await prisma.user.create({
      data: {
        email: 'agente1@crm.com',
        name: 'Agente Uno',
        hashedPassword,
        role: 'AGENT'
      }
    })

    const agent2 = await prisma.user.create({
      data: {
        email: 'agente2@crm.com',
        name: 'Agente Dos',
        hashedPassword,
        role: 'AGENT'
      }
    })

    console.log('📋 Creando clientes...')
    // Crear clientes uno por uno para mejor debugging
    const cliente1 = await prisma.cliente.create({
      data: {
        nombre: 'Juan Pérez',
        email: 'juan.perez@email.com',
        telefono: '+54 9 11 1234-5678',
        empresa: 'Pérez & Asociados',
        cargo: 'Gerente General',
        direccion: 'Av. Corrientes 1234, CABA',
        fechaNacimiento: new Date('1980-05-15'),
        estado: 'LEAD',
        prioridad: 'ALTA',
        fuente: 'WEBSITE',
        scoreConversion: 8,
        notas: 'Cliente potencial muy interesado en nuestros servicios',
        asignadoA: admin.id,
        fechaRegistro: new Date(),
        ultimoContacto: new Date()
      }
    })

    const cliente2 = await prisma.cliente.create({
      data: {
        nombre: 'María García',
        email: 'maria.garcia@empresa.com',
        telefono: '+54 9 11 2345-6789',
        empresa: 'García Solutions',
        cargo: 'Directora Comercial',
        direccion: 'Puerto Madero 567, CABA',
        fechaNacimiento: new Date('1975-09-22'),
        estado: 'PROSPECTO',
        prioridad: 'MEDIA',
        fuente: 'REFERIDO',
        scoreConversion: 6,
        notas: 'Necesita más información sobre precios',
        asignadoA: manager.id,
        fechaRegistro: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // hace 7 días
        ultimoContacto: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // hace 3 días
      }
    })

    const cliente3 = await prisma.cliente.create({
      data: {
        nombre: 'Carlos Rodriguez',
        email: 'carlos.rodriguez@tech.com',
        telefono: '+54 9 11 3456-7890',
        empresa: 'Tech Innovators',
        cargo: 'CTO',
        direccion: 'Palermo 890, CABA',
        fechaNacimiento: new Date('1985-03-10'),
        estado: 'CLIENTE',
        prioridad: 'ALTA',
        fuente: 'LINKEDIN',
        scoreConversion: 9,
        notas: 'Cliente activo, muy satisfecho con el servicio',
        asignadoA: agent1.id,
        fechaRegistro: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // hace 30 días
        ultimoContacto: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // hace 1 día
      }
    })

    const cliente4 = await prisma.cliente.create({
      data: {
        nombre: 'Ana López',
        email: 'ana.lopez@startup.com',
        telefono: '+54 9 11 4567-8901',
        empresa: 'StartUp Genius',
        cargo: 'CEO',
        direccion: 'Villa Crespo 123, CABA',
        fechaNacimiento: new Date('1990-12-05'),
        estado: 'PERDIDO',
        prioridad: 'BAJA',
        fuente: 'EVENTO',
        scoreConversion: 3,
        notas: 'No avanzó en el proceso de compra',
        asignadoA: agent2.id,
        fechaRegistro: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // hace 60 días
        ultimoContacto: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) // hace 45 días
      }
    })

    const cliente5 = await prisma.cliente.create({
      data: {
        nombre: 'Roberto Silva',
        email: 'roberto.silva@consulta.com',
        telefono: '+54 9 11 5678-9012',
        empresa: 'Silva Consulting',
        cargo: 'Consultor Senior',
        direccion: 'Recoleta 456, CABA',
        fechaNacimiento: new Date('1970-08-18'),
        estado: 'LEAD',
        prioridad: 'MEDIA',
        fuente: 'LLAMADA_FRIA',
        scoreConversion: 5,
        notas: 'Interesado pero necesita aprobación del directorio',
        asignadoA: admin.id,
        fechaRegistro: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // hace 2 días
        ultimoContacto: new Date()
      }
    })

    console.log('📅 Creando actividades...')
    // Crear actividades
    await prisma.actividad.create({
      data: {
        tipo: 'LLAMADA',
        descripcion: 'Llamada inicial de contacto',
        fecha: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        clienteId: cliente1.id,
        usuarioId: admin.id,
        resultado: 'Cliente muy interesado, programar demo'
      }
    })

    await prisma.actividad.create({
      data: {
        tipo: 'EMAIL',
        descripcion: 'Envío de propuesta comercial',
        fecha: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        clienteId: cliente2.id,
        usuarioId: manager.id,
        resultado: 'Propuesta enviada, esperando respuesta'
      }
    })

    await prisma.actividad.create({
      data: {
        tipo: 'REUNION',
        descripcion: 'Reunión de seguimiento',
        fecha: new Date(),
        clienteId: cliente3.id,
        usuarioId: agent1.id,
        resultado: 'Reunión exitosa, cliente satisfecho'
      }
    })

    await prisma.actividad.create({
      data: {
        tipo: 'LLAMADA',
        descripcion: 'Llamada de seguimiento',
        fecha: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        clienteId: cliente4.id,
        usuarioId: agent2.id,
        resultado: 'Cliente no contestó, intentar más tarde'
      }
    })

    await prisma.actividad.create({
      data: {
        tipo: 'EMAIL',
        descripcion: 'Email de bienvenida',
        fecha: new Date(),
        clienteId: cliente5.id,
        usuarioId: admin.id,
        resultado: 'Email enviado correctamente'
      }
    })

    console.log('✅ Base de datos sembrada exitosamente!')
    console.log('📊 Resumen:')
    console.log('- 4 usuarios creados')
    console.log('- 5 clientes creados')
    console.log('- 5 actividades creadas')
    console.log('\n👤 Usuarios de prueba:')
    console.log('- admin@crm.com (ADMIN) - password: 123456')
    console.log('- manager@crm.com (MANAGER) - password: 123456')
    console.log('- agente1@crm.com (AGENT) - password: 123456')
    console.log('- agente2@crm.com (AGENT) - password: 123456')

  } catch (error) {
    console.error('❌ Error durante el sembrado:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('❌ Error sembrando la base de datos:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })