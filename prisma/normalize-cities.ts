import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapeo de variaciones a nombre estandarizado
const cityNormalization: Record<string, string> = {
  // Concepción del Uruguay
  'concepcion del uruguay': 'Concepción del Uruguay',
  'concepción del uruguay': 'Concepción del Uruguay',
  'concepción del uruguay, entre ríos': 'Concepción del Uruguay',
  'concepcion del uruguay, entre rios': 'Concepción del Uruguay',
  'concepción del uruguay (er)': 'Concepción del Uruguay',
  'concepcion del uruguay (er)': 'Concepción del Uruguay',

  // Colón
  'colon': 'Colón',
  'colón': 'Colón',
  'colón, entre ríos': 'Colón',
  'colon, entre rios': 'Colón',
  'colón (er)': 'Colón',
  'colon (er)': 'Colón',

  // Gualeguaychú
  'gualeguaychu': 'Gualeguaychú',
  'gualeguaychú': 'Gualeguaychú',
  'gualeguaychú, entre ríos': 'Gualeguaychú',
  'gualeguaychu, entre rios': 'Gualeguaychú',
  'gualeguaychú (er)': 'Gualeguaychú',
  'gualeguaychu (er)': 'Gualeguaychú',
  'gualeguaychú / concepción del uruguay, entre ríos': 'Gualeguaychú',

  // Basavilbaso
  'basavilbaso': 'Basavilbaso',
  'basavilbaso, entre ríos': 'Basavilbaso',
  'basavilbaso (er)': 'Basavilbaso',

  // Concordia
  'concordia': 'Concordia',
  'concordia, entre ríos': 'Concordia',
  'concordia (er)': 'Concordia',

  // Villa Elisa
  'villa elisa': 'Villa Elisa',
  'villa elisa, entre ríos': 'Villa Elisa',
  'villa elisa (er)': 'Villa Elisa',
  'villa elisa / hocker (er)': 'Villa Elisa',
  'villa elisa / zona (er)': 'Villa Elisa',

  // San José
  'san josé': 'San José',
  'san jose': 'San José',
  'san josé, entre ríos': 'San José',
  'san jose, entre rios': 'San José',
  'san josé (er)': 'San José',
  'san jose (er)': 'San José',

  // Urdinarrain
  'urdinarrain': 'Urdinarrain',
  'urdinarrain, entre ríos': 'Urdinarrain',
  'urdinarrain (er)': 'Urdinarrain',

  // Gualeguay
  'gualeguay': 'Gualeguay',
  'gualeguay, entre ríos': 'Gualeguay',
  'gualeguay (er)': 'Gualeguay',

  // Chajarí
  'chajarí': 'Chajarí',
  'chajari': 'Chajarí',
  'chajarí, entre ríos': 'Chajarí',
  'chajari, entre rios': 'Chajarí',

  // Paraná
  'paraná': 'Paraná',
  'parana': 'Paraná',
  'paraná, entre ríos': 'Paraná',
  'parana, entre rios': 'Paraná',

  // Villaguay
  'villaguay': 'Villaguay',
  'villaguay, entre ríos': 'Villaguay',
  'villaguay (er)': 'Villaguay',

  // Rosario del Tala
  'rosario del tala': 'Rosario del Tala',
  'rosario del tala, entre ríos': 'Rosario del Tala',
  'rosario del tala (er)': 'Rosario del Tala',

  // Larroque
  'larroque': 'Larroque',
  'larroque (er)': 'Larroque',

  // Caseros
  'caseros': 'Caseros',
  'caseros (dpto. uruguay)': 'Caseros',

  // Victoria
  'victoria': 'Victoria',
  'victoria, entre ríos': 'Victoria',

  // Diamante
  'diamante': 'Diamante',
  'diamante, entre ríos': 'Diamante',

  // Crespo
  'crespo, entre ríos': 'Crespo',

  // Federal
  'federal, entre ríos': 'Federal',

  // Nogoyá
  'nogoyá, entre ríos': 'Nogoyá',

  // Viale
  'viale, entre ríos': 'Viale',

  // Libertador San Martín
  'libertador san martín, entre ríos': 'Libertador San Martín',

  // San Justo
  'san justo (entre ríos)': 'San Justo',

  // Pueblo Belgrano
  'pueblo belgrano': 'Pueblo Belgrano',
  'pueblo belgrano (er)': 'Pueblo Belgrano',

  // Villa Mantero
  'villa mantero': 'Villa Mantero',

  // Las Moscas
  'las moscas': 'Las Moscas',

  // Arroyo Barú
  'arroyo barú': 'Arroyo Barú',

  // Paysandú (Uruguay)
  'paysandú (uy)': 'Paysandú (Uruguay)',
};

// Patrones de datos basura que deben ser null
const garbagePatterns = [
  /^https?:\/\//i,  // URLs
  /^\d{5,}/,        // Números de teléfono
  /^no tiene$/i,    // "No tiene"
  /turnos\s*\+/i,   // Texto largo con "Turnos +"
];

function normalizeCity(ciudad: string | null): string | null {
  if (!ciudad) return null;

  const trimmed = ciudad.trim();

  // Verificar si es basura
  for (const pattern of garbagePatterns) {
    if (pattern.test(trimmed)) {
      return null;
    }
  }

  // Buscar en el mapeo (case-insensitive)
  const normalized = cityNormalization[trimmed.toLowerCase()];
  if (normalized) {
    return normalized;
  }

  // Si no está en el mapeo, devolver el valor original con trim
  return trimmed;
}

async function main() {
  console.log('🔄 Normalizando ciudades...\n');

  // Obtener todos los clientes con ciudad
  const clientes = await prisma.cliente.findMany({
    where: { ciudad: { not: null } },
    select: { id: true, ciudad: true }
  });

  console.log(`📊 Total de clientes con ciudad: ${clientes.length}\n`);

  let updated = 0;
  let nullified = 0;
  let unchanged = 0;

  for (const cliente of clientes) {
    const normalized = normalizeCity(cliente.ciudad);

    if (normalized !== cliente.ciudad) {
      await prisma.cliente.update({
        where: { id: cliente.id },
        data: { ciudad: normalized }
      });

      if (normalized === null) {
        nullified++;
        console.log(`🗑️  "${cliente.ciudad}" → null`);
      } else {
        updated++;
        console.log(`✏️  "${cliente.ciudad}" → "${normalized}"`);
      }
    } else {
      unchanged++;
    }
  }

  console.log('\n📈 Resumen:');
  console.log(`   ✅ Actualizados: ${updated}`);
  console.log(`   🗑️  Limpiados (null): ${nullified}`);
  console.log(`   ⏭️  Sin cambios: ${unchanged}`);

  // Mostrar ciudades finales
  console.log('\n📍 Ciudades estandarizadas:');
  const ciudadesFinales = await prisma.cliente.groupBy({
    by: ['ciudad'],
    _count: { ciudad: true },
    where: { ciudad: { not: null } },
    orderBy: { _count: { ciudad: 'desc' } }
  });

  ciudadesFinales.forEach(c => {
    console.log(`   ${c.ciudad}: ${c._count.ciudad}`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
