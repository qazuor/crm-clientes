import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Ejecutando seed para el CRM...\n');

  try {
    // Limpiar datos existentes (opcional)
    console.log('🧹 Limpiando datos existentes...');
    await prisma.actividad.deleteMany();
    await prisma.cliente.deleteMany();
    await prisma.user.deleteMany();

    // Crear usuarios
    console.log('👥 Creando usuarios...');
    const hashedPassword = await bcrypt.hash('123456', 10);

    const admin = await prisma.user.create({
      data: {
        email: 'admin@crm.com',
        name: 'Admin Usuario',
        password: hashedPassword,
        role: 'ADMIN'
      }
    });

    const agent1 = await prisma.user.create({
      data: {
        email: 'agente1@crm.com',
        name: 'Juan Agente',
        password: hashedPassword,
        role: 'AGENT'
      }
    });

    const agent2 = await prisma.user.create({
      data: {
        email: 'agente2@crm.com',
        name: 'María Agente',
        password: hashedPassword,
        role: 'AGENT'
      }
    });

    console.log('📋 Creando clientes de prueba...');

    // Clientes con sitios web para probar enriquecimiento
    const cliente1 = await prisma.cliente.create({
      data: {
        nombre: 'Google Inc',
        email: 'contact@google.com',
        telefono: '+1-650-253-0000',
        sitioWeb: 'https://www.google.com',
        direccion: '1600 Amphitheatre Parkway',
        ciudad: 'Mountain View',
        provincia: 'California',
        industria: 'Tecnología',
        estado: 'NUEVO',
        prioridad: 'ALTA',
        agentId: agent1.id,
        notas: 'Cliente para probar enriquecimiento - sitio web muy optimizado'
      }
    });

    const cliente2 = await prisma.cliente.create({
      data: {
        nombre: 'Microsoft Corporation',
        email: 'info@microsoft.com',
        telefono: '+1-425-882-8080',
        sitioWeb: 'https://www.microsoft.com',
        direccion: 'One Microsoft Way',
        ciudad: 'Redmond',
        provincia: 'Washington',
        industria: 'Tecnología',
        estado: 'CONTACTADO',
        prioridad: 'ALTA',
        agentId: agent1.id,
        notas: 'Otro cliente para probar enriquecimiento'
      }
    });

    const cliente3 = await prisma.cliente.create({
      data: {
        nombre: 'Netflix Inc',
        email: 'hello@netflix.com',
        telefono: '+1-408-540-3700',
        sitioWeb: 'https://www.netflix.com',
        direccion: '100 Winchester Circle',
        ciudad: 'Los Gatos',
        provincia: 'California',
        industria: 'Entretenimiento',
        estado: 'CALIFICADO',
        prioridad: 'MEDIA',
        agentId: agent2.id,
        notas: 'Streaming service - sitio web responsive'
      }
    });

    const cliente4 = await prisma.cliente.create({
      data: {
        nombre: 'Panadería Local',
        email: 'contacto@panaderialocal.com',
        telefono: '+54 11 4567-8901',
        sitioWeb: 'https://ejemplo-sitio-lento.com', // Un sitio que no existe para probar errores
        direccion: 'Av. Corrientes 1234',
        ciudad: 'Buenos Aires',
        provincia: 'CABA',
        industria: 'Alimentación',
        estado: 'NUEVO',
        prioridad: 'BAJA',
        agentId: agent2.id,
        notas: 'Cliente local para probar casos edge'
      }
    });

    const cliente5 = await prisma.cliente.create({
      data: {
        nombre: 'Cliente Sin Website',
        email: 'sinweb@empresa.com',
        telefono: '+54 11 9876-5432',
        direccion: 'Calle Falsa 123',
        ciudad: 'Mar del Plata',
        provincia: 'Buenos Aires',
        industria: 'Servicios',
        estado: 'NUEVO',
        prioridad: 'MEDIA',
        agentId: agent1.id,
        notas: 'Cliente sin sitio web para probar flujos alternativos'
      }
    });

    console.log('📝 Creando actividades de ejemplo...');

    // Algunas actividades de ejemplo
    await prisma.actividad.create({
      data: {
        tipo: 'CLIENTE_CREADO',
        descripcion: `Cliente ${cliente1.nombre} creado en el sistema`,
        clienteId: cliente1.id,
        usuarioId: admin.id,
        esAutomatica: true
      }
    });

    await prisma.actividad.create({
      data: {
        tipo: 'LLAMADA',
        descripcion: 'Primera llamada de contacto - muy interesados',
        clienteId: cliente1.id,
        usuarioId: agent1.id,
        resultado: 'POSITIVO',
        proximoPaso: 'Enviar propuesta comercial'
      }
    });

    await prisma.actividad.create({
      data: {
        tipo: 'EMAIL',
        descripcion: 'Email de seguimiento enviado',
        clienteId: cliente2.id,
        usuarioId: agent1.id,
        resultado: 'PENDIENTE',
        proximoPaso: 'Esperar respuesta'
      }
    });

    console.log('✅ Seed completado exitosamente!\n');
    
    console.log('📊 Resumen:');
    console.log(`   👥 ${await prisma.user.count()} usuarios creados`);
    console.log(`   📋 ${await prisma.cliente.count()} clientes creados`);
    console.log(`   📝 ${await prisma.actividad.count()} actividades creadas\n`);
    
    console.log('🔑 Credenciales de prueba:');
    console.log('   Admin: admin@crm.com / 123456');
    console.log('   Agente 1: agente1@crm.com / 123456');
    console.log('   Agente 2: agente2@crm.com / 123456\n');
    
    console.log('🌐 Clientes para probar enriquecimiento:');
    console.log('   • Google (https://www.google.com)');
    console.log('   • Microsoft (https://www.microsoft.com)');
    console.log('   • Netflix (https://www.netflix.com)');
    console.log('   • Panadería Local (sitio ficticio para probar errores)');
    console.log('   • Cliente Sin Website (para probar flujos sin sitio web)');

  } catch (error) {
    console.error('❌ Error ejecutando seed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('💥 Seed falló:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });