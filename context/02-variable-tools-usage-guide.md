# Guía de Uso de Herramientas de Variables para Claude

**Fecha**: 20 de enero de 2025  
**Versión**: 1.0  
**Tarea**: 1.10 - Integración de variable-tools  
**Estado**: ✅ Completada

## Resumen

Esta guía proporciona instrucciones detalladas para que Claude utilice efectivamente las **20 herramientas de variables** integradas en el sistema claude-talk-to-figma-mcp. Las herramientas permiten gestión completa de variables de Figma, incluyendo creación, consulta, binding, modificación, gestión avanzada y publicación.

## Categorías de Herramientas

### 1. 🔧 Herramientas de Creación (2 herramientas)

#### `create_variable`
Crea una nueva variable en una colección existente.

**Parámetros requeridos**:
- `name`: Nombre de la variable (1-255 caracteres, debe comenzar con letra)
- `variableCollectionId`: ID de la colección donde crear la variable
- `resolvedType`: Tipo de variable (`"BOOLEAN"`, `"FLOAT"`, `"STRING"`, `"COLOR"`)

**Parámetros opcionales**:
- `initialValue`: Valor inicial según el tipo
- `description`: Descripción de la variable (máx. 1000 caracteres)

**Ejemplos de uso**:
```typescript
// Variable de texto
await create_variable({
  name: "primary-text",
  variableCollectionId: "collection-123",
  resolvedType: "STRING",
  initialValue: "Hello World"
});

// Variable de color
await create_variable({
  name: "primary-color",
  variableCollectionId: "collection-123", 
  resolvedType: "COLOR",
  initialValue: { r: 0.2, g: 0.4, b: 0.8, a: 1.0 }
});

// Variable booleana
await create_variable({
  name: "is-visible",
  variableCollectionId: "collection-123",
  resolvedType: "BOOLEAN",
  initialValue: true
});
```

#### `create_variable_collection`
Crea una nueva colección de variables con soporte para múltiples modos.

**Parámetros requeridos**:
- `name`: Nombre de la colección (1-255 caracteres)

**Parámetros opcionales**:
- `initialModeNames`: Array de nombres de modos iniciales

**Ejemplos de uso**:
```typescript
// Colección básica
await create_variable_collection({
  name: "Design Tokens"
});

// Colección con modos personalizados
await create_variable_collection({
  name: "Theme Tokens",
  initialModeNames: ["Light", "Dark", "High Contrast"]
});
```

### 2. 🔍 Herramientas de Consulta (4 herramientas)

#### `get_local_variables`
Obtiene variables locales con filtrado avanzado y paginación.

**Parámetros opcionales**:
- `collectionId`: Filtrar por colección específica
- `type`: Filtrar por tipo de variable
- `namePattern`: Filtrar por patrón de nombre
- `limit`: Máximo número de resultados (1-1000)
- `offset`: Número de resultados a omitir

**Ejemplos de uso**:
```typescript
// Todas las variables
await get_local_variables({});

// Variables de color de una colección específica
await get_local_variables({
  collectionId: "collection-123",
  type: "COLOR"
});

// Paginación
await get_local_variables({
  limit: 50,
  offset: 100
});
```

#### `get_local_variable_collections`
Obtiene colecciones locales con metadata y opciones de ordenamiento.

**Parámetros opcionales**:
- `includeVariableCount`: Incluir conteo de variables
- `includeModes`: Incluir información de modos
- `namePattern`: Filtrar por patrón de nombre
- `sortBy`: Ordenar por (`"name"`, `"createdAt"`, `"updatedAt"`, `"variableCount"`)
- `sortOrder`: Orden (`"asc"`, `"desc"`)

#### `get_variable_by_id`
Obtiene una variable específica por su ID.

**Parámetros requeridos**:
- `variableId`: ID de la variable

#### `get_variable_collection_by_id`
Obtiene una colección específica por su ID.

**Parámetros requeridos**:
- `collectionId`: ID de la colección

### 3. 🔗 Herramientas de Binding (3 herramientas)

#### `set_bound_variable`
Vincula una variable a una propiedad de nodo.

**Parámetros requeridos**:
- `nodeId`: ID del nodo
- `property`: Propiedad del nodo (`"width"`, `"height"`, `"opacity"`, etc.)
- `variableId`: ID de la variable

**Compatibilidad de tipos**:
- Propiedades numéricas (`width`, `height`, `opacity`): Variables `FLOAT`
- Propiedades de texto (`characters`): Variables `STRING`
- Propiedades booleanas (`visible`, `locked`): Variables `BOOLEAN`

**Ejemplos de uso**:
```typescript
// Vincular ancho de frame a variable numérica
await set_bound_variable({
  nodeId: "frame-456",
  property: "width",
  variableId: "width-var-789"
});

// Vincular texto a variable de string
await set_bound_variable({
  nodeId: "text-123",
  property: "characters", 
  variableId: "text-var-456"
});
```

#### `set_bound_variable_for_paint`
Vincula una variable de color a fill o stroke de un nodo.

**Parámetros requeridos**:
- `nodeId`: ID del nodo
- `paintType`: Tipo de paint (`"fills"` o `"strokes"`)
- `paintIndex`: Índice del paint (0-based)
- `variableId`: ID de la variable COLOR

#### `remove_bound_variable`
Desvincula una variable de una propiedad o paint.

**Opciones flexibles**:
- Desvincular propiedad específica: usar `property`
- Desvincular paint específico: usar `paintType` + `paintIndex`
- Desvincular todas las vinculaciones: usar `removeAllBindings: true`

### 4. ✏️ Herramientas de Modificación (4 herramientas)

#### `update_variable_value`
Actualiza el valor de una variable.

**Parámetros requeridos**:
- `variableId`: ID de la variable
- `value`: Nuevo valor según el tipo de variable

**Parámetros opcionales**:
- `modeId`: ID del modo específico
- `validateType`: Validar compatibilidad de tipo (default: true)

#### `update_variable_name`
Cambia el nombre de una variable.

**Parámetros requeridos**:
- `variableId`: ID de la variable
- `newName`: Nuevo nombre

#### `delete_variable`
Elimina una variable con gestión de referencias.

**Parámetros requeridos**:
- `variableId`: ID de la variable

**Parámetros opcionales**:
- `forceDelete`: Forzar eliminación aunque tenga referencias
- `replacementValue`: Valor estático de reemplazo
- `replacementVariableId`: Variable de reemplazo

#### `delete_variable_collection`
Elimina una colección completa con limpieza en cascada.

### 5. 🚀 Herramientas Avanzadas (5 herramientas)

#### `get_variable_references`
Analiza dónde se usa una variable en el documento.

**Parámetros requeridos**:
- `variableId`: ID de la variable

**Parámetros opcionales**:
- `includeMetadata`: Incluir metadata detallada
- `includeNodeDetails`: Incluir detalles de nodos
- `groupByProperty`: Agrupar por tipo de propiedad

#### `set_variable_mode_value`
Establece un valor específico para un modo de variable.

#### `create_variable_mode`
Crea un nuevo modo en una colección.

#### `delete_variable_mode`
Elimina un modo con limpieza de referencias.

#### `reorder_variable_modes`
Reordena los modos de una colección.

### 6. 📤 Herramientas de Publicación (2 herramientas)

#### `publish_variable_collection`
Publica una colección en la biblioteca del equipo.

**Parámetros requeridos**:
- `collectionId`: ID de la colección

**Parámetros opcionales**:
- `makePublic`: Hacer pública la colección
- `allowEditing`: Permitir edición por otros
- `includeAllModes`: Incluir todos los modos

#### `get_published_variables`
Obtiene variables publicadas de bibliotecas del equipo.

**Parámetros opcionales**:
- `libraryKey`: Filtrar por biblioteca específica
- `filterByType`: Filtrar por tipo de variable
- `includeUsageStats`: Incluir estadísticas de uso

## Mejores Prácticas para Claude

### 1. 🎯 Flujo de Trabajo Recomendado

