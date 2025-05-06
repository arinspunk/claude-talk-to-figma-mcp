# Plan de Implementación - Nuevas Herramientas Figma MCP

## Resumen Ejecutivo

Este documento describe el plan para implementar nuevas herramientas en el proyecto Claude Talk to Figma MCP, con el objetivo de ampliar las capacidades de modificación de elementos en Figma. Las nuevas herramientas se centran en cuatro categorías principales: propiedades de tamaño adaptativo, propiedades visuales adicionales, control de bordes avanzado y capacidades de componentes avanzadas.

## Análisis de la Propuesta

Se solicita implementar las siguientes capacidades:

1. **Propiedades de Tamaño Adaptativo**
   - layoutSizingHorizontal, layoutSizingVertical (FIXED/HUG/FILL)
   - layoutGrow, layoutAlign
   - minWidth, minHeight, maxWidth, maxHeight
   - constraints

2. **Propiedades Visuales Adicionales**
   - opacity
   - blendMode
   - clipsContent (para frames)
   - rotation

3. **Control de Bordes Avanzado**
   - strokeAlign (INSIDE/CENTER/OUTSIDE)
   - strokeCap, strokeJoin
   - strokeWeight (específico por lado: strokeTopWeight, etc.)
   - dashPattern

4. **Capacidades de Componentes Avanzadas**
   - componentPropertyDefinitions
   - componentPropertyReferences
   - editComponentProperty

## Enfoque de Implementación

Tras analizar el código existente, propongo un enfoque sistemático y modular:

1. **Modificación Incremental**: Implementar las nuevas herramientas de forma gradual, empezando por las más simples.
2. **Reutilización de Patrones**: Seguir los patrones ya establecidos en el código existente.
3. **Organización por Categorías**: Agrupar las nuevas herramientas en nuevos archivos por categorías lógicas.
4. **Pruebas Progresivas**: Probar cada herramienta individualmente antes de pasar a la siguiente.

## Plan de Acción Detallado

### Fase 1: Preparación y Planificación

1. **Actualizar Tipos** ✅ (Completado 06/05/2025)
   - Modificar el archivo `types/index.ts` para incluir los nuevos comandos en el tipo `FigmaCommand`.
   - Crear interfaces o tipos para los nuevos parámetros y respuestas.

2. **Crear Nuevos Archivos para Categorías de Herramientas**
   - Crear `visual-properties-tools.ts` para propiedades visuales adicionales (opacity, rotation, blendMode, clipsContent)
   - Crear `stroke-tools.ts` para control de bordes avanzado
   - Crear `layout-tools.ts` para propiedades de tamaño adaptativo
   - Crear `component-advanced-tools.ts` para capacidades avanzadas de componentes
   - Modificar `tools/index.ts` para exportar las nuevas herramientas

3. **Actualizar el Registro de Herramientas**
   - Modificar `server.ts` para registrar las nuevas categorías de herramientas

### Fase 2: Implementación de Propiedades Visuales Básicas

Implementar en el nuevo archivo `visual-properties-tools.ts`:

1. **Implementar `set_opacity`**
   - Añadir herramienta para establecer la opacidad de un nodo.
   - Requerirá `nodeId` y un valor de opacidad entre 0 y 1.

2. **Implementar `set_rotation`**
   - Añadir herramienta para rotar un nodo.
   - Requerirá `nodeId` y un ángulo de rotación en grados.

3. **Implementar `set_blend_mode`**
   - Añadir herramienta para establecer el modo de fusión.
   - Requerirá `nodeId` y un modo de fusión válido.

4. **Implementar `set_clips_content`**
   - Añadir herramienta para configurar si un frame recorta su contenido.
   - Requerirá `nodeId` y un valor booleano.

### Fase 3: Implementación de Control de Bordes Avanzado

Implementar en el nuevo archivo `stroke-tools.ts`:

1. **Implementar `set_stroke_align`**
   - Una herramienta para establecer la alineación del borde.
   - Requerirá `nodeId` y un valor de alineación (INSIDE/CENTER/OUTSIDE).

2. **Implementar `set_stroke_properties`**
   - Añadir herramienta para configurar cap y join de los bordes.
   - Requerirá `nodeId` y valores para strokeCap y strokeJoin.

3. **Implementar `set_stroke_weights`**
   - Añadir herramienta para establecer el grosor del borde por cada lado (top, right, bottom, left).
   - Requerirá `nodeId` y valores para cada lado.

