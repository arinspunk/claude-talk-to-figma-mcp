# Guía Completa de Nuevas Herramientas

Esta guía documenta las 35 nuevas herramientas agregadas al MCP de Figma, organizadas por categoría con ejemplos prácticos.

## 🎨 Visual Effects & Appearance

### set_opacity
Controla la transparencia de cualquier elemento.

**Ejemplos de prompts:**
```
"Cambia la opacidad del rectángulo a 50%"
"Haz el logo semi-transparente con opacidad 0.7"
"Aplica opacidad 0.3 al overlay de fondo"
```

**Parámetros:**
- `nodeId`: ID del nodo
- `opacity`: Valor 0-1 (0 = transparente, 1 = opaco)

### set_blend_mode
Aplica modos de fusión para efectos visuales avanzados.

**Ejemplos de prompts:**
```
"Aplica modo multiply al overlay oscuro"
"Cambia el blend mode a screen para el highlight"
"Usa overlay blend mode en la capa de color"
```

**Modos disponibles:**
- NORMAL, DARKEN, MULTIPLY, COLOR_BURN
- LIGHTEN, SCREEN, COLOR_DODGE
- OVERLAY, SOFT_LIGHT, HARD_LIGHT
- DIFFERENCE, EXCLUSION
- HUE, SATURATION, COLOR, LUMINOSITY
- LINEAR_BURN, LINEAR_DODGE, PASS_THROUGH

### set_gradient_fill
Ya documentado en `gradient-examples.md`

### set_image_fill
Aplica imágenes desde URLs a elementos.

**Ejemplos de prompts:**
```
"Rellena el rectángulo con la imagen de https://example.com/photo.jpg"
"Aplica una imagen de fondo con modo fit"
"Usa esta imagen como textura en modo tile"
```

**Parámetros:**
- `nodeId`: ID del nodo
- `imageUrl`: URL de la imagen
- `scaleMode`: FILL (default), FIT, CROP, TILE

### get_image_fills
Inspecciona las imágenes aplicadas a un elemento.

**Ejemplo de prompt:**
```
"¿Qué imágenes tiene aplicadas este frame?"
"Muéstrame los image fills del elemento seleccionado"
```

---

## 🖌️ Advanced Stroke Properties

### set_stroke_align
Controla dónde se dibuja el borde (dentro, centro o fuera).

**Ejemplos de prompts:**
```
"Mueve el borde hacia adentro del rectángulo"
"Centra el stroke en el borde"
"Aplica el stroke por fuera del elemento"
```

**Opciones:**
- CENTER: En el centro del borde
- INSIDE: Dentro del elemento
- OUTSIDE: Fuera del elemento

### set_stroke_cap
Estiliza los extremos de líneas.

**Ejemplos de prompts:**
```
"Agrega puntas redondeadas a la línea"
"Pon extremos cuadrados en el stroke"
"Añade flechas al final de la línea"
```

**Opciones:**
- NONE, ROUND, SQUARE
- ARROW_LINES, ARROW_EQUILATERAL

### set_stroke_join
Estiliza las esquinas donde se unen líneas.

**Ejemplos de prompts:**
```
"Redondea las esquinas del borde"
"Usa esquinas en bisel para el stroke"
"Aplica esquinas en miter al borde"
```

**Opciones:**
- MITER: Esquinas puntiagudas
- BEVEL: Esquinas biseladas
- ROUND: Esquinas redondeadas

### set_stroke_dashes
Crea patrones de líneas punteadas o discontinuas.

**Ejemplos de prompts:**
```
"Haz el borde punteado con patrón 5, 3"
"Crea una línea discontinua con dash de 10 y gap de 5"
"Aplica patrón de guiones largos: [15, 5]"
```

**Parámetro:**
- `dashPattern`: Array [dash, gap] ej: [5, 3] = 5px línea, 3px espacio

---

## 🔄 Transform & Flip

### rotate_node
Rota elementos en cualquier ángulo.