1. **Crear estructura**: Comenzar con `create_variable_collection`
2. **Crear variables**: Usar `create_variable` para cada token
3. **Aplicar bindings**: Usar `set_bound_variable` para vincular a nodos
4. **Gestionar valores**: Usar `update_variable_value` para cambios
5. **Publicar**: Usar `publish_variable_collection` para compartir

### 2. 🔍 Estrategias de Consulta

- Usar `get_local_variables` con filtros para evitar sobrecarga
- Implementar paginación para grandes conjuntos de datos
- Usar `get_variable_references` antes de eliminar variables

### 3. 🛡️ Manejo de Errores

Las herramientas manejan automáticamente:
- **Errores de validación**: Parámetros inválidos o faltantes
- **Errores de permisos**: Falta de acceso de edición
- **Errores de API**: Fallos de comunicación con Figma
- **Errores de referencia**: IDs no encontrados o eliminados

### 4. ⚡ Optimización de Performance

- Usar filtros específicos en lugar de obtener todas las variables
- Implementar paginación para operaciones de consulta grandes
- Usar operaciones batch cuando estén disponibles
- Verificar referencias antes de eliminaciones masivas

### 5. 🎨 Casos de Uso Comunes

#### Design System Setup
```typescript
// 1. Crear colección principal
await create_variable_collection({
  name: "Design System",
  initialModeNames: ["Light", "Dark"]
});

// 2. Crear variables de color
await create_variable({
  name: "primary-500",
  variableCollectionId: "collection-id",
  resolvedType: "COLOR",
  initialValue: { r: 0.2, g: 0.4, b: 0.8, a: 1.0 }
});

// 3. Aplicar a componentes
await set_bound_variable_for_paint({
  nodeId: "button-frame",
  paintType: "fills",
  paintIndex: 0,
  variableId: "primary-color-var"
});
```

#### Theme Switching
```typescript
// Actualizar valores para modo oscuro
await set_variable_mode_value({
  variableId: "background-color",
  modeId: "dark-mode",
  value: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 }
});
```

## Limitaciones y Consideraciones

### Restricciones de Figma API
- Variables de COLOR requieren valores RGB entre 0-1
- Nombres de variables deben comenzar con letra
- Máximo 255 caracteres para nombres
- Algunas operaciones requieren permisos de edición

### Timeout y Performance
- Operaciones complejas tienen timeouts optimizados
- Operaciones de referencia pueden ser lentas en documentos grandes
- Operaciones de publicación dependen de la red

### Compatibilidad
- Variables disponibles solo en archivos compatibles
- Algunas funciones requieren versiones específicas de Figma
- FigJam tiene limitaciones en el uso de variables

## Solución de Problemas

### Errores Comunes

1. **"Variable name cannot be empty"**
   - Verificar que el campo `name` no esté vacío
   - Asegurar que comience con una letra

2. **"Invalid collection ID format"**
   - Verificar que el ID de colección sea válido
   - Usar `get_local_variable_collections` para obtener IDs correctos

3. **"Permission denied"**
   - Verificar permisos de edición en el archivo
   - Contactar al propietario del archivo si es necesario

4. **"Variable type mismatch"**
   - Verificar compatibilidad entre tipo de variable y propiedad
   - Consultar tabla de compatibilidad en la sección de binding

### Debugging

1. Usar `get_variable_references` para entender dependencias
2. Verificar IDs con herramientas de consulta
3. Revisar logs de performance para operaciones lentas
4. Usar validación de tipos para detectar problemas temprano

## Actualizaciones y Versioning

- **Versión actual**: 1.0 (Task 1.10)
- **Herramientas disponibles**: 20/20 implementadas
- **Coverage de API**: Variables API completamente cubierta
- **Próximas actualizaciones**: Integración con style-tools (Fase 2)

Esta guía se actualiza con cada nueva versión del sistema de herramientas.

---

**Última actualización**: 20 de enero de 2025  
**Responsable**: Arquitecto de Software Senior  
**Revisión**: Tarea 1.10 completada 