#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

// Mapeo de industrias/rubros
const INDUSTRIA_MAPPING = {
  'Gastronomía': 'GASTRONOMIA',
  'Salud y Medicina': 'SALUD',
  'Indumentaria y Calzado': 'INDUMENTARIA',
  'Belleza y Estética': 'BELLEZA',
  'Deporte y Fitness': 'DEPORTES', 
  'Comercio Minorista': 'COMERCIO',
  'Construcción e Inmuebles': 'CONSTRUCCION',
  'Servicios Profesionales': 'SERVICIOS',
  'Industria y Producción': 'INDUSTRIA',
  'Turismo y Hotelería': 'TURISMO',
  'Cultura y Papelerías': 'CULTURA',
  'Sin Clasificar': 'OTROS'
};

async function readJSONFiles() {
  const jsonDir = path.resolve('../json-output');
  const files = await fs.readdir(jsonDir);
  const jsonFiles = files.filter(file => file.endsWith('.json') && file !== 'reporte-procesamiento.json');
  
  let allClients = [];
  
  console.log(`📁 Encontrados ${jsonFiles.length} archivos JSON`);
  
  for (const file of jsonFiles) {
    console.log(`📄 Procesando: ${file}`);
    
    const filePath = path.join(jsonDir, file);
    const content = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(content);
    
    if (data.clientes && Array.isArray(data.clientes)) {
      const rubro = data.rubro_principal;
      
      for (const cliente of data.clientes) {
        const clienteProcessed = processClient(cliente, rubro);
        if (clienteProcessed) {
          allClients.push(clienteProcessed);
        }
      }
      
      console.log(`   ✓ ${data.clientes.length} clientes agregados de ${rubro}`);
    }
  }
  
  return allClients;
}

function processClient(cliente, rubroPrincipal) {
  if (!cliente.nombre || cliente.nombre.trim() === '') {
    return null; // Skip clientes sin nombre
  }

  // Extraer información de contacto
  let telefono = cliente.contact?.telefono || null;
  if (telefono === 'N/D' || telefono === '') telefono = null;
  
  const instagram = cliente.contact?.social_networks?.instagram;
  
  let email = cliente.contact?.email || null;
  if (email === 'N/D' || email === '') email = null;

  // Procesar dirección
  let ciudad = cliente.localidad || null;
  if (ciudad === 'N/D' || ciudad === '') ciudad = null;
  
  let provincia = null;
  let direccion = cliente.direccion || null;
  if (direccion === 'N/D' || direccion === '') direccion = null;
  
  if (direccion) {
    // Intentar extraer provincia de la dirección
    if (direccion.includes('Entre Ríos')) {
      provincia = 'Entre Ríos';
    } else if (direccion.includes('Buenos Aires')) {
      provincia = 'Buenos Aires';
    } else if (direccion.includes('Córdoba')) {
      provincia = 'Córdoba';
    }
    // Agregar más provincias según sea necesario
  }

  // Determinar industria
  const industria = INDUSTRIA_MAPPING[rubroPrincipal] || 'OTROS';
  
  // Determinar fuente (todos son importados)
  const fuente = 'IMPORTADO';
  
  // Estado inicial
  const estado = 'NUEVO';
  
  // Prioridad basada en si tiene contacto
  let prioridad = 'MEDIA';
  if (telefono && (instagram || email)) {
    prioridad = 'ALTA';
  } else if (!telefono && !instagram && !email) {
    prioridad = 'BAJA';
  }

  // Score de conversión básico
  let scoreConversion = 0.5; // Base score
  if (telefono) scoreConversion += 0.2;
  if (instagram) scoreConversion += 0.1;
  if (email) scoreConversion += 0.2;
  
  // Crear notas con información adicional
  let notas = `Rubro: ${cliente.rubro?.subRubro || cliente.rubro_legacy || 'N/A'}`;
  if (instagram) {
    notas += `\nInstagram: @${instagram}`;
  }
  if (cliente.web_site?.url) {
    notas += `\nWebsite: ${cliente.web_site.url}`;
  }

  return {
    nombre: cliente.nombre.trim(),
    email: email,
    telefono: telefono,
    direccion: direccion,
    ciudad: ciudad,
    provincia: provincia,
    industria: industria,
    fuente: fuente,
    estado: estado,
    prioridad: prioridad,
    scoreConversion: Math.min(scoreConversion, 1.0),
    notas: notas
  };
}

async function seedDatabase() {
  try {
    console.log('🌱 Iniciando seed de clientes...\n');
    
    // Leer todos los archivos JSON
    const clientes = await readJSONFiles();
    console.log(`\n📊 Total de clientes procesados: ${clientes.length}`);
    
    // Limpiar tabla de clientes existente (opcional)
    console.log('\n🗑️  Limpiando clientes existentes...');
    await prisma.cliente.deleteMany();
    
    // Insertar clientes en lotes para mejor performance
    const BATCH_SIZE = 100;
    let insertedCount = 0;
    
    console.log('\n📥 Insertando clientes en la base de datos...');
    
    for (let i = 0; i < clientes.length; i += BATCH_SIZE) {
      const batch = clientes.slice(i, i + BATCH_SIZE);
      
      try {
        await prisma.cliente.createMany({
          data: batch
        });
        
        insertedCount += batch.length;
        console.log(`   ✓ Insertados ${insertedCount}/${clientes.length} clientes`);
        
      } catch (error) {
        console.error(`   ❌ Error en lote ${i + 1}-${i + batch.length}:`, error.message);
        
        // Intentar insertar uno por uno si falla el lote
        for (const cliente of batch) {
          try {
            await prisma.cliente.create({
              data: cliente
            });
            insertedCount++;
          } catch (singleError) {
            console.error(`     ❌ Error al insertar ${cliente.nombre}:`, singleError.message);
          }
        }
      }
    }
    
    // Mostrar estadísticas finales
    console.log('\n📈 Estadísticas finales:');
    
    const stats = await prisma.cliente.groupBy({
      by: ['industria'],
      _count: {
        industria: true
      }
    });
    
    stats.forEach(stat => {
      console.log(`   ${stat.industria}: ${stat._count.industria} clientes`);
    });
    
    const total = await prisma.cliente.count();
    console.log(`\n✅ Seed completado exitosamente: ${total} clientes en total`);
    
  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el seed
if (require.main === module) {
  seedDatabase()
    .catch((error) => {
      console.error('Error crítico:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };