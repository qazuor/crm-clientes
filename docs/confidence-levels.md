# 🎯 Niveles de Confianza Configurables

## ✅ Nueva funcionalidad implementada

Ahora puedes configurar qué tan estricta o permisiva quieres que sea la búsqueda de IA según tus necesidades.

## 🛡️ **Conservador (Recomendado)**

### Características:
- 🚫 **Nunca inventa datos**
- ✅ Solo incluye información 100% verificable
- ⚡ Confidence range: 0.1-0.3
- 📊 Temperature: 0.1 (muy consistente)
- 🎯 Prioriza **precisión** sobre completitud

### Ideal para:
- Información crítica de contacto
- Datos que serán usados para marketing directo
- Clientes importantes donde la precisión es clave
- Primera limpieza de bases de datos

### Resultado esperado:
```json
{
  "telefono": null,  // No pudo verificar 100%
  "instagram": null, // No confirmado
  "sitioWeb": "https://sitio-real.com", // Solo si verificado
  "confidence": 0.2,
  "notas": "Verification level: conservative. Limited data due to strict standards"
}
```

---

## ⚖️ **Balanceado**

### Características:
- 🔍 Verificación moderada
- ⚡ Permite inferencias razonables
- 📈 Confidence range: 0.3-0.6  
- 🌡️ Temperature: 0.2-0.3
- ⚖️ Balance entre **precisión** y **completitud**

### Ideal para:
- Enriquecimiento general de base de datos
- Investigación preliminar de clientes
- Cuando necesitas más datos que el modo conservador
- Análisis de mercado y tendencias

### Resultado esperado:
```json
{
  "telefono": "+54 11 4567-8900", // Inferido de patrones
  "instagram": "empresa_ejemplo",  // Match probable
  "email": "info@empresa.com",     // Patrón estándar
  "confidence": 0.5,
  "notas": "Verification level: balanced. Moderate verification applied"
}
```

---

## 🚀 **Agresivo**

### Características:
- ⚡ **Máxima completitud de datos**
- 🧠 Inferencias educadas activas
- 📊 Confidence range: 0.4-0.8
- 🔥 Temperature: 0.4-0.5  
- 🎯 Prioriza **completitud** sobre precisión

### Ideal para:
- Análisis de mercado masivo
- Investigación de competencia
- Cuando necesitas llenar muchos campos
- Análisis de industria y patrones

### Resultado esperado:
```json
{
  "telefono": "+54 11 4567-8900",    // Inferencia probable
  "whatsapp": "+54 9 11 4567-8900",  // Patrón WhatsApp
  "instagram": "empresa_ejemplo",     // Probable handle
  "facebook": "facebook.com/empresa", // Likely URL
  "confidence": 0.7,
  "notas": "Verification level: aggressive. Maximum data completion attempted"
}
```

## 📊 Comparación de resultados

| Nivel | Datos encontrados | Precisión | Velocidad | Uso recomendado |
|-------|-------------------|-----------|-----------|-----------------|
| 🛡️ **Conservador** | 20-40% campos | 95%+ | Rápido | Datos críticos |
| ⚖️ **Balanceado** | 50-70% campos | 80-90% | Medio | Uso general |
| 🚀 **Agresivo** | 70-90% campos | 60-80% | Lento | Análisis masivo |

## 🎛️ Cómo usar

### En el modal de enrichment:

1. **Selecciona nivel de confianza**:
   - 🛡️ Conservador (por defecto)
   - ⚖️ Balanceado  
   - 🚀 Agresivo

2. **Opcionalmente**: Activa "Búsqueda Avanzada" para usar APIs reales

3. **Click**: "Iniciar búsqueda"

### El sistema automáticamente:
- ✅ Ajusta los prompts según el nivel elegido
- ✅ Modifica la temperature de OpenAI
- ✅ Cambia los criterios de verificación
- ✅ Muestra el nivel usado en los resultados

## ⚠️ Advertencias automáticas

El sistema te alertará cuando:
- 🟡 Confidence < 50% (cualquier nivel)
- 🟠 Nivel agresivo seleccionado
- 🔴 Datos inconsistentes encontrados

## 🎯 Recomendaciones de uso

### Para empezar:
1. **Usa Conservador** para clientes importantes
2. **Prueba Balanceado** para uso general  
3. **Usa Agresivo** solo para análisis masivo

### Workflow sugerido:
1. **Conservador** → Datos críticos confirmados
2. **Balanceado** → Completar información faltante
3. **Validación manual** → Revisar datos agresivos

¡Ahora tienes control total sobre la precisión vs completitud de tus búsquedas! 🎉