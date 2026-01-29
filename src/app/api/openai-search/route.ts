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

    logger.info('[OpenAI Search] Request started', {
      clienteId: cliente.id,
      clienteName: cliente.nombre,
      useAdvancedSearch: options.useAdvancedSearch,
      confidenceLevel: options.confidenceLevel,
    });

    logger.debug('[OpenAI Search] Client data for search', {
      nombre: cliente.nombre,
      ciudad: cliente.ciudad || '(not provided)',
      industria: cliente.industria || '(not provided)',
    });

    // Verificar que tenemos OpenAI API Key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      logger.error('[OpenAI Search] API Key not configured');
      return NextResponse.json({
        success: false,
        error: 'API Key de OpenAI no configurada'
      }, { status: 500 });
    }

    // Construir el prompt para OpenAI
    const prompt = buildSearchPrompt(cliente, options);

    logger.debug('[OpenAI Search] Prompt generated', {
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 500) + '...',
    });

    // Configurar temperatura y top_p según nivel de confianza
    // Baja confianza (conservador): temperatura baja = más preciso, menos creativo
    // Alta confianza (agresivo): temperatura alta = más creativo, más resultados potenciales
    const confidenceConfig = getConfidenceConfig(options.confidenceLevel);

    logger.debug('[OpenAI Search] Confidence config', {
      confidenceLevel: options.confidenceLevel,
      temperature: confidenceConfig.temperature,
      topP: confidenceConfig.topP,
    });

    // Configuración de la llamada a OpenAI Responses API con Web Search
    const model = options.useAdvancedSearch ? 'gpt-4o' : 'gpt-4o-mini';

    // Construir el input combinando system prompt y user prompt
    const fullPrompt = `${getSystemPrompt()}\n\n---\n\n${prompt}`;

    const openaiConfig = {
      model,
      input: fullPrompt,
      tools: [
        {
          type: 'web_search',
          // search_context_size: 'medium' // low, medium, high - affects cost/quality
        }
      ],
      temperature: confidenceConfig.temperature,
      top_p: confidenceConfig.topP,
      max_output_tokens: 2500
    };

    logger.info('[OpenAI Search] Calling OpenAI Responses API with Web Search', {
      model: openaiConfig.model,
      temperature: openaiConfig.temperature,
      topP: openaiConfig.top_p,
      maxOutputTokens: openaiConfig.max_output_tokens,
      webSearchEnabled: true,
    });

    // Llamar a OpenAI Responses API (con web search)
    const startTime = Date.now();
    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(openaiConfig),
    });
    const elapsed = Date.now() - startTime;

    logger.debug('[OpenAI Search] API response received', {
      status: openaiResponse.status,
      elapsed,
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      logger.error('[OpenAI Search] API error', new Error(errorText), {
        status: openaiResponse.status,
        elapsed,
        errorPreview: errorText.substring(0, 500),
      });
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
    }

    const openaiResult = await openaiResponse.json();

    logger.debug('[OpenAI Search] API result metadata', {
      id: openaiResult.id,
      status: openaiResult.status,
      usage: openaiResult.usage,
    });

    // Extraer contenido de la Responses API
    // La estructura es diferente: output_text contiene el texto, output contiene items
    let aiContent = openaiResult.output_text;

    // Si no hay output_text, intentar extraer del array output
    if (!aiContent && openaiResult.output) {
      const textItem = openaiResult.output.find((item: { type: string }) => item.type === 'message');
      if (textItem?.content) {
        const textContent = textItem.content.find((c: { type: string }) => c.type === 'output_text' || c.type === 'text');
        aiContent = textContent?.text || textContent?.output_text;
      }
    }

    logger.debug('[OpenAI Search] Web search annotations', {
      hasAnnotations: !!openaiResult.output?.some((item: { type: string }) => item.type === 'web_search_call'),
      searchQueries: openaiResult.output?.filter((item: { type: string }) => item.type === 'web_search_call')?.length || 0,
    });

    if (!aiContent) {
      logger.error('[OpenAI Search] No content in response', undefined, {
        outputItems: openaiResult.output?.length || 0,
        hasOutputText: !!openaiResult.output_text,
        rawResponse: JSON.stringify(openaiResult).substring(0, 500),
      });
      throw new Error('No se recibió contenido de OpenAI');
    }

    // Log token usage from Responses API
    const usage = openaiResult.usage || {};
    logger.debug('[OpenAI Search] Token usage', {
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      totalTokens: usage.total_tokens,
    });

    logger.debug('[OpenAI Search] Raw AI content', {
      contentLength: aiContent.length,
      contentPreview: aiContent.substring(0, 1000) + (aiContent.length > 1000 ? '...[truncated]' : ''),
    });

    // Intentar parsear como JSON (limpiar markdown si existe)
    let parsedData;
    try {
      let jsonContent = aiContent.trim();
      const hadMarkdown = jsonContent.includes('```');

      // Remover bloques de código markdown si existen
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.slice(7);
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.slice(3);
      }
      if (jsonContent.endsWith('```')) {
        jsonContent = jsonContent.slice(0, -3);
      }
      jsonContent = jsonContent.trim();

      logger.debug('[OpenAI Search] Parsing JSON', {
        hadMarkdown,
        cleanedLength: jsonContent.length,
      });

      parsedData = JSON.parse(jsonContent);

      logger.debug('[OpenAI Search] JSON parsed successfully', {
        keys: Object.keys(parsedData),
        hasNulls: Object.entries(parsedData).filter(([, v]) => v === null).map(([k]) => k),
      });
    } catch (parseError) {
      logger.error('[OpenAI Search] JSON parse error', parseError instanceof Error ? parseError : new Error(String(parseError)), {
        contentPreview: aiContent.substring(0, 500),
      });
      throw new Error('La respuesta de OpenAI no es JSON válido');
    }

    // Procesar y validar los datos
    logger.debug('[OpenAI Search] Processing response with confidence filter', {
      confidenceLevel: options.confidenceLevel,
    });

    const enrichedData = processOpenAIResponse(parsedData, options.confidenceLevel);

    logger.debug('[OpenAI Search] Processed data', {
      enrichedKeys: Object.keys(enrichedData).filter(k => enrichedData[k] !== null && enrichedData[k] !== undefined),
      enrichedData: JSON.stringify(enrichedData).substring(0, 1000),
    });

    // Actualizar ultimaIA en la base de datos
    await prisma.cliente.update({
      where: { id: cliente.id },
      data: { ultimaIA: new Date() }
    });

    logger.info('[OpenAI Search] Completed successfully', {
      clienteId: cliente.id,
      clienteName: cliente.nombre,
      elapsed,
      tokensUsed: usage.total_tokens || 0,
      model,
      webSearchUsed: true,
      enrichedFields: Object.keys(enrichedData).filter(k => enrichedData[k] !== null && enrichedData[k] !== undefined),
    });

    const response = {
      success: true,
      enrichedData,
      metadata: {
        model,
        confidence: options.confidenceLevel,
        timestamp: options.timestamp,
        tokensUsed: usage.total_tokens || 0,
        webSearchUsed: true
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    logger.error('[OpenAI Search] Request failed', error instanceof Error ? error : new Error(String(error)), {
      errorMessage: error instanceof Error ? error.message : 'Unknown',
    });
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

/**
 * Get system prompt for the AI
 */
function getSystemPrompt(): string {
  return `You are an expert business intelligence researcher specializing in finding accurate, up-to-date information about companies and businesses.

Your task is to search and find comprehensive contact information, social media profiles, and business details.

IMPORTANT INSTRUCTIONS:
- Search thoroughly using all available knowledge
- Find as much relevant information as possible
- Look for official websites, social media profiles, contact details
- Consider variations in business names and common abbreviations
- If the business is in Argentina, prioritize Argentine domains (.com.ar) and local platforms
- Always respond in Spanish
- Return ONLY valid JSON, no additional text or markdown

Your response must be a valid JSON object with the found information.`;
}

/**
 * Build the search prompt based on available client data
 */
function buildSearchPrompt(cliente: Cliente, options: SearchOptions): string {
  // Build data items only if we have the value
  const dataItems: string[] = [];

  if (cliente.nombre) {
    dataItems.push(`- Business Name: "${cliente.nombre}"`);
  }
  if (cliente.ciudad) {
    dataItems.push(`- Location: ${cliente.ciudad}, Argentina`);
  }
  if (cliente.industria) {
    dataItems.push(`- Industry/Sector: ${cliente.industria}`);
  }

  const knownData = dataItems.length > 0
    ? `KNOWN INFORMATION:\n${dataItems.join('\n')}`
    : 'KNOWN INFORMATION:\n- Business Name: (not provided)';

  return `Search for comprehensive business information about a company with the following details:

${knownData}

SEARCH OBJECTIVES:
1. Find the official website (prioritize .com.ar, .com, or official domain)
2. Find all social media profiles (Instagram, Facebook, LinkedIn, Twitter/X)
3. Find contact information (phone numbers, WhatsApp, email addresses)
4. Find the complete business address if available
5. Identify the type of business and any relevant details

RESPONSE FORMAT (strict JSON):
{
  "sitioWeb": "full URL of official website or null if not found",
  "instagram": "Instagram handle with @ or full URL, or null",
  "facebook": "Facebook page URL or name, or null",
  "linkedin": "LinkedIn company URL or name, or null",
  "twitter": "Twitter/X handle with @ or full URL, or null",
  "whatsapp": "WhatsApp number with country code, or null",
  "telefono": "phone number(s), or null",
  "email": "contact email address, or null",
  "direccion": "complete address in Spanish, or null",
  "descripcion": "brief business description in Spanish (1-2 sentences), or null",
  "horarios": "business hours if found, or null",
  "servicios": ["list of main services/products offered"] or null,
  "fuentes": "brief note about where information was found"
}

Respond ONLY with the JSON object, no markdown formatting, no explanations.`;
}

/**
 * Get temperature and top_p configuration based on confidence level
 * Low confidence = conservative, precise results (lower temperature)
 * High confidence = aggressive, more results (higher temperature)
 */
function getConfidenceConfig(confidenceLevel: number): { temperature: number; topP: number } {
  if (confidenceLevel < 0.4) {
    // Conservative: very precise, deterministic
    return { temperature: 0.2, topP: 0.8 };
  } else if (confidenceLevel < 0.7) {
    // Balanced: moderate creativity
    return { temperature: 0.5, topP: 0.9 };
  } else {
    // Aggressive: more creative, explore more options
    return { temperature: 0.7, topP: 0.95 };
  }
}

/**
 * Process and clean the AI response
 * Maps known fields and collects extra info into "notas"
 */
function processOpenAIResponse(data: Record<string, unknown>, confidenceLevel: number): Record<string, unknown> {
  // Fields that map directly to our database/UI
  const knownFields = new Set([
    'sitioWeb',
    'instagram',
    'facebook',
    'linkedin',
    'twitter',
    'whatsapp',
    'telefono',
    'email',
    'direccion',
    'fuentes',
  ]);

  const processed: Record<string, unknown> = {};
  const extraInfo: string[] = [];

  // Clean and validate each field
  for (const [key, value] of Object.entries(data)) {
    // Skip null, undefined, empty strings, and "null" strings
    if (value === null || value === undefined || value === '' || value === 'null') {
      continue;
    }

    // Skip empty arrays
    if (Array.isArray(value) && value.length === 0) {
      continue;
    }

    // Clean the value
    let cleanValue: unknown = value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'no encontrado') {
        continue;
      }
      cleanValue = trimmed;
    }

    // Check if it's a known field
    if (knownFields.has(key)) {
      processed[key] = cleanValue;
    } else {
      // Collect extra info for notas
      const formattedValue = formatExtraField(key, cleanValue);
      if (formattedValue) {
        extraInfo.push(formattedValue);
      }
    }
  }

  // Add extra info to notas if we have any
  if (extraInfo.length > 0) {
    processed.notas = extraInfo.join('\n');
  }

  return processed;
}

/**
 * Format extra fields for the notas field
 */
function formatExtraField(key: string, value: unknown): string | null {
  // Map of field names to Spanish labels
  const labels: Record<string, string> = {
    descripcion: '📝 Descripción',
    horarios: '🕐 Horarios',
    servicios: '🛠️ Servicios',
    productos: '📦 Productos',
    especialidades: '⭐ Especialidades',
    redes: '🌐 Redes',
    observaciones: '📌 Observaciones',
    info: '📌 Info',
    nota: '📌 Nota',
    otros: '📌 Otros',
  };

  const label = labels[key] || `📌 ${key.charAt(0).toUpperCase() + key.slice(1)}`;

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return `${label}: ${value.join(', ')}`;
  }

  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    if (!entries) return null;
    return `${label}: ${entries}`;
  }

  if (typeof value === 'string' && value.trim()) {
    return `${label}: ${value}`;
  }

  return null;
}