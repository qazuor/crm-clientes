# 🔍 Configuración de APIs para Búsqueda Avanzada

## 📋 Resumen de mejoras implementadas

### ✅ Prompt mejorado (Inglés)
- Sistema de prompts en inglés más profesional
- Fuentes específicas de búsqueda definidas
- Instrucciones claras para cross-verificación

### ✅ Endpoint básico mejorado (/api/clientes/[id]/enrich)
- Prompt en inglés con fuentes específicas
- Mejor estructura de respuesta JSON
- Instrucciones más detalladas para la IA

### ✅ Endpoint avanzado con Function Calling (/api/clientes/[id]/enrich-advanced)
- Google Places API integration
- Google Custom Search integration  
- Website analysis en tiempo real
- Function calling para búsquedas estructuradas
- Verificación cruzada de datos

### ✅ UI mejorada
- Toggle para elegir búsqueda básica vs avanzada
- Indicadores visuales de qué APIs están activas
- Mejor feedback al usuario

## 🔧 APIs disponibles para integrar

### 1. Google Places API ⭐ RECOMENDADO
```bash
# Obtener en: https://developers.google.com/maps/documentation/places/web-service
GOOGLE_PLACES_API_KEY=AIza...
```
**Qué proporciona:**
- Teléfonos verificados
- Direcciones exactas  
- Horarios de atención
- Websites oficiales
- Ratings y reviews

### 2. Google Custom Search API ⭐ RECOMENDADO  
```bash
# 1. Crear API key: https://developers.google.com/custom-search/v1/introduction
# 2. Crear Custom Search Engine: https://cse.google.com/
GOOGLE_API_KEY=AIza...
GOOGLE_CSE_ID=cx:...
```
**Qué proporciona:**
- Resultados de búsqueda web
- Snippets de información
- Enlaces relevantes
- Contexto adicional

### 3. Social Media APIs (Futuro)

#### Instagram Business Discovery API
```bash
INSTAGRAM_API_TOKEN=IGQVJy...
```
- Perfiles de negocios públicos
- Followers, posts, engagement
- Información de contacto en bio

#### Facebook Graph API  
```bash
FACEBOOK_API_TOKEN=EAAGm...
```
- Páginas de empresa
- Información de contacto
- Horarios y ubicación
- Reviews y rating

#### LinkedIn Company API
```bash
LINKEDIN_API_TOKEN=AQV6b...
```
- Páginas de empresa
- Información corporativa
- Empleados y tamaño
- Industria y especialidades

### 4. APIs de enriquecimiento especializadas

#### Clearbit Enrichment API 💰
```bash
CLEARBIT_API_KEY=pk_...
```
- Datos de empresa completos
- Tecnologías que usan
- Empleados y roles
- Financials y funding

#### Hunter.io Email Finder 💰
```bash
HUNTER_IO_API_KEY=...
```
- Búsqueda de emails por dominio
- Verificación de emails
- Patrones de email corporativo

## 🚀 Configuración paso a paso

### 1. Configurar Google APIs (GRATIS hasta cierto límite)

```bash
# 1. Ve a Google Cloud Console
# 2. Crear/seleccionar proyecto
# 3. Habilitar APIs:
#    - Places API
#    - Custom Search JSON API
# 4. Crear credentials (API Keys)
# 5. Configurar Custom Search Engine en cse.google.com
```

### 2. Agregar a .env.local
```bash
cp .env.example .env.local
# Editar .env.local con tus API keys
```

### 3. Testear funcionalidad
- Usar toggle "Búsqueda Avanzada" en el modal
- Verificar que aparezca "⚡ Búsqueda en tiempo real..."
- Revisar console.log para debugging

## 📊 Costos estimados

### Google APIs (Gratis inicial)
- Places API: 1000 requests/mes gratis
- Custom Search: 100 queries/día gratis
- Costo después: ~$0.004 per request

### OpenAI (Ya tienes)
- GPT-4o: ~$0.06 per 1K tokens
- Con function calling: ~2-3x más tokens

### Recomendación de uso:
1. **Básico**: Para testing y volumen bajo
2. **Avanzado**: Solo para clientes importantes o datos críticos
3. **Híbrido**: Básico por defecto, avanzado bajo demanda

## 🎯 Próximos pasos sugeridos

1. **Inmediato**: Configurar Google Places API (más impacto)
2. **Corto plazo**: Agregar rate limiting y caching  
3. **Mediano plazo**: Integrar APIs sociales
4. **Largo plazo**: MCP servers para workflows complejos

¿Con qué API quieres empezar? Google Places tiene el mejor ROI para datos de negocio.