**Ejemplos de prompts:**
```
"Rota el icono 45 grados"
"Gira el texto 90 grados"
"Aplica rotación de 180 grados al elemento"
```

**Parámetro:**
- `angle`: 0-360 grados

### flip_horizontal
Voltea elementos horizontalmente (espejo izquierda-derecha).

**Ejemplos de prompts:**
```
"Voltea el logo horizontalmente"
"Espeja la flecha para que apunte a la izquierda"
"Flip horizontal del ícono"
```

### flip_vertical
Voltea elementos verticalmente (espejo arriba-abajo).

**Ejemplos de prompts:**
```
"Voltea la imagen verticalmente"
"Espeja el elemento de arriba a abajo"
"Flip vertical del símbolo"
```

---

## 📐 Responsive Design

### set_constraints
Define cómo se redimensionan los elementos respecto a su contenedor.

**Ejemplos de prompts:**
```
"Fija el botón a la esquina inferior derecha"
"Centra el logo horizontalmente"
"Haz que el panel se estire verticalmente"
"Escala proporcionalmente el elemento"
```

**Opciones:**
- MIN: Fijado al inicio (left/top)
- MAX: Fijado al final (right/bottom)
- CENTER: Centrado
- STRETCH: Se estira con el contenedor
- SCALE: Escala proporcionalmente

### set_layout_sizing
Controla cómo elementos dentro de auto-layout ajustan su tamaño.

**Ejemplos de prompts:**
```
"Haz que el texto se ajuste a su contenido (hug)"
"El botón debe llenar el espacio horizontal"
"Fija el tamaño del icono en 24px"
```

**Opciones:**
- FIXED: Tamaño fijo
- HUG: Se ajusta al contenido
- FILL: Llena el espacio disponible

---

## 👁️ Visibility & Protection

### set_visible
Muestra u oculta elementos.

**Ejemplos de prompts:**
```
"Oculta la capa de anotaciones"
"Muestra todos los elementos del grupo"
"Esconde el layer de guidelines"
```

**Parámetro:**
- `visible`: true o false

### set_locked
Bloquea elementos para prevenir edición accidental.

**Ejemplos de prompts:**
```
"Bloquea el background para no moverlo"
"Desbloquea el frame principal"
"Protege todos los elementos del header"
```

**Parámetro:**
- `locked`: true o false

---

## 📚 Layer Organization

### bring_to_front
Mueve un elemento al frente de todos sus hermanos.

**Ejemplo de prompt:**
```
"Trae el botón al frente"
"Pon el overlay encima de todo"
```

### send_to_back
Mueve un elemento detrás de todos sus hermanos.

**Ejemplo de prompt:**
```
"Envía el fondo atrás de todo"
"Pon la imagen de fondo al final"
```

### bring_forward / send_backward
Mueve elementos un nivel arriba/abajo en el orden.

**Ejemplos de prompts:**
```
"Sube el card un nivel"
"Baja el elemento una capa"
```

### reorder_children
Reordena específicamente los hijos de un contenedor.

**Ejemplo de prompt:**
```
"Reordena los items del menu: [id1, id2, id3, id4]"
"Cambia el orden de los elementos a esta secuencia"
```

---

## 🔷 Boolean & Masking

### boolean_operation
Combina formas usando operaciones booleanas.

**Ejemplos de prompts:**
```
"Une estos dos círculos (union)"
"Resta el círculo del rectángulo (subtract)"
"Intersecta las dos formas (intersect)"
"Excluye las áreas de overlap (exclude)"
```

**Operaciones:**
- UNION: Une formas
- SUBTRACT: Resta forma superior de la inferior
- INTERSECT: Solo mantiene el área de superposición
- EXCLUDE: Mantiene todo excepto la superposición

### create_mask
Crea una máscara de recorte desde múltiples nodos.

**Ejemplo de prompt:**
```
"Crea una máscara usando el círculo y la imagen"
"Usa la primera forma como máscara para los demás elementos"
```

**Nota:** El primer nodo en el array se convierte en la máscara.

### apply_mask
Aplica una máscara existente a un elemento.