4. **Implementar `set_dash_pattern`**
   - Añadir herramienta para establecer el patrón de línea discontinua.
   - Requerirá `nodeId` y un array con el patrón.

### Fase 4: Implementación de Propiedades de Tamaño Adaptativo

Implementar en el nuevo archivo `layout-tools.ts`:

1. **Implementar `set_layout_sizing`**
   - Añadir herramienta para configurar el dimensionamiento adaptativo.
   - Requerirá `nodeId` y valores para horizontal y vertical.

2. **Implementar `set_layout_positioning`**
   - Añadir herramienta para configurar layoutGrow y layoutAlign.
   - Requerirá `nodeId` y los valores correspondientes.

3. **Implementar `set_size_constraints`**
   - Añadir herramienta para establecer tamaños mínimos y máximos.
   - Requerirá `nodeId` y valores para minWidth, minHeight, maxWidth, maxHeight.

4. **Implementar `set_constraints`**
   - Añadir herramienta para configurar restricciones de posición.
   - Requerirá `nodeId` y valores para horizontal y vertical.

### Fase 5: Implementación de Capacidades de Componentes Avanzadas

Implementar en el nuevo archivo `component-advanced-tools.ts`:

1. **Implementar `get_component_properties`**
   - Añadir herramienta para obtener las definiciones de propiedades de un componente.
   - Requerirá `nodeId` del componente.

2. **Implementar `edit_component_property`**
   - Añadir herramienta para editar una propiedad específica de un componente.
   - Requerirá `nodeId`, `property` y `value`.

3. **Implementar `set_component_property_definitions`**
   - Añadir herramienta para establecer las definiciones de propiedades de un componente.
   - Requerirá `nodeId` y un objeto con las definiciones.

### Fase 6: Modificación del Plugin de Figma

1. **Actualizar `code.js`**
   - Añadir implementaciones para cada nuevo comando en la función `handleCommand`.
   - Implementar cada nuevo comando de forma independiente.

2. **Pruebas de cada comando**
   - Verificar que cada comando funciona correctamente dentro del plugin.

### Fase 7: Documentación y Pruebas Finales

1. **Actualizar documentación**
   - Documentar todas las nuevas herramientas añadidas.
   - Incluir ejemplos de uso para cada una.

2. **Pruebas integradas**
   - Realizar pruebas completas del flujo de comunicación Claude -> MCP -> Figma.
   - Verificar que todos los comandos funcionan como se espera.

## Priorización de Implementación

Priorizaremos las implementaciones en el siguiente orden, basándonos en la simplicidad y el valor añadido:

1. **Alta Prioridad - Implementación Simple**
   - set_opacity
   - set_rotation
   - set_clips_content
   - set_stroke_align
   - set_blend_mode

2. **Media Prioridad - Complejidad Moderada**
   - set_dash_pattern
   - set_stroke_weights
   - set_stroke_properties
   - set_layout_sizing
   - set_constraints

3. **Baja Prioridad - Mayor Complejidad**
   - set_layout_positioning
   - set_size_constraints
   - get_component_properties
   - edit_component_property
   - set_component_property_definitions

## Estimación de Tiempo

Estimamos los siguientes tiempos para cada fase:

1. **Fase 1: Preparación y Planificación** - 1 día
2. **Fase 2: Implementación de Propiedades Visuales Básicas** - 2 días
3. **Fase 3: Implementación de Control de Bordes Avanzado** - 2 días
4. **Fase 4: Implementación de Propiedades de Tamaño Adaptativo** - 3 días
5. **Fase 5: Implementación de Capacidades de Componentes Avanzadas** - 4 días
6. **Fase 6: Modificación del Plugin de Figma** - 2 días
7. **Fase 7: Documentación y Pruebas Finales** - 2 días

**Tiempo Total Estimado**: 16 días laborables

## Desafíos Potenciales

1. **Compatibilidad con la API de Figma**: Algunas propiedades avanzadas podrían tener limitaciones en la API de Figma.
2. **Manejo de Errores**: Las propiedades más complejas requerirán un manejo de errores más robusto.
3. **Rendimiento**: Las operaciones en componentes complejos podrían ser más lentas y requerir mecanismos de progreso.

## Próximos Pasos Inmediatos

1. Actualizar el archivo `types/index.ts` para incluir los nuevos comandos.
2. Crear los nuevos archivos para cada categoría de herramientas con la estructura básica.
3. Implementar y probar las primeras herramientas de alta prioridad.
4. Actualizar `tools/index.ts` y `server.ts` para incorporar las nuevas herramientas.