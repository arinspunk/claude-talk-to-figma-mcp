# Plan Maestro: Desarrollo de Herramientas Figma Faltantes

**Fecha:** 19 de enero de 2025  
**Proyecto:** claude-talk-to-figma-mcp v0.5.2  
**Arquitecto:** Senior Backend Architect  
**Metodología:** Test-Driven Development (TDD) + Clean Architecture

---

## 📋 RESUMEN EJECUTIVO

Este plan maestro define la estrategia completa para desarrollar **84 herramientas adicionales** que ampliarán la cobertura de la API de Figma del actual 18% al **95%**. El desarrollo seguirá principios de Clean Architecture, TDD y los patrones arquitectónicos ya establecidos en el proyecto.

### 🎯 **Objetivos Estratégicos**
- **Incrementar cobertura**: 18% → 95% (84 nuevas herramientas)
- **Mantener calidad**: 100% test coverage para nuevas herramientas
- **Escalabilidad**: Arquitectura modular para futuras expansiones
- **Performance**: Optimización de operaciones batch y timeouts dinámicos
- **Seguridad**: Validación robusta con Zod en todas las herramientas

---

## 🏗️ ARQUITECTURA Y PATRONES IDENTIFICADOS

### **Patrones Actuales del Proyecto**
1. **Modular Tool Registration**: Cada categoría en archivo separado
2. **Zod Schema Validation**: Validación estricta de parámetros
3. **WebSocket Command Pattern**: Comunicación asíncrona con promises
4. **Error Handling**: Try-catch consistente con logging estructurado
5. **TypeScript Strict**: Tipado estricto con interfaces bien definidas

### **Estructura de Herramienta Estándar**
```typescript
server.tool(
  "tool_name",
  "Tool description",
  {
    param1: z.type().describe("Description"),
    param2: z.type().optional().describe("Optional param"),
  },
  async ({ param1, param2 }) => {
    try {
      const result = await sendCommandToFigma("figma_command", {
        param1,
        param2,
      });
      return {
        content: [
          {
            type: "text",
            text: `Success message: ${JSON.stringify(result)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);
