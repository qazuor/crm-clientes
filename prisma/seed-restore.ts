/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient, FuenteCliente, EstadoCliente, PrioridadCliente } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

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

async function main() {
  console.log('🔄 Restaurando datos reales desde archivos JSON...\n');

  try {
    // Limpiar datos existentes (orden: tablas hijas primero)
    console.log('🧹 Limpiando datos existentes...');
    await prisma.mensaje.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.clienteEnrichment.deleteMany({});
    await prisma.websiteAnalysis.deleteMany({});
    await prisma.actividad.deleteMany({});
    await prisma.cliente.deleteMany({});
    await prisma.plantillaContacto.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.user.deleteMany({});

    // Crear usuarios
    console.log('👥 Creando usuarios del sistema...');
    const hashedPassword = await bcrypt.hash('123456', 12);
    
    await prisma.user.create({
      data: {
        email: 'admin@crm.com',
        name: 'Administrador',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    await prisma.user.create({
      data: {
        email: 'manager@crm.com',
        name: 'Gerente de Ventas',
        password: hashedPassword,
        role: 'MANAGER',
      },
    });

    await prisma.user.create({
      data: {
        email: 'agent1@crm.com',
        name: 'Agente Comercial 1',
        password: hashedPassword,
        role: 'AGENT',
      },
    });

    await prisma.user.create({
      data: {
        email: 'agent2@crm.com',
        name: 'Agente Comercial 2',
        password: hashedPassword,
        role: 'AGENT',
      },
    });

    console.log('✅ Usuarios creados');

    // Cargar datos desde JSON
    console.log('\n📊 Cargando datos reales desde archivos JSON...');
    const clientesData = await loadJsonData();
    console.log(`📈 Total de clientes a procesar: ${clientesData.length}`);

    // Procesar clientes en lotes
    const batchSize = 100;
    let processed = 0;
    let errors = 0;
    let successCount = 0;

    for (let i = 0; i < clientesData.length; i += batchSize) {
      const batch = clientesData.slice(i, i + batchSize);
      
      const clientesToCreate = batch.map((cliente, index) => {
        const globalIndex = i + index;

        // Extraer datos del cliente
        const nombre = cleanText(cliente.nombre) || `Cliente ${globalIndex + 1}`;
        const email = cleanEmail(cliente.contact?.email);
        const telefono = cleanPhone(cliente.contact?.telefono);
        const whatsapp = cleanPhone(cliente.contact?.whatsapp);
        const direccion = cleanText(cliente.direccion);
        const localidad = cleanText(cliente.localidad);
        const provincia = cleanText(cliente.provincia);
        const sitioWeb = extractWebsite(cliente);
        
        // Datos de redes sociales
        const instagram = cleanText(cliente.contact?.social_networks?.instagram);
        const facebook = cleanText(cliente.contact?.social_networks?.facebook);
        const linkedin = cleanText(cliente.contact?.social_networks?.linkedin);
        const twitter = cleanText(cliente.contact?.social_networks?.twitter);
        
        // Datos técnicos del sitio web
        const tieneSSL = cliente.web_site?.web_analysis?.tiene_ssl || null;
        const esResponsive = cliente.web_site?.web_analysis?.responsive || null;
        
        // Industria y rubro
        const industria = cliente.rubro?.principal || cliente.rubro_principal || 'Otro';
        
        return {
          nombre,
          email,
          telefono,
          whatsapp,
          direccion,
          ciudad: localidad,
          provincia,
          industria,
          sitioWeb,
          instagram,
          facebook,
          linkedin,
          twitter,
          tieneSSL,
          esResponsive,
          fuente: determineFuente(),
          estado: determineEstado(),
          prioridad: determinePrioridad(),
          fechaCreacion: new Date(),
          notas: `Cliente del rubro: ${industria}${cliente.rubro?.subRubro ? ` - ${cliente.rubro.subRubro}` : ''}`
        };
      });

      try {
        for (const cliente of clientesToCreate) {
          try {
            await prisma.cliente.create({
              data: cliente
            });
            successCount++;
          } catch (createError) {
            errors++;
            console.error(`❌ Error al crear cliente ${cliente.nombre}:`, createError);
          }
          processed++;
        }
        console.log(`✅ Procesados ${processed}/${clientesData.length} clientes (${successCount} exitosos, ${errors} errores)`);
      } catch (error) {
        console.error(`❌ Error en lote ${Math.floor(i/batchSize) + 1}:`, error);
      }
    }

    console.log('\n🎉 Restauración completada!');
    console.log('📊 Resumen final:');
    console.log(`   👥 ${await prisma.user.count()} usuarios`);
    console.log(`   📋 ${await prisma.cliente.count()} clientes`);
    console.log(`   ✅ ${successCount} clientes procesados exitosamente`);
    console.log(`   ❌ ${errors} errores durante el proceso`);

    // Estadísticas por industria
    console.log('\n📈 Clientes por industria:');
    const stats = await prisma.cliente.groupBy({
      by: ['industria'],
      _count: { industria: true },
      orderBy: { _count: { industria: 'desc' } }
    });

    stats.slice(0, 10).forEach((stat, index) => {
      console.log(`   ${index + 1}. ${stat.industria}: ${stat._count.industria} clientes`);
    });

    console.log('\n🔑 Credenciales de acceso:');
    console.log('   👤 Admin: admin@crm.com / 123456');
    console.log('   👤 Manager: manager@crm.com / 123456');
    console.log('   👤 Agente 1: agent1@crm.com / 123456');
    console.log('   👤 Agente 2: agent2@crm.com / 123456');

  } catch (error) {
    console.error('❌ Error fatal durante la restauración:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });