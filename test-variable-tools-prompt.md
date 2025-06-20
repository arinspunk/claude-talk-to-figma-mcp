# Test Prompt: Variable Tools Verification

Hola Claude, necesito que pruebes las nuevas herramientas de variables que acabamos de implementar en el proyecto claude-talk-to-figma-mcp. Se han completado **20 herramientas de variables** que permiten gestión completa del sistema de variables de Figma.

## 🎯 Objetivo del Test

Verificar que todas las herramientas de variables funcionan correctamente a través de la cadena completa: **Claude → MCP Server → WebSocket → Plugin Figma → API Figma**.

## 📋 Herramientas a Probar

### 1. **Creación de Variables**
- `create_variable` - Crear una variable individual
- `create_variable_collection` - Crear una colección de variables

### 2. **Consulta de Variables**
- `get_local_variables` - Obtener variables locales con filtros
- `get_local_variable_collections` - Obtener colecciones con metadata
- `get_variable_by_id` - Obtener variable específica por ID
- `get_variable_collection_by_id` - Obtener colección específica por ID

### 3. **Binding de Variables**
- `set_bound_variable` - Vincular variable a propiedad de nodo
- `set_bound_variable_for_paint` - Vincular variable de color a fills/strokes
- `remove_bound_variable` - Eliminar vinculación de variable

### 4. **Modificación de Variables**
- `update_variable_value` - Actualizar valor de variable
- `update_variable_name` - Cambiar nombre de variable
- `delete_variable` - Eliminar variable
- `delete_variable_collection` - Eliminar colección

### 5. **Análisis de Variables**
- `get_variable_references` - Obtener referencias donde se usa una variable

### 6. **Gestión de Modos**
- `set_variable_mode_value` - Establecer valor para modo específico
- `create_variable_mode` - Crear nuevo modo en colección
- `delete_variable_mode` - Eliminar modo de colección
- `reorder_variable_modes` - Reordenar modos en colección

### 7. **Publicación**
- `publish_variable_collection` - Publicar colección a biblioteca
- `get_published_variables` - Obtener variables publicadas

## 🧪 Plan de Pruebas Sugerido

### Fase 1: Verificación Básica
1. **Crear una colección de variables** con modos Light/Dark
2. **Crear variables de diferentes tipos**: COLOR, FLOAT, STRING, BOOLEAN
3. **Consultar las variables** creadas con diferentes filtros
4. **Obtener información específica** de una variable por ID

### Fase 2: Binding y Uso
5. **Crear algunos nodos** (rectángulo, texto, frame)
6. **Vincular variables** a propiedades de los nodos (width, fills, characters)
7. **Verificar las vinculaciones** consultando referencias
8. **Modificar valores** de variables y observar cambios en nodos

### Fase 3: Gestión Avanzada
9. **Crear modos adicionales** en la colección
10. **Establecer valores diferentes** para cada modo
11. **Reordenar modos** en la colección
12. **Probar eliminación** de variables y modos

### Fase 4: Casos Edge
13. **Probar validaciones** con parámetros incorrectos
14. **Verificar manejo de errores** (IDs inexistentes, tipos incompatibles)
15. **Probar operaciones con muchos elementos** (performance)

## 📝 Formato de Reporte

Para cada herramienta probada, por favor reporta:

### ✅ **Funcionamiento Correcto**
- Nombre de la herramienta
- Parámetros utilizados
- Resultado obtenido
- Tiempo de respuesta aproximado

### ❌ **Problemas Encontrados**
- Nombre de la herramienta
- Parámetros utilizados
- Error o comportamiento inesperado
- Mensaje de error recibido
- Sugerencia de solución si es posible

### ⚠️ **Observaciones**
- Comportamientos extraños pero no críticos
- Sugerencias de mejora
- Problemas de usabilidad

## 🔧 Ejemplos de Uso

