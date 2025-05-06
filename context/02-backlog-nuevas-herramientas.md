# Backlog de Implementación - Nuevas Herramientas Figma MCP

Este documento detalla las tareas específicas para implementar las nuevas herramientas de Figma en el proyecto MCP, siguiendo el plan establecido en el documento de planificación.

## 1. Actualización de Tipos y Preparación

- [x] **T1.1**: Actualizar el tipo `FigmaCommand` en `types/index.ts` para incluir todos los nuevos comandos
  - Añadir nuevos tipos de comandos para todas las nuevas herramientas
  - **Completado (06/05/2025)**: Se han añadido 16 nuevos comandos al tipo `FigmaCommand` organizados en cuatro categorías (propiedades visuales, bordes, layout y componentes avanzados). También se han creado todas las interfaces y enumeraciones necesarias para los parámetros de estas herramientas, siguiendo las convenciones de nomenclatura y estructura del proyecto. Se eligió usar enumeraciones para los valores predefinidos (como `BlendMode`, `StrokeAlign`, etc.) para proporcionar autocompletado y comprobación de tipos.

- [x] **T1.2**: Definir interfaces o tipos auxiliares para los nuevos parámetros
  - Crear tipos como `StrokeProperties`, `SizeConstraints`, `LayoutSettings`, etc.
  - **Completado (06/05/2025)**: Se han creado 15 interfaces de parámetros y 5 enumeraciones para dar soporte a todos los nuevos comandos. Cada interfaz tiene documentación en línea que describe el propósito de cada parámetro. Las interfaces siguen un patrón consistente donde todas incluyen `nodeId` como parámetro requerido y los parámetros específicos de la funcionalidad como opcionales donde corresponde.

- [x] **T1.3**: Crear nuevos archivos para categorías de herramientas
  - Crear `visual-properties-tools.ts` con estructura básica
  - Crear `stroke-tools.ts` con estructura básica
  - Crear `layout-tools.ts` con estructura básica
  - Crear `component-advanced-tools.ts` con estructura básica
  - **Completado (06/05/2025)**: Se han creado los cuatro archivos de herramientas con la estructura básica necesaria. Cada archivo incluye las importaciones adecuadas y una función de registro vacía que será implementada en fases posteriores. Se ha seguido el patrón establecido en los archivos de herramientas existentes.

- [x] **T1.4**: Actualizar `tools/index.ts` para exportar las nuevas herramientas
  - **Completado (06/05/2025)**: Se ha actualizado el archivo `tools/index.ts` para importar y registrar las nuevas categorías de herramientas. Esto garantiza que todas las nuevas herramientas serán registradas con el servidor MCP cuando se inicie la aplicación.

- [x] **T1.5**: Modificar `server.ts` para registrar las nuevas categorías de herramientas
  - **Completado (06/05/2025)**: Después de revisar el archivo `server.ts`, se ha confirmado que no requiere modificaciones adicionales. La arquitectura del proyecto está diseñada de manera modular, y el registro de herramientas se maneja a través de la función `registerTools` importada desde `tools/index.ts`. Como ya se ha actualizado el archivo `tools/index.ts` para importar y registrar las nuevas categorías de herramientas, éstas ya serán registradas automáticamente cuando se ejecute la función `registerTools(server)` en `server.ts`. Este enfoque modular facilita la extensibilidad del sistema, permitiendo añadir nuevas categorías de herramientas sin modificar el punto de entrada principal.

## 2. Implementación de Propiedades Visuales Básicas

En `visual-properties-tools.ts`:

