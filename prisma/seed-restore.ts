/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient, FuenteCliente, EstadoCliente, PrioridadCliente } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

// Función para limpiar y validar email
function cleanEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') return null;
  const cleaned = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(cleaned) ? cleaned : null;
}

// Función para limpiar teléfono
function cleanPhone(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== 'string') return null;
  const cleaned = phone.trim().replace(/\s+/g, ' ');
  if (cleaned.length === 0 || cleaned === 'N/D') return null;
  return cleaned;
}

// Función para limpiar texto general
function cleanText(text: string | null | undefined): string | null {
  if (!text || typeof text !== 'string') return null;
  const cleaned = text.trim();
  if (cleaned.length === 0 || cleaned === 'N/D') return null;
  return cleaned;
}

// Función para extraer sitio web
function extractWebsite(cliente: any): string | null {
  if (cliente.web_site?.url) return cleanText(cliente.web_site.url);
  if (cliente.website) return cleanText(cliente.website);
  if (cliente.sitio_web) return cleanText(cliente.sitio_web);
  return null;
}

// Función para determinar fuente
function determineFuente(): FuenteCliente {
  return FuenteCliente.IMPORTADO; // Cargados desde archivo JSON
}

// Función para determinar estado inicial
function determineEstado(): EstadoCliente {
  return EstadoCliente.NUEVO;
}

// Función para determinar prioridad
function determinePrioridad(): PrioridadCliente {
  return PrioridadCliente.MEDIA;
}

async function loadJsonData() {
  const jsonPath = path.resolve(__dirname, '..', 'data', 'json-clientes');
  const files = fs.readdirSync(jsonPath).filter(file => file.endsWith('.json') && file !== 'reporte-procesamiento.json');
  
  const allClients: any[] = [];
  
  for (const file of files) {
    try {
      const filePath = path.join(jsonPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      if (data.clientes && Array.isArray(data.clientes)) {
        console.log(`📂 Cargando ${data.clientes.length} clientes desde ${file}`);
        allClients.push(...data.clientes.map((cliente: any) => ({
          ...cliente,
          rubro_principal: data.rubro_principal
        })));
      }
    } catch (error) {
      console.error(`❌ Error al cargar ${file}:`, error);
    }
  }
  
  return allClients;
}

/**
 * Create the 4 default system users.
 * Exported so the global seed.ts can call it.
 */
export async function seedUsers(prisma: PrismaClient) {
  console.log('👥 Creando usuarios del sistema...');

  const seedPassword = process.env.SEED_PASSWORD;
  if (!seedPassword && process.env.NODE_ENV === 'production') {
    throw new Error(
      'SEED_PASSWORD env var is required in production. Set a strong password before running the seed.'
    );
  }
  const password = seedPassword || '123456';
  const hashedPassword = await bcrypt.hash(password, 12);

  const users = [
    { email: 'admin@crm.com', name: 'Administrador', role: 'ADMIN' as const },
    { email: 'manager@crm.com', name: 'Gerente de Ventas', role: 'MANAGER' as const },
    { email: 'agent1@crm.com', name: 'Agente Comercial 1', role: 'AGENT' as const },
    { email: 'agent2@crm.com', name: 'Agente Comercial 2', role: 'AGENT' as const },
  ];

  for (const userData of users) {
    const user = await prisma.user.create({
      data: { email: userData.email, name: userData.name, role: userData.role, emailVerified: true },
    });
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: 'credential',
        password: hashedPassword,
      },
    });
  }

  console.log('✅ Usuarios creados');
}

/**
 * Load and insert clients from JSON data files.
 * Exported so the global seed.ts can call it.
 */