```

### **Estructura de Test Estándar**
```typescript
describe("tool_name integration", () => {
  let server: McpServer;
  let mockSendCommand: jest.Mock;
  let toolHandler: Function;
  let toolSchema: z.ZodObject<any>;

  beforeEach(() => {
    // Setup server and mocks
    server = new McpServer(
      { name: 'test-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    
    mockSendCommand = require('../../src/talk_to_figma_mcp/utils/websocket').sendCommandToFigma;
    mockSendCommand.mockClear();
    
    // Register tool and capture handler
    const originalTool = server.tool.bind(server);
    jest.spyOn(server, 'tool').mockImplementation((...args: any[]) => {
      if (args.length === 4) {
        const [name, description, schema, handler] = args;
        if (name === 'tool_name') {
          toolHandler = handler;
          toolSchema = z.object(schema);
        }
      }
      return (originalTool as any)(...args);
    });
    
    registerNewTools(server);
  });

  // Tests for validation, functionality, edge cases
});
```

---

## 🚀 FASES DE DESARROLLO

### **FASE 1: VARIABLES & DATA BINDING (CRÍTICA)**
**Duración:** 3 semanas | **Prioridad:** 🔥 Alta

#### **Herramientas a Desarrollar (20 herramientas)**
1. `create_variable` - Crear variable
2. `create_variable_collection` - Crear colección de variables
3. `get_local_variables` - Obtener variables locales
4. `get_local_variable_collections` - Obtener colecciones locales
5. `get_variable_by_id` - Obtener variable por ID
6. `get_variable_collection_by_id` - Obtener colección por ID
7. `set_bound_variable` - Vincular variable a propiedad
8. `set_bound_variable_for_paint` - Vincular variable a color
9. `remove_bound_variable` - Desvincular variable
10. `update_variable_value` - Actualizar valor de variable
11. `update_variable_name` - Actualizar nombre de variable
12. `delete_variable` - Eliminar variable
13. `delete_variable_collection` - Eliminar colección
14. `get_variable_references` - Obtener referencias de variable
15. `set_variable_mode_value` - Establecer valor por modo
16. `create_variable_mode` - Crear modo de variable
17. `delete_variable_mode` - Eliminar modo de variable
18. `reorder_variable_modes` - Reordenar modos
19. `publish_variable_collection` - Publicar colección
20. `get_published_variables` - Obtener variables publicadas

#### **Archivo de Implementación**
- `src/talk_to_figma_mcp/tools/variable-tools.ts`

#### **Tests Requeridos**
- `tests/integration/variable-tools.test.ts`
- `tests/unit/utils/variable-helpers.test.ts`

---

### **FASE 2: STYLES MANAGEMENT (CRÍTICA)**
**Duración:** 2 semanas | **Prioridad:** 🔥 Alta

#### **Herramientas a Desarrollar (15 herramientas)**
1. `create_paint_style` - Crear estilo de color
2. `create_text_style` - Crear estilo de texto
3. `create_effect_style` - Crear estilo de efecto
4. `create_grid_style` - Crear estilo de grilla
5. `get_local_paint_styles` - Obtener estilos de color locales
6. `get_local_text_styles` - Obtener estilos de texto locales
7. `get_local_effect_styles` - Obtener estilos de efecto locales
8. `get_local_grid_styles` - Obtener estilos de grilla locales
9. `apply_paint_style` - Aplicar estilo de color
10. `apply_text_style` - Aplicar estilo de texto
11. `apply_effect_style` - Aplicar estilo de efecto
12. `apply_grid_style` - Aplicar estilo de grilla
13. `update_style_properties` - Actualizar propiedades de estilo
14. `delete_style` - Eliminar estilo
15. `publish_style` - Publicar estilo

#### **Archivo de Implementación**
- `src/talk_to_figma_mcp/tools/style-tools.ts`

#### **Tests Requeridos**
- `tests/integration/style-tools.test.ts`

---

### **FASE 3: BOOLEAN OPERATIONS (ALTA)**
**Duración:** 1 semana | **Prioridad:** ⚡ Media-Alta

#### **Herramientas a Desarrollar (8 herramientas)**
1. `union_nodes` - Unión de nodos
2. `subtract_nodes` - Sustracción de nodos
3. `intersect_nodes` - Intersección de nodos
4. `exclude_nodes` - Exclusión de nodos
5. `flatten_selection` - Aplanar selección
6. `outline_stroke` - Convertir trazo a forma
7. `boolean_operation_batch` - Operaciones booleanas en lote
8. `get_boolean_result_preview` - Previsualizar resultado booleano

#### **Archivo de Implementación**
- `src/talk_to_figma_mcp/tools/boolean-tools.ts`

#### **Tests Requeridos**
- `tests/integration/boolean-tools.test.ts`

---

### **FASE 4: LAYOUT ADVANCED (ALTA)**
**Duración:** 2 semanas | **Prioridad:** ⚡ Media-Alta

#### **Herramientas a Desarrollar (12 herramientas)**
1. `group_nodes` - Agrupar nodos
2. `ungroup_node` - Desagrupar nodo
3. `create_section` - Crear sección
4. `set_constraints` - Establecer restricciones
5. `set_layout_grid` - Configurar grilla de layout
6. `set_layout_positioning` - Configurar posicionamiento
7. `create_auto_layout` - Crear auto layout
8. `set_auto_layout_properties` - Configurar propiedades auto layout
9. `distribute_nodes` - Distribuir nodos
10. `align_nodes` - Alinear nodos
11. `create_component_set` - Crear set de componentes
12. `organize_layers` - Organizar capas automáticamente

#### **Archivo de Implementación**
- `src/talk_to_figma_mcp/tools/layout-tools.ts`

#### **Tests Requeridos**
- `tests/integration/layout-tools.test.ts`

---

### **FASE 5: NAVIGATION & VIEWPORT (MEDIA)**
**Duración:** 1 semana | **Prioridad:** 📱 Media

#### **Herramientas a Desarrollar (8 herramientas)**
1. `scroll_to_node` - Navegar a nodo
2. `zoom_to_fit` - Zoom para ajustar
3. `set_viewport_center` - Centrar viewport
4. `get_viewport_bounds` - Obtener límites de viewport
5. `zoom_in` - Acercar zoom
6. `zoom_out` - Alejar zoom
7. `fit_to_screen` - Ajustar a pantalla
8. `focus_on_selection` - Enfocar en selección

#### **Archivo de Implementación**
- `src/talk_to_figma_mcp/tools/navigation-tools.ts`

#### **Tests Requeridos**
- `tests/integration/navigation-tools.test.ts`

---

### **FASE 6: PLUGIN DATA & STORAGE (MEDIA)**
**Duración:** 1 semana | **Prioridad:** 📱 Media

#### **Herramientas a Desarrollar (6 herramientas)**
1. `set_plugin_data` - Establecer datos de plugin
2. `get_plugin_data` - Obtener datos de plugin
3. `set_shared_plugin_data` - Establecer datos compartidos
4. `get_shared_plugin_data` - Obtener datos compartidos
5. `remove_plugin_data` - Eliminar datos de plugin
6. `list_plugin_data_keys` - Listar claves de datos

#### **Archivo de Implementación**
- `src/talk_to_figma_mcp/tools/storage-tools.ts`

#### **Tests Requeridos**
- `tests/integration/storage-tools.test.ts`

---

### **FASE 7: ADVANCED MEDIA (MEDIA)**
**Duración:** 1.5 semanas | **Prioridad:** 📱 Media

#### **Herramientas a Desarrollar (8 herramientas)**
1. `create_image_node` - Crear nodo de imagen
2. `create_video_node` - Crear nodo de video
3. `create_gif_node` - Crear nodo GIF
4. `create_link_preview` - Crear vista previa de enlace
5. `import_image_from_url` - Importar imagen desde URL
6. `export_images_batch` - Exportar imágenes en lote
7. `optimize_image_size` - Optimizar tamaño de imagen
8. `get_image_metadata` - Obtener metadatos de imagen

#### **Archivo de Implementación**
- `src/talk_to_figma_mcp/tools/media-tools.ts`

#### **Tests Requeridos**
- `tests/integration/media-tools.test.ts`

---

### **FASE 8: FIGJAM TOOLS (BAJA)**
**Duración:** 1.5 semanas | **Prioridad:** 📋 Baja

#### **Herramientas a Desarrollar (10 herramientas)**
1. `create_sticky` - Crear nota adhesiva
2. `create_connector` - Crear conector
3. `create_shape_with_text` - Crear forma con texto
4. `create_code_block` - Crear bloque de código
5. `create_table` - Crear tabla
6. `create_flowchart` - Crear diagrama de flujo
7. `create_mind_map` - Crear mapa mental
8. `create_stamp` - Crear sello
9. `create_drawing` - Crear dibujo libre
10. `organize_figjam_board` - Organizar tablero FigJam

#### **Archivo de Implementación**
- `src/talk_to_figma_mcp/tools/figjam-tools.ts`

#### **Tests Requeridos**
- `tests/integration/figjam-tools.test.ts`

---

### **FASE 9: DEV MODE TOOLS (BAJA)**
**Duración:** 1 semana | **Prioridad:** 📋 Baja

#### **Herramientas a Desarrollar (7 herramientas)**
1. `get_selection_colors` - Obtener colores de selección
2. `generate_code_css` - Generar código CSS
3. `generate_code_react` - Generar código React
4. `generate_code_flutter` - Generar código Flutter
5. `set_dev_resources` - Establecer recursos de desarrollo
6. `get_design_tokens` - Obtener tokens de diseño
7. `export_dev_specs` - Exportar especificaciones de desarrollo

#### **Archivo de Implementación**
- `src/talk_to_figma_mcp/tools/dev-tools.ts`

#### **Tests Requeridos**
- `tests/integration/dev-tools.test.ts`

---

## 🧪 ESTRATEGIA DE TESTING

### **Test-Driven Development (TDD)**
1. **Red**: Escribir test fallido
2. **Green**: Implementar mínimo para pasar test
3. **Refactor**: Mejorar código manteniendo tests verdes

### **Niveles de Testing**
1. **Unit Tests**: Utilidades y helpers individuales
2. **Integration Tests**: Herramientas completas con mocks de WebSocket
3. **E2E Tests**: Validación con Figma real (opcional)

### **Cobertura Mínima Requerida**
- **Unit Tests**: 95%+ coverage
- **Integration Tests**: 100% de herramientas cubiertas
- **Error Scenarios**: 100% de casos de error cubiertos

### **Estructura de Test por Herramienta**
```typescript
describe("tool_name", () => {
  describe("parameter validation", () => {
    // Zod validation tests
  });
  
  describe("functionality", () => {
    // Happy path tests
  });
  
  describe("error handling", () => {
    // Error scenario tests
  });
  
  describe("edge cases", () => {
    // Boundary condition tests
  });
});
```

---

## 📁 ESTRUCTURA DE ARCHIVOS

### **Nuevos Archivos de Herramientas**
```
src/talk_to_figma_mcp/tools/
├── variable-tools.ts      # FASE 1
├── style-tools.ts         # FASE 2
├── boolean-tools.ts       # FASE 3
├── layout-tools.ts        # FASE 4
├── navigation-tools.ts    # FASE 5
├── storage-tools.ts       # FASE 6
├── media-tools.ts         # FASE 7
├── figjam-tools.ts        # FASE 8
└── dev-tools.ts           # FASE 9
```

### **Nuevos Archivos de Test**
```
tests/integration/
├── variable-tools.test.ts
├── style-tools.test.ts
├── boolean-tools.test.ts
├── layout-tools.test.ts
├── navigation-tools.test.ts
├── storage-tools.test.ts
├── media-tools.test.ts
├── figjam-tools.test.ts
└── dev-tools.test.ts
```

### **Actualización de index.ts**
```typescript
// src/talk_to_figma_mcp/tools/index.ts
import { registerVariableTools } from "./variable-tools";
import { registerStyleTools } from "./style-tools";
// ... importar todas las nuevas categorías

export function registerTools(server: McpServer): void {
  // Herramientas existentes
  registerDocumentTools(server);
  registerCreationTools(server);
  registerModificationTools(server);
  registerTextTools(server);
  registerComponentTools(server);
  
  // Nuevas herramientas
  registerVariableTools(server);
  registerStyleTools(server);
  registerBooleanTools(server);
  registerLayoutTools(server);
  registerNavigationTools(server);
  registerStorageTools(server);
  registerMediaTools(server);
  registerFigJamTools(server);
  registerDevTools(server);
}
```

---

## ⚙️ IMPLEMENTACIÓN TÉCNICA

### **Configuración de Timeouts Dinámicos**
```typescript
// utils/timeout-config.ts
export const TOOL_TIMEOUTS = {
  simple: 5000,      // Operaciones básicas
  complex: 15000,    // Operaciones complejas
  batch: 30000,      // Operaciones en lote
  export: 60000,     // Exportaciones
  boolean: 20000,    // Operaciones booleanas
} as const;
```

### **Validación de Parámetros Avanzada**
```typescript
// Esquemas reutilizables
const ColorSchema = z.object({
  r: z.number().min(0).max(1),
  g: z.number().min(0).max(1),
  b: z.number().min(0).max(1),
  a: z.number().min(0).max(1).optional().default(1),
});

const NodeIdSchema = z.string().min(1).describe("Node ID");
const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});
```

### **Error Handling Mejorado**
```typescript
// utils/error-handling.ts
export class FigmaToolError extends Error {
  constructor(
    message: string,
    public toolName: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'FigmaToolError';
  }
}