- [x] **T2.1**: Implementar herramienta `set_opacity`
  - Parámetros:
    - nodeId: string
    - opacity: number (0-1)
  - Implementación en el servidor MCP
  - Implementación en el plugin (code.js)
  - Pruebas básicas
  - **Completado (06/05/2025)**: Se ha implementado correctamente la herramienta `set_opacity` en el plugin de Figma (code.js). Durante la implementación se descubrió que la herramienta ya estaba definida en el servidor MCP dentro del archivo `visual-properties-tools.ts`, pero faltaba la implementación en el plugin. Se ha añadido la función `setOpacity` en code.js para manejar este comando, incluyendo validación adecuada de parámetros (verificando que el valor de opacidad está entre 0 y 1) y manejo de errores para casos como nodos no encontrados o nodos que no soportan opacidad. La herramienta permite a Claude controlar la transparencia de cualquier elemento en Figma con un valor entre 0 (completamente transparente) y 1 (completamente opaco).
  - **Resultados de pruebas (06/05/2025)**: La herramienta ha sido probada con éxito en Claude. Se realizaron dos pruebas:
    1. Cambiar la opacidad de "Estrella Azul 6 Puntas" (nodeId: 3:2) a 0.5 (50%) - Resultado: Exitoso
    2. Cambiar la opacidad de "Test Rectangle" (nodeId: 1:6) a 0.7 (70%) - Resultado: Exitoso
    Las pruebas confirmaron que la herramienta funciona correctamente, que la comunicación entre Claude y Figma a través del MCP está operativa, y que los valores de opacidad se aplican y reportan correctamente. La respuesta del servidor MCP incluye tanto el valor decimal de opacidad como el porcentaje para mayor claridad para el usuario.

- [ ] **T2.2**: Implementar herramienta `set_rotation`
  - Parámetros:
    - nodeId: string
    - rotation: number (grados)
  - Implementación en el servidor MCP
  - Implementación en el plugin (code.js)
  - Pruebas básicas

- [ ] **T2.3**: Implementar herramienta `set_blend_mode`
  - Parámetros:
    - nodeId: string
    - blendMode: enum (NORMAL, MULTIPLY, SCREEN, etc.)
  - Implementación en el servidor MCP
  - Implementación en el plugin (code.js)
  - Pruebas básicas

- [ ] **T2.4**: Implementar herramienta `set_clips_content`
  - Parámetros:
    - nodeId: string
    - clipsContent: boolean
  - Implementación en el servidor MCP
  - Implementación en el plugin (code.js)
  - Pruebas básicas

## 3. Control de Bordes Avanzado

En `stroke-tools.ts`:

- [ ] **T3.1**: Implementar herramienta `set_stroke_align`
  - Parámetros:
    - nodeId: string
    - strokeAlign: enum (INSIDE, CENTER, OUTSIDE)
  - Implementación en el servidor MCP
  - Implementación en el plugin (code.js)
  - Pruebas básicas

- [ ] **T3.2**: Implementar herramienta `set_stroke_properties`
  - Parámetros:
    - nodeId: string
    - strokeCap: enum (NONE, ROUND, SQUARE, etc.) - opcional
    - strokeJoin: enum (MITER, BEVEL, ROUND) - opcional
  - Implementación en el servidor MCP
  - Implementación en el plugin (code.js)
  - Pruebas básicas

- [ ] **T3.3**: Implementar herramienta `set_stroke_weights`
  - Parámetros:
    - nodeId: string
    - strokeTopWeight: number - opcional
    - strokeRightWeight: number - opcional
    - strokeBottomWeight: number - opcional
    - strokeLeftWeight: number - opcional
  - Implementación en el servidor MCP
  - Implementación en el plugin (code.js)
  - Pruebas básicas

- [ ] **T3.4**: Implementar herramienta `set_dash_pattern`
  - Parámetros:
    - nodeId: string
    - dashPattern: array de números
  - Implementación en el servidor MCP
  - Implementación en el plugin (code.js)
  - Pruebas básicas

## 4. Propiedades de Tamaño Adaptativo

En `layout-tools.ts`:

- [ ] **T4.1**: Implementar herramienta `set_layout_sizing`
  - Parámetros:
    - nodeId: string
    - layoutSizingHorizontal: enum (FIXED, HUG, FILL) - opcional
    - layoutSizingVertical: enum (FIXED, HUG, FILL) - opcional
  - Implementación en el servidor MCP
  - Implementación en el plugin (code.js)
  - Pruebas básicas