export async function seedClientes(prisma: PrismaClient) {
  console.log('\n📊 Cargando datos reales desde archivos JSON...');
  const clientesData = await loadJsonData();
  console.log(`📈 Total de clientes a procesar: ${clientesData.length}`);

  const batchSize = 100;
  let processed = 0;
  let errors = 0;
  let successCount = 0;

  for (let i = 0; i < clientesData.length; i += batchSize) {
    const batch = clientesData.slice(i, i + batchSize);

    const clientesToCreate = batch.map((cliente, index) => {
      const globalIndex = i + index;
      const nombre = cleanText(cliente.nombre) || `Cliente ${globalIndex + 1}`;
      const email = cleanEmail(cliente.contact?.email);
      const telefono = cleanPhone(cliente.contact?.telefono);
      const whatsapp = cleanPhone(cliente.contact?.whatsapp);
      const direccion = cleanText(cliente.direccion);
      const localidad = cleanText(cliente.localidad);
      const provincia = cleanText(cliente.provincia);
      const sitioWeb = extractWebsite(cliente);
      const instagram = cleanText(cliente.contact?.social_networks?.instagram);
      const facebook = cleanText(cliente.contact?.social_networks?.facebook);
      const linkedin = cleanText(cliente.contact?.social_networks?.linkedin);
      const twitter = cleanText(cliente.contact?.social_networks?.twitter);
      const tieneSSL = cliente.web_site?.web_analysis?.tiene_ssl || null;
      const esResponsive = cliente.web_site?.web_analysis?.responsive || null;
      const industria = cliente.rubro?.principal || cliente.rubro_principal || 'Otro';

      return {
        nombre, email, telefono, whatsapp, direccion,
        ciudad: localidad, provincia, industria, sitioWeb,
        instagram, facebook, linkedin, twitter, tieneSSL, esResponsive,
        fuente: determineFuente(),
        estado: determineEstado(),
        prioridad: determinePrioridad(),
        fechaCreacion: new Date(),
        notas: `Cliente del rubro: ${industria}${cliente.rubro?.subRubro ? ` - ${cliente.rubro.subRubro}` : ''}`,
      };
    });

    try {
      for (const cliente of clientesToCreate) {
        try {
          await prisma.cliente.create({ data: cliente });
          successCount++;
        } catch (createError) {
          errors++;
          console.error(`❌ Error al crear cliente ${cliente.nombre}:`, createError);
        }
        processed++;
      }
      console.log(`✅ Procesados ${processed}/${clientesData.length} clientes (${successCount} exitosos, ${errors} errores)`);
    } catch (error) {
      console.error(`❌ Error en lote ${Math.floor(i / batchSize) + 1}:`, error);
    }
  }

  console.log(`\n✅ Clientes: ${successCount} exitosos, ${errors} errores`);

  // Estadísticas por industria
  const stats = await prisma.cliente.groupBy({
    by: ['industria'],
    _count: { industria: true },
    orderBy: { _count: { industria: 'desc' } },
  });
  console.log('📈 Clientes por industria:');
  stats.slice(0, 10).forEach((stat, index) => {
    console.log(`   ${index + 1}. ${stat.industria}: ${stat._count.industria} clientes`);
  });
}

// ─── Standalone runner ──────────────────────────────────────────────
// Allows running: npx tsx prisma/seed-restore.ts
if (require.main === module) {
  const prisma = new PrismaClient();
  (async () => {
    console.log('🔄 Restaurando datos reales desde archivos JSON...\n');
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

    await seedUsers(prisma);
    await seedClientes(prisma);

    const displayPassword = process.env.SEED_PASSWORD ? '(from SEED_PASSWORD env)' : '123456';
    console.log('\n🔑 Credenciales de acceso:');
    console.log(`   👤 Admin: admin@crm.com / ${displayPassword}`);
    console.log(`   👤 Manager: manager@crm.com / ${displayPassword}`);
    console.log(`   👤 Agente 1: agent1@crm.com / ${displayPassword}`);
    console.log(`   👤 Agente 2: agent2@crm.com / ${displayPassword}`);
  })()
    .catch((e) => {
      console.error('❌ Error en el seed:', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}