export function handleToolError(
  error: unknown,
  toolName: string
): { content: Array<{ type: "text"; text: string }> } {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(`Error in ${toolName}: ${errorMessage}`);
  
  return {
    content: [
      {
        type: "text",
        text: `Error executing ${toolName}: ${errorMessage}`,
      },
    ],
  };
}
```

---

## 📊 ESTIMACIONES DE ESFUERZO

### **Por Fase**
| Fase | Herramientas | Duración | Complejidad | Dependencias |
|------|--------------|-----------|-------------|--------------|
| **FASE 1** | 20 | 3 semanas | Alta | Ninguna |
| **FASE 2** | 15 | 2 semanas | Alta | Ninguna |
| **FASE 3** | 8 | 1 semana | Media | Ninguna |
| **FASE 4** | 12 | 2 semanas | Alta | Ninguna |
| **FASE 5** | 8 | 1 semana | Media | Ninguna |
| **FASE 6** | 6 | 1 semana | Baja | Ninguna |
| **FASE 7** | 8 | 1.5 semanas | Media | Ninguna |
| **FASE 8** | 10 | 1.5 semanas | Media | Ninguna |
| **FASE 9** | 7 | 1 semana | Media | Ninguna |

### **Cronograma Total**
- **Desarrollo**: 13 semanas (3.25 meses)
- **Testing & QA**: +2 semanas
- **Documentación**: +1 semana
- **Total**: **16 semanas (4 meses)**

### **Recursos Necesarios**
- **1 Desarrollador Senior**: Full-time
- **1 QA Engineer**: Part-time (50%)
- **1 Arquitecto**: Supervisión (25%)

---

## 🔒 CRITERIOS DE CALIDAD

### **Código**
- ✅ TypeScript strict mode
- ✅ 100% test coverage nuevas herramientas
- ✅ Consistencia con patrones existentes
- ✅ Error handling robusto
- ✅ Documentación JSDoc completa

### **Performance**
- ✅ Timeouts apropiados por tipo de operación
- ✅ Batch operations optimizadas
- ✅ Memory usage controlado
- ✅ Logging eficiente

### **Seguridad**
- ✅ Validación de entrada con Zod
- ✅ Sanitización de parámetros
- ✅ Error messages seguros
- ✅ Rate limiting considerations

---

## 🚀 ROADMAP DE IMPLEMENTACIÓN

### **Sprint 1-3: Variables & Data Binding (FASE 1)**
- Semana 1: Diseño arquitectónico + 8 herramientas básicas
- Semana 2: 8 herramientas intermedias + tests
- Semana 3: 4 herramientas avanzadas + integración

### **Sprint 4-5: Styles Management (FASE 2)**
- Semana 4: 8 herramientas de estilo + tests
- Semana 5: 7 herramientas avanzadas + optimización

### **Sprint 6: Boolean Operations (FASE 3)**
- Semana 6: 8 herramientas booleanas completas

### **Sprint 7-8: Layout Advanced (FASE 4)**
- Semana 7: 6 herramientas básicas de layout
- Semana 8: 6 herramientas avanzadas + auto-layout

### **Sprint 9-13: Fases 5-9 (Herramientas Restantes)**
- Implementación progresiva según prioridades
- Testing continuo y refactoring

---

## 🔧 CONFIGURACIÓN DE DESARROLLO

### **Scripts NPM Adicionales**
```json
{
  "scripts": {
    "test:tools": "jest tests/integration --testPathPattern=tools",
    "test:coverage": "jest --coverage --coverageDirectory=coverage/tools",
    "lint:tools": "eslint src/talk_to_figma_mcp/tools/**/*.ts",
    "build:dev": "bun run build && bun run test:tools"
  }
}
```

### **Pre-commit Hooks**
```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: typescript-check
        name: TypeScript Check
        entry: bunx tsc --noEmit
        language: system
        files: '\.ts$'
      - id: test-affected
        name: Test Affected Tools
        entry: bun run test:tools
        language: system
        files: 'src/talk_to_figma_mcp/tools/.*\.ts$'