### Ejemplo 1: Crear Sistema de Design Tokens
```javascript
1. create_variable_collection({
   name: "Design Tokens",
   initialModeNames: ["Light", "Dark"]
})

2. create_variable({
   name: "primary-color",
   variableCollectionId: "[ID_OBTENIDO]",
   resolvedType: "COLOR",
   initialValue: { r: 0.2, g: 0.4, b: 0.8, a: 1.0 },
   description: "Primary brand color"
})

3. create_variable({
   name: "spacing-large",
   variableCollectionId: "[ID_OBTENIDO]",
   resolvedType: "FLOAT",
   initialValue: 24,
   description: "Large spacing value"
})

4. create_variable({
   name: "is-visible",
   variableCollectionId: "[ID_OBTENIDO]",
   resolvedType: "BOOLEAN",
   initialValue: true,
   description: "Visibility toggle"
})

5. create_variable({
   name: "button-text",
   variableCollectionId: "[ID_OBTENIDO]",
   resolvedType: "STRING",
   initialValue: "Click me",
   description: "Button label text"
})
```

### Ejemplo 2: Binding a Nodos
```javascript
1. // Crear un rectángulo primero
create_rectangle({
   name: "Test Rectangle",
   width: 100,
   height: 100,
   x: 100,
   y: 100
})

2. set_bound_variable_for_paint({
   nodeId: "[ID_RECTANGULO]",
   property: "fills",
   variableId: "[ID_VARIABLE_COLOR]"
})

3. set_bound_variable({
   nodeId: "[ID_RECTANGULO]",
   property: "width",
   variableId: "[ID_VARIABLE_SPACING]"
})

4. set_bound_variable({
   nodeId: "[ID_RECTANGULO]",
   property: "visible",
   variableId: "[ID_VARIABLE_BOOLEAN]"
})
```

### Ejemplo 3: Gestión de Modos
```javascript
1. create_variable_mode({
   collectionId: "[ID_COLECCION]",
   modeName: "High Contrast"
})

2. set_variable_mode_value({
   variableId: "[ID_VARIABLE_COLOR]",
   modeId: "[ID_MODO_NUEVO]",
   value: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 }
})

3. set_variable_mode_value({
   variableId: "[ID_VARIABLE_SPACING]",
   modeId: "[ID_MODO_NUEVO]",
   value: 32
})

4. reorder_variable_modes({
   collectionId: "[ID_COLECCION]",
   modeIds: ["[ID_MODO_1]", "[ID_MODO_2]", "[ID_MODO_NUEVO]"]
})
```

### Ejemplo 4: Consultas y Análisis
```javascript
1. get_local_variables({
   collectionId: "[ID_COLECCION]",
   type: "COLOR",
   limit: 10
})

2. get_variable_references({
   variableId: "[ID_VARIABLE]"
})

3. get_local_variable_collections({
   includeVariableCount: true,
   sortBy: "name",
   sortOrder: "asc"
})
```

## 🚨 Casos de Error a Probar

### 1. **Parámetros Inválidos**
```javascript
// ID inexistente
get_variable_by_id({ variableId: "invalid-id" })

// Tipo incorrecto
create_variable({
   name: "test",
   variableCollectionId: "[VALID_ID]",
   resolvedType: "INVALID_TYPE"
})

// Nombre vacío
create_variable({
   name: "",
   variableCollectionId: "[VALID_ID]",
   resolvedType: "COLOR"
})
```

### 2. **Incompatibilidades de Tipo**
```javascript
// Intentar vincular FLOAT a fills (debería ser COLOR)
set_bound_variable_for_paint({
   nodeId: "[ID_NODO]",
   property: "fills",
   variableId: "[ID_VARIABLE_FLOAT]"
})

// Intentar vincular STRING a width (debería ser FLOAT)
set_bound_variable({
   nodeId: "[ID_NODO]",
   property: "width",
   variableId: "[ID_VARIABLE_STRING]"
})
```