**Ejemplo de prompt:**
```
"Aplica esta forma como máscara a la foto"
"Usa este path para recortar la imagen"
```

---

## 📝 Text Alignment

### set_text_align
Alineación horizontal del texto.

**Ejemplos de prompts:**
```
"Centra el texto horizontalmente"
"Alinea el párrafo a la izquierda"
"Justifica el texto del artículo"
```

**Opciones:**
- LEFT, CENTER, RIGHT, JUSTIFIED

### set_text_vertical_align
Alineación vertical del texto en su caja.

**Ejemplos de prompts:**
```
"Alinea el texto al top de la caja"
"Centra verticalmente el label"
"Pon el texto abajo del botón"
```

**Opciones:**
- TOP, CENTER, BOTTOM

### set_text_auto_resize
Controla cómo la caja de texto se ajusta a su contenido.

**Ejemplos de prompts:**
```
"Que el texto se expanda en ancho y alto automáticamente"
"Solo ajusta la altura del texto"
"Fija el tamaño de la caja de texto"
```

**Opciones:**
- WIDTH_AND_HEIGHT: Se ajusta en ambas direcciones
- HEIGHT: Solo ajusta altura
- NONE: Tamaño fijo

---

## 📏 Layout Grids

### add_layout_grid
Agrega guías de columnas, filas o cuadrícula.

**Ejemplos de prompts:**
```
"Agrega un grid de 12 columnas con 20px de gutter"
"Crea filas con 8px de espaciado"
"Añade una cuadrícula de 10x10"
```

**Parámetros:**
- `gridType`: COLUMNS, ROWS, GRID
- `count`: Número de columnas/filas
- `gutterSize`: Espaciado entre columnas/filas
- `offset`: Margen desde los bordes
- `color`: Color de las guías

### remove_layout_grid
Elimina grids de layout.

**Ejemplos de prompts:**
```
"Quita todas las guías del frame"
"Elimina el primer layout grid"
"Borra la cuadrícula del artboard"
```

---

## 🔍 Search & Discovery

### find_nodes_by_name
Busca elementos por nombre.

**Ejemplos de prompts:**
```
"Encuentra todos los elementos que contengan 'button' en el nombre"
"Busca exactamente 'Header Logo'"
"Localiza todos los frames con 'mobile' (case sensitive)"
```

**Parámetros:**
- `name`: Texto a buscar
- `caseSensitive`: Búsqueda sensible a mayúsculas (default: false)
- `exactMatch`: Solo coincidencias exactas (default: false)

### find_nodes_by_type
Busca todos los elementos de un tipo específico.

**Ejemplos de prompts:**
```
"Encuentra todos los rectángulos en la página"
"Busca todos los textos"
"Localiza todos los componentes"
```

**Tipos disponibles:**
- FRAME, GROUP, RECTANGLE, ELLIPSE, POLYGON
- STAR, LINE, TEXT, VECTOR
- COMPONENT, COMPONENT_SET, INSTANCE
- BOOLEAN_OPERATION

---

## 🎨 Style Management

### create_color_style
Crea un estilo de color reutilizable.

**Ejemplo de prompt:**
```
"Crea un color style llamado 'Primary Blue' con RGB(0, 120, 255)"
"Guarda este color como 'Brand Red'"
```

### get_color_styles
Lista todos los estilos de color del documento.

**Ejemplo de prompt:**
```
"Muéstrame todos los color styles"
"Lista los estilos de color disponibles"
```

### apply_color_style
Aplica un estilo de color existente a un elemento.

**Ejemplo de prompt:**
```
"Aplica el estilo 'Primary Blue' a este botón"
"Usa el color style 'Brand Red' en el background"
```

---

## 🎯 Batch Operations

### align_nodes
Alinea múltiples elementos entre sí.

**Ejemplos de prompts:**
```
"Alinea estos 5 botones a la izquierda"
"Centra horizontalmente todos los cards"
"Alinea al top estos elementos"
```