```

---

## 📈 MÉTRICAS DE ÉXITO

### **Cobertura de API**
- **Actual**: 18% (33 herramientas)
- **Meta**: 95% (117 herramientas)
- **Incremento**: +77% (+84 herramientas)

### **Calidad del Código**
- **Test Coverage**: 100% nuevas herramientas
- **TypeScript Strict**: 100% compliance
- **Linting Errors**: 0

### **Performance**
- **WebSocket Timeout Rate**: <5%
- **Tool Execution Time**: <30s average
- **Error Rate**: <2%

---

## 🔄 PRÓXIMOS PASOS INMEDIATOS

### **Pre-desarrollo (Semana 0)**
1. ✅ Aprobar plan maestro
2. ⏳ Configurar estructura de testing
3. ⏳ Crear templates de herramientas
4. ⏳ Establecer CI/CD pipeline

### **Inicio FASE 1 (Semana 1)**
1. ⏳ Crear `variable-tools.ts`
2. ⏳ Implementar primeras 5 herramientas con TDD
3. ⏳ Configurar tests de integración
4. ⏳ Validar patrones arquitectónicos

---

## 💡 CONSIDERACIONES FUTURAS

### **Extensibilidad**
- Plugin system para herramientas personalizadas
- API pública para terceros
- Hooks para pre/post procesamiento

### **Optimizaciones**
- Caching de resultados frecuentes
- Compresión de payloads WebSocket
- Pool de conexiones múltiples

### **Integraciones**
- Design system synchronization
- Version control integration
- CI/CD design automation

---

**🎯 Este plan maestro garantiza una implementación sistemática, escalable y de alta calidad que transformará claude-talk-to-figma-mcp en la solución MCP más completa para Figma.**

*Documento vivo - Versión 1.0 - Para aprobación arquitectónica* 