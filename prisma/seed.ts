/**
 * Global seed script — one command to load all data.
 *
 * Usage: npx tsx prisma/seed.ts  (or: npm run db:seed)
 *
 * Order:
 *  1. Clean all tables (child tables first)
 *  2. Users (4 default users)
 *  3. Clientes (from JSON data files)
 *  4. Plantillas de contacto (12 templates)
 */

import { PrismaClient } from '@prisma/client';
import { seedUsers, seedClientes } from './seed-restore';
import { seedPlantillas } from './seed-plantillas';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed global — Cargando todos los datos...\n');

  // ── Step 0: Clean all tables (child tables first) ──
  console.log('🧹 Limpiando datos existentes...');
  await prisma.mensaje.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.clienteEnrichment.deleteMany({});
  await prisma.websiteAnalysis.deleteMany({});
  await prisma.actividad.deleteMany({});
  await prisma.cliente.deleteMany({});
  await prisma.plantillaContacto.deleteMany({});
  await prisma.verification.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('✅ Base de datos limpia\n');

  // ── Step 1: Users ──
  await seedUsers(prisma);

  // ── Step 2: Clientes ──
  await seedClientes(prisma);

  // ── Step 3: Plantillas ──
  await seedPlantillas(prisma);

  // ── Summary ──
  const [users, clientes, plantillas] = await Promise.all([
    prisma.user.count(),
    prisma.cliente.count(),
    prisma.plantillaContacto.count(),
  ]);

  console.log('\n🎉 Seed global completado!');
  console.log('📊 Resumen:');
  console.log(`   👥 ${users} usuarios`);
  console.log(`   📋 ${clientes} clientes`);
  console.log(`   📧 ${plantillas} plantillas`);
  const displayPassword = process.env.SEED_PASSWORD ? '(from SEED_PASSWORD env)' : '123456';
  console.log('\n🔑 Credenciales de acceso:');
  console.log(`   👤 Admin: admin@crm.com / ${displayPassword}`);
  console.log(`   👤 Manager: manager@crm.com / ${displayPassword}`);
  console.log(`   👤 Agente 1: agent1@crm.com / ${displayPassword}`);
  console.log(`   👤 Agente 2: agent2@crm.com / ${displayPassword}`);
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