**Opciones:**
- LEFT, RIGHT, TOP, BOTTOM
- CENTER_HORIZONTAL, CENTER_VERTICAL

### distribute_nodes
Distribuye espaciado uniformemente entre elementos.

**Ejemplos de prompts:**
```
"Distribuye estos iconos horizontalmente con espaciado uniforme"
"Espacía verticalmente estos 6 elementos"
```

**Requisito:** Mínimo 3 elementos

**Opciones:**
- HORIZONTAL: Distribuye horizontalmente
- VERTICAL: Distribuye verticalmente

---

## 💡 Casos de Uso Comunes

### Diseño Responsive
```
"Crea un header que:
1. Se fije arriba (constraints top)
2. Se estire horizontalmente (constraints stretch)
3. Tenga botones con hug contents
4. Grid de 12 columnas con 20px gutter"
```

### Organización de Layers
```
"Para estos 10 elementos:
1. Oculta los de referencia
2. Bloquea el background
3. Trae los botones al frente
4. Distribuye los cards horizontalmente"
```

### Estilización Avanzada
```
"Aplica al overlay:
1. Opacidad 0.7
2. Blend mode multiply
3. Gradiente negro a transparente
4. Envía atrás de todo"
```

### Efectos Visuales
```
"Para el hero section:
1. Imagen de fondo con modo fill
2. Overlay con gradiente y opacidad 0.8
3. Título con text stroke de 2px
4. Botón con sombra suave"
```

### Iconos y Símbolos
```
"Crea un set de iconos:
1. Rota 45 grados
2. Aplica corner radius 4px
3. Alinea todos a la izquierda
4. Distribuye con 16px de espaciado"
```

---

## 🎓 Tips y Mejores Prácticas

### 1. Constraints para Responsive
Combina constraints con auto-layout para interfaces totalmente responsive:
- Headers: TOP + STRETCH horizontal
- Sidebars: LEFT + STRETCH vertical
- Floating buttons: BOTTOM + RIGHT
- Overlays: CENTER + CENTER

### 2. Blend Modes para Profundidad
- MULTIPLY: Sombras y overlays oscuros
- SCREEN: Highlights y efectos de luz
- OVERLAY: Combinar texturas
- COLOR: Cambiar tono manteniendo luminosidad

### 3. Organización con Visibilidad
- Oculta layers de referencia/anotaciones
- Bloquea backgrounds y guías
- Mantén versiones alternativas ocultas

### 4. Boolean Operations para Formas Complejas
- Iconos: SUBTRACT para crear "agujeros"
- Logos: UNION para combinar formas
- Efectos: INTERSECT para overlaps creativos

### 5. Batch Operations para Eficiencia
- Alinea primero, luego distribuye
- Usa find_nodes para seleccionar grupos similares
- Aplica estilos en batch con loops

---

## 🚀 Workflows Completos

### Crear un Design System Base
```
1. Crea color styles para paleta de marca
2. Define text styles para jerarquía tipográfica
3. Crea componentes base con auto-layout
4. Configura constraints responsive
5. Añade layout grids estándar
```

### Optimizar Layout Existente
```
1. Encuentra todos los frames principales
2. Añade layout grids
3. Configura constraints responsive
4. Alinea y distribuye elementos
5. Oculta layers innecesarios
```

### Efectos Visuales Profesionales
```
1. Aplica imágenes de fondo
2. Crea overlays con gradientes
3. Ajusta opacidades y blend modes
4. Añade sombras y efectos
5. Ordena layers correctamente
```

---

## 📚 Recursos Adicionales

- **Figma Plugin API**: https://www.figma.com/plugin-docs/
- **Blend Modes Guide**: https://help.figma.com/hc/en-us/articles/360041488473
- **Constraints & Resizing**: https://help.figma.com/hc/en-us/articles/360039957734
- **Auto Layout**: https://help.figma.com/hc/en-us/articles/360040451373

---

## 🤝 Contribuir

¿Encontraste un bug o tienes una sugerencia? Abre un issue en:
https://github.com/arinspunk/claude-talk-to-figma-mcp/issues