### 3. **Operaciones en Estados Inválidos**
```javascript
// Intentar eliminar el último modo
delete_variable_mode({
   collectionId: "[ID_COLECCION]",
   modeId: "[ULTIMO_MODO_ID]"
})

// Intentar eliminar variable en uso
delete_variable({
   variableId: "[ID_VARIABLE_EN_USO]"
})
```

## 📊 Métricas Esperadas

- **Tiempo de respuesta**: < 2 segundos para operaciones simples
- **Tiempo de respuesta**: < 5 segundos para operaciones complejas (batch, publicación)
- **Tasa de éxito**: > 95% para casos válidos
- **Manejo de errores**: 100% de casos inválidos manejados correctamente
- **Consistencia**: Mismos resultados en múltiples ejecuciones

## 🎯 Resultado Esperado

Al final de las pruebas, deberías poder confirmar:

1. ✅ **Todas las 20 herramientas funcionan correctamente**
2. ✅ **La comunicación MCP-Plugin es estable**
3. ✅ **Los errores se manejan apropiadamente**
4. ✅ **El rendimiento es aceptable**
5. ✅ **La funcionalidad es completa y usable**
6. ✅ **Los tipos de variables (COLOR, FLOAT, STRING, BOOLEAN) funcionan correctamente**
7. ✅ **El sistema de modos funciona correctamente**
8. ✅ **Las vinculaciones de variables a nodos funcionan**
9. ✅ **Las validaciones previenen errores de usuario**
10. ✅ **El sistema está listo para uso en producción**

## 📋 Checklist de Verificación

### Herramientas de Creación
- [ ] `create_variable` - COLOR
- [ ] `create_variable` - FLOAT  
- [ ] `create_variable` - STRING
- [ ] `create_variable` - BOOLEAN
- [ ] `create_variable_collection`

### Herramientas de Consulta
- [ ] `get_local_variables` - sin filtros
- [ ] `get_local_variables` - con filtros
- [ ] `get_local_variable_collections`
- [ ] `get_variable_by_id`
- [ ] `get_variable_collection_by_id`

### Herramientas de Binding
- [ ] `set_bound_variable` - width/FLOAT
- [ ] `set_bound_variable` - visible/BOOLEAN
- [ ] `set_bound_variable` - characters/STRING
- [ ] `set_bound_variable_for_paint` - fills/COLOR
- [ ] `set_bound_variable_for_paint` - strokes/COLOR
- [ ] `remove_bound_variable`

### Herramientas de Modificación
- [ ] `update_variable_value`
- [ ] `update_variable_name`
- [ ] `delete_variable`
- [ ] `delete_variable_collection`

### Herramientas de Análisis
- [ ] `get_variable_references`

### Herramientas de Modos
- [ ] `set_variable_mode_value`
- [ ] `create_variable_mode`
- [ ] `delete_variable_mode`
- [ ] `reorder_variable_modes`

### Herramientas de Publicación
- [ ] `publish_variable_collection`
- [ ] `get_published_variables`

---

**¡Comienza las pruebas cuando estés listo!** 

Si encuentras algún problema, proporciona los detalles específicos para que podamos solucionarlo. Si todo funciona bien, confirma que las herramientas están listas para uso en producción.

**Nota**: Asegúrate de tener un documento de Figma abierto y el plugin de Claude MCP conectado antes de comenzar las pruebas.

## 🔗 Recursos Adicionales

- **Documentación de Variables**: `context/02-variable-tools-usage-guide.md`
- **Tests de Integración**: `tests/integration/variable-tools-system-integration.test.ts`
- **Implementación MCP**: `src/talk_to_figma_mcp/tools/variable-tools.ts`
- **Implementación Plugin**: `src/claude_mcp_plugin/code.js` (líneas 3340+)

---

*Prompt preparado para testing de la Tarea 1.11 - Sincronización Variable Tools MCP-Plugin*
*Fecha: 2025-01-27*
*Estado: Fase 1 (Variables) - 100% Completa* 