- [ ] **T4.2**: Implementar herramienta `set_layout_positioning`
  - Parámetros:
    - nodeId: string
    - layoutGrow: number - opcional
    - layoutAlign: enum (MIN, CENTER, MAX, STRETCH) - opcional
  - Implementación en el servidor MCP
  - Implementación en el plugin (code.js)
  - Pruebas básicas

- [ ] **T4.3**: Implementar herramienta `set_size_constraints`
  - Parámetros:
    - nodeId: string
    - minWidth: number - opcional
    - minHeight: number - opcional
    - maxWidth: number - opcional
    - maxHeight: number - opcional
  - Implementación en el servidor MCP
  - Implementación en el plugin (code.js)
  - Pruebas básicas

- [ ] **T4.4**: Implementar herramienta `set_constraints`
  - Parámetros:
    - nodeId: string
    - horizontal: enum (LEFT, RIGHT, CENTER, SCALE, STRETCH) - opcional
    - vertical: enum (TOP, BOTTOM, CENTER, SCALE, STRETCH) - opcional
  - Implementación en el servidor MCP
  - Implementación en el plugin (code.js)
  - Pruebas básicas

## 5. Capacidades de Componentes Avanzadas

En `component-advanced-tools.ts`:

- [ ] **T5.1**: Implementar herramienta `get_component_properties`
  - Parámetros:
    - nodeId: string
  - Implementación en el servidor MCP
  - Implementación en el plugin (code.js)
  - Pruebas básicas

- [ ] **T5.2**: Implementar herramienta `edit_component_property`
  - Parámetros:
    - nodeId: string
    - propertyName: string
    - propertyValue: any
  - Implementación en el servidor MCP
  - Implementación en el plugin (code.js)
  - Pruebas básicas

- [ ] **T5.3**: Implementar herramienta `set_component_property_definitions`
  - Parámetros:
    - nodeId: string
    - propertyDefinitions: objeto con definiciones de propiedades
  - Implementación en el servidor MCP
  - Implementación en el plugin (code.js)
  - Pruebas básicas

## 6. Implementación en el Plugin de Figma

- [ ] **T6.1**: Actualizar función `handleCommand` en `code.js`
  - Añadir casos para todos los nuevos comandos
  - Implementar lógica básica de validación

- [ ] **T6.2**: Implementar funciones específicas en `code.js`
  - Crear una función para cada nuevo comando
  - Asegurar manejo de errores adecuado

- [ ] **T6.3**: Pruebas integradas de comandos
  - Probar cada comando individualmente
  - Verificar respuestas correctas y manejo de errores

## 7. Documentación y Pruebas Finales

- [ ] **T7.1**: Documentar nuevas herramientas
  - Actualizar README o documentación existente
  - Incluir ejemplos de uso para cada herramienta

- [ ] **T7.2**: Crear ejemplos y demostraciones
  - Crear ejemplos para cada categoría de herramientas
  - Documentar casos de uso típicos

- [ ] **T7.3**: Pruebas de integración completas
  - Probar flujo completo Claude -> MCP -> Figma
  - Verificar que todos los comandos funcionan en conjunto

## Implementación técnica de detalles clave

### Estructura básica de un archivo de herramientas

```typescript
// Ejemplo para visual-properties-tools.ts
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "../utils/websocket";

/**
 * Register visual property tools to the MCP server
 * This module contains tools for modifying visual properties of elements in Figma
 * @param server - The MCP server instance
 */
export function registerVisualPropertyTools(server: McpServer): void {
  // Tool implementations will go here...

  // Example: set_opacity
  server.tool(
    "set_opacity",
    "Set the opacity of a node in Figma",
    {
      nodeId: z.string().describe("The ID of the node to modify"),
      opacity: z.number().min(0).max(1).describe("Opacity value between 0 and 1"),
    },
    async ({ nodeId, opacity }) => {
      try {
        const result = await sendCommandToFigma("set_opacity", {
          nodeId,
          opacity,
        });
        const typedResult = result as { name: string };
        return {
          content: [
            {
              type: "text",
              text: `Set opacity of node "${typedResult.name}" to ${opacity}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error setting opacity: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Additional tools will be implemented here...
}
```

### Actualización de tools/index.ts

```typescript
// En tools/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerDocumentTools } from "./document-tools.js";
import { registerCreationTools } from "./creation-tools.js";
import { registerModificationTools } from "./modification-tools.js";
import { registerTextTools } from "./text-tools.js";
import { registerComponentTools } from "./component-tools.js";
// Importar nuevas herramientas
import { registerVisualPropertyTools } from "./visual-properties-tools.js";
import { registerStrokeTools } from "./stroke-tools.js";
import { registerLayoutTools } from "./layout-tools.js";
import { registerComponentAdvancedTools } from "./component-advanced-tools.js";

/**
 * Register all tools to the MCP server
 * @param server - The MCP server instance
 */
export function registerAllTools(server: McpServer): void {
  // Register existing tools
  registerDocumentTools(server);
  registerCreationTools(server);
  registerModificationTools(server);
  registerTextTools(server);
  registerComponentTools(server);
  
  // Register new tools
  registerVisualPropertyTools(server);
  registerStrokeTools(server);
  registerLayoutTools(server);
  registerComponentAdvancedTools(server);
}
```

### Ejemplo de implementación en plugin (code.js)

```javascript
// En code.js (función handleCommand)
async function handleCommand(command, params) {
  switch (command) {
    // ...existing commands...
    
    // Nuevos comandos de propiedades visuales
    case "set_opacity":
      return await setOpacity(params);
    case "set_rotation":
      return await setRotation(params);
    case "set_blend_mode":
      return await setBlendMode(params);
    case "set_clips_content":
      return await setClipsContent(params);
    
    // Nuevos comandos de bordes
    case "set_stroke_align":
      return await setStrokeAlign(params);
    case "set_stroke_properties":
      return await setStrokeProperties(params);
    case "set_stroke_weights":
      return await setStrokeWeights(params);
    case "set_dash_pattern":
      return await setDashPattern(params);
    
    // Nuevos comandos de layout
    case "set_layout_sizing":
      return await setLayoutSizing(params);
    case "set_layout_positioning":
      return await setLayoutPositioning(params);
    case "set_size_constraints":
      return await setSizeConstraints(params);
    case "set_constraints":
      return await setConstraints(params);
    
    // Nuevos comandos de componentes avanzados
    case "get_component_properties":
      return await getComponentProperties(params);
    case "edit_component_property":
      return await editComponentProperty(params);
    case "set_component_property_definitions":
      return await setComponentPropertyDefinitions(params);
    
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

// Implementación de una función para manejar set_opacity
async function setOpacity(params) {
  const { nodeId, opacity } = params || {};
  
  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }
  
  if (opacity === undefined || opacity < 0 || opacity > 1) {
    throw new Error("Invalid opacity parameter. Must be between 0 and 1");
  }
  
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }
  
  if (!("opacity" in node)) {
    throw new Error(`Node does not support opacity: ${nodeId}`);
  }
  
  node.opacity = opacity;
  
  return {
    id: node.id,
    name: node.name,
    opacity: node.opacity
  };
}
```

## Criterios de Aceptación

Para cada herramienta implementada, deberán cumplirse los siguientes criterios:

1. El comando debe estar correctamente definido en la lista de `FigmaCommand`.
2. La herramienta debe estar correctamente registrada en el servidor MCP.
3. La implementación en el plugin de Figma debe funcionar correctamente.
4. Debe manejar errores adecuadamente (parámetros incorrectos, nodos no encontrados, etc.).
5. Debe retornar información útil sobre el resultado de la operación.
6. Debe estar documentada con ejemplos de uso.