import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

interface Cliente {
  id: string;
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
  industria?: string | null;
  sitioWeb?: string | null;
}

interface SearchOptions {
  useAdvancedSearch: boolean;
  confidenceLevel: number;
  timestamp: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cliente, options }: { cliente: Cliente; options: SearchOptions } = body;

    logger.info('OpenAI Search request', { clienteId: cliente.id, clienteName: cliente.nombre });

    // Verificar que tenemos OpenAI API Key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      logger.error('OpenAI API Key not configured');
      return NextResponse.json({
        success: false,
        error: 'API Key de OpenAI no configurada'
      }, { status: 500 });
    }

    // Construir el prompt para OpenAI
    const prompt = buildSearchPrompt(cliente, options);

    // Configuración de la llamada a OpenAI
    const openaiConfig = {
      model: options.useAdvancedSearch ? 'gpt-4' : 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente especializado en investigación de empresas y contactos comerciales. Responde siempre en formato JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    };

    logger.debug('Calling OpenAI', { model: openaiConfig.model });

    // Llamar a OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(openaiConfig),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      logger.error('OpenAI API error', new Error(errorText), { status: openaiResponse.status });
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
    }

    const openaiResult = await openaiResponse.json();

    // Extraer y parsear la respuesta
    const aiContent = openaiResult.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No se recibió contenido de OpenAI');
    }

    // Intentar parsear como JSON
    let parsedData;
    try {
      parsedData = JSON.parse(aiContent);
    } catch (parseError) {
      logger.error('JSON parse error from OpenAI', parseError instanceof Error ? parseError : new Error(String(parseError)));
      throw new Error('La respuesta de OpenAI no es JSON válido');
    }

    // Procesar y validar los datos
    const enrichedData = processOpenAIResponse(parsedData, options.confidenceLevel);

    // Actualizar ultimaIA en la base de datos
    await prisma.cliente.update({
      where: { id: cliente.id },
      data: { ultimaIA: new Date() }
    });

    logger.info('OpenAI Search completed', {
      clienteId: cliente.id,
      tokensUsed: openaiResult.usage?.total_tokens || 0
    });

    const response = {
      success: true,
      enrichedData,
      metadata: {
        model: openaiConfig.model,
        confidence: options.confidenceLevel,
        timestamp: options.timestamp,
        tokensUsed: openaiResult.usage?.total_tokens || 0
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    logger.error('OpenAI Search error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

function buildSearchPrompt(cliente: Cliente, options: SearchOptions): string {
  const confidenceText = options.confidenceLevel < 0.4 ? 'muy conservador' : 
                        options.confidenceLevel < 0.7 ? 'moderado' : 'agresivo';

  return `
Busca información actualizada sobre esta empresa/cliente:

DATOS ACTUALES:
- Nombre: ${cliente.nombre}
- Email: ${cliente.email || 'No disponible'}
- Teléfono: ${cliente.telefono || 'No disponible'}
- Dirección: ${cliente.direccion || 'No disponible'}
- Ciudad: ${cliente.ciudad || 'No disponible'}
- Provincia: ${cliente.provincia || 'No disponible'}
- Industria: ${cliente.industria || 'No disponible'}
- Sitio Web: ${cliente.sitioWeb || 'No disponible'}

INSTRUCCIONES:
1. Busca información actualizada de contacto, redes sociales y sitio web
2. Nivel de confianza: ${confidenceText} (${options.confidenceLevel})
3. Solo incluye datos con alta probabilidad de ser correctos
4. Si el nivel es conservador, sé muy selectivo con los datos

FORMATO DE RESPUESTA (JSON estricto):
{
  "telefono": "número si es diferente al actual",
  "whatsapp": "número de WhatsApp si encontrado",
  "email": "email si es diferente al actual", 
  "instagram": "@usuario si encontrado",
  "facebook": "/pagina si encontrado",
  "linkedin": "/empresa si encontrado",
  "twitter": "@usuario si encontrado",
  "sitioWeb": "URL completa si encontrado",
  "tieneSSL": true/false si determinable,
  "esResponsive": true/false si determinable,
  "direccionCompleta": "dirección completa si es más detallada",
  "confidence": ${options.confidenceLevel},
  "fuentes": ["lista de fuentes consultadas"],
  "notas": "observaciones adicionales"
}

IMPORTANTE: Responde SOLO con JSON válido, sin texto adicional.
`;
}

function processOpenAIResponse(data: any, confidenceLevel: number) {
  // Filtrar datos basado en el nivel de confianza
  const processed = { ...data };
  
  // Si el nivel de confianza es bajo, ser más estricto
  if (confidenceLevel < 0.4) {
    // Solo mantener datos que tengan fuentes muy confiables
    Object.keys(processed).forEach(key => {
      if (key !== 'confidence' && key !== 'fuentes' && key !== 'notas') {
        if (!processed[key] || processed[key] === 'No disponible') {
          delete processed[key];
        }
      }
    });
  }
  
  return processed;
}