# 🔑 Guía Completa para Obtener API Keys

## 1. 🗺️ Google Places API (RECOMENDADO - Datos oficiales de negocio)

### Paso a paso:

1. **Ir a Google Cloud Console**
   - Ve a: https://console.cloud.google.com/
   - Crear cuenta de Google si no tienes

2. **Crear nuevo proyecto**
   ```
   → Seleccionar proyecto (arriba)
   → "Nuevo proyecto"
   → Nombre: "CRM-Enrichment"
   → Crear
   ```

3. **Habilitar Places API**
   ```
   → APIs & Services
   → Biblioteca
   → Buscar "Places API"
   → Habilitar
   ```

4. **Crear API Key**
   ```
   → APIs & Services
   → Credenciales
   → Crear credenciales
   → API Key
   → Copiar la key: AIza...
   ```

5. **Configurar restricciones (IMPORTANTE)**
   ```
   → Editar API Key
   → Restricciones de aplicación: IP addresses
   → Agregar tu IP server
   → Restricciones de API: Places API
   → Guardar
   ```

**Costo**: 1000 requests gratis/mes, después $0.004 por request

---

## 2. 🔍 Google Custom Search API

### Paso a paso:

1. **Habilitar Custom Search API**
   ```
   En el mismo proyecto de Google Cloud:
   → APIs & Services
   → Biblioteca  
   → Buscar "Custom Search JSON API"
   → Habilitar
   ```

2. **Crear Custom Search Engine**
   - Ve a: https://cse.google.com/
   - "Add" → "Create a custom search engine"
   - Sites to search: `*` (toda la web)
   - Language: Español
   - Name: "Business Research"
   - Crear

3. **Obtener Search Engine ID**
   ```
   → Setup → Basics
   → Copiar "Search engine ID": cx:...
   ```

4. **Usar la misma API Key**
   - Reutilizar la API key de Google Places
   - Agregar "Custom Search JSON API" a las restricciones

**Costo**: 100 queries gratis/día, después $5 por 1000 queries

---

## 3. 🎯 OpenAI API (Ya tienes)

- Ve a: https://platform.openai.com/api-keys
- Crear nueva key si necesitas
- Asegúrate de tener créditos

---

## 4. 📝 Configurar en tu proyecto

### Agregar a `.env.local`:

```bash
# OpenAI (obligatorio)
OPENAI_API_KEY=sk-proj-...

# Google APIs (opcionales pero recomendados)
GOOGLE_PLACES_API_KEY=AIza...
GOOGLE_API_KEY=AIza... # Puede ser la misma que Places
GOOGLE_CSE_ID=cx:...
```

### Testear configuración:

```bash
# Verificar que las variables estén cargadas
cd "/home/qazuor/Desktop/csv clientes/crm-clientes"
echo $GOOGLE_PLACES_API_KEY
echo $GOOGLE_CSE_ID
```

---

## 5. 🔒 Seguridad y Límites

### Restricciones recomendadas:

```bash
# Google API Key restrictions:
- Application restrictions: HTTP referrers 
- Allowed domains: tu-dominio.com, localhost:4500
- API restrictions: Places API, Custom Search JSON API
```

### Rate limiting:
```bash
# En producción, agregar:
- Redis para caching
- Rate limiting (max 100 requests/hour por cliente)
- Queue system para batch processing
```

---

## 6. 💰 Estimación de costos mensual

### Para 1000 clientes enriquecidos:

**Opción Básica (solo OpenAI):**
- GPT-4o: ~$15-25/mes

**Opción Avanzada (Google + OpenAI):**
- Places API: ~$4/mes (1000 requests)
- Custom Search: ~$50/mes (1000 requests) 
- GPT-4o: ~$30/mes (más tokens con function calling)
- **Total: ~$85/mes**

### Estrategia de optimización:
1. **Cache results** por 30-60 días
2. **Batch processing** para múltiples clientes
3. **Smart querying** - solo buscar si datos están obsoletos
4. **Fallback gracioso** - usar básico si falla avanzado

---

## 7. 🚀 Testing paso a paso

### 1. Probar solo OpenAI básico:
```bash
# Solo con OPENAI_API_KEY configurado
# Usar modo "Búsqueda básica" en el modal
```

### 2. Agregar Google Places:
```bash
# Agregar GOOGLE_PLACES_API_KEY
# Activar "Búsqueda avanzada"
# Revisar console.log del backend
```

### 3. Agregar Google Search:
```bash
# Agregar GOOGLE_API_KEY y GOOGLE_CSE_ID
# Probar búsqueda completa
```

---

## 🎯 Prioridad de implementación:

1. **AHORA**: Mejorar prompt básico (ya hecho)
2. **Esta semana**: Google Places API 
3. **Próxima semana**: Google Custom Search
4. **Futuro**: APIs de redes sociales

¿Con cuál quieres empezar? Te recomiendo Google Places API primero, tiene los mejores datos oficiales de negocios.