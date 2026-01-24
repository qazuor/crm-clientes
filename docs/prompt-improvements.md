# 🔍 Mejoras en el Prompt de IA

## ✅ Problema solucionado

**ANTES**: La IA inventaba datos ficticios
- Cuentas de Facebook inexistentes
- Teléfonos inventados  
- Emails falsos
- Social media "creativo"

**AHORA**: Prompts ultra-conservadores
- 🚫 NEVER INVENT OR GUESS DATA
- ✅ Use null para datos inciertos
- ⚡ Confidence scores realistas (0.1-0.3)
- 🔍 Verificación cruzada obligatoria

## 📋 Cambios implementados

### 1. Prompt Básico mejorado (`/api/clientes/[id]/enrich`)
```
STRICT DATA VERIFICATION RULES:
🚫 NEVER INVENT OR GUESS DATA
🚫 NEVER CREATE FAKE SOCIAL MEDIA HANDLES
🚫 NEVER GENERATE PHONE NUMBERS OR EMAILS

✅ ONLY include data you can verify exists
✅ Use null for ANY uncertain information
✅ Be extremely conservative with confidence scores
```

### 2. Prompt Avanzado mejorado (`/api/clientes/[id]/enrich-advanced`)
```
CRITICAL DATA INTEGRITY RULES:
🚫 NEVER fabricate or guess any information
🚫 If you can't verify something with search tools, use null
🚫 Better to return mostly nulls than potentially false data
```

### 3. UI con advertencias
- ⚠️ Alertas para confidence < 50%
- 📊 Porcentajes claros de confianza
- 📝 Notas explicativas de limitaciones

## 🧪 Resultado esperado

### ANTES (inventaba datos):
```json
{
  "telefono": "+54 11 4444-5555",  // INVENTADO
  "instagram": "panaderia_lopez",  // NO EXISTE
  "facebook": "facebook.com/lopez-panaderia", // FALSO
  "confidence": 0.8  // MUY OPTIMISTA
}
```

### AHORA (conservador):
```json
{
  "telefono": null,  // No pudo verificar
  "instagram": null, // No encontrado
  "facebook": null,  // No confirmado
  "sitioWeb": "https://ejemplo-real.com", // Solo si verificado
  "confidence": 0.2, // Realista
  "notas": "Limited verification without real-time web access"
}
```

## 🎯 Beneficios

1. **Datos confiables**: Menos datos, pero 100% reales
2. **Transparencia**: Confidence scores honestos
3. **Advertencias claras**: UI que alerta sobre incertidumbre  
4. **Mejor toma de decisiones**: Usuario sabe qué esperar

## 🚀 Para máxima precisión

**Recomendación**: Usar modo "Búsqueda Avanzada" con Google APIs
- Google Places API: Datos oficiales verificados
- Custom Search API: Verificación cruzada en tiempo real
- Website verification: SSL, responsive, etc.

¿Quieres que configuremos las APIs de Google para tener datos aún más precisos?