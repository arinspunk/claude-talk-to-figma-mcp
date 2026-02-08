# Ejemplos de Uso: Herramienta de Degradados

La herramienta `set_gradient_fill` permite crear degradados de colores en elementos de Figma con soporte para diferentes tipos de gradientes.

## Tipos de Degradados Soportados

- **LINEAR**: Degradado lineal (el más común)
- **RADIAL**: Degradado radial (desde el centro hacia afuera)
- **ANGULAR**: Degradado angular (en forma de cono)
- **DIAMOND**: Degradado en forma de diamante

## Parámetros

| Parámetro | Tipo | Descripción | Requerido |
|-----------|------|-------------|-----------|
| `nodeId` | string | ID del elemento a modificar | Sí |
| `gradientType` | enum | Tipo de degradado (LINEAR, RADIAL, ANGULAR, DIAMOND) | Sí |
| `stops` | array | Array de puntos de color (mínimo 2) | Sí |
| `angle` | number | Ángulo de rotación para degradados lineales (0-360°) | No (default: 0) |
| `opacity` | number | Opacidad general del degradado (0-1) | No (default: 1) |

### Estructura de Color Stop

Cada elemento en el array `stops` debe tener:
- `position`: Posición del color (0-1, donde 0 es el inicio y 1 es el final)
- `color`: Objeto con componentes RGBA
  - `r`: Componente rojo (0-1)
  - `g`: Componente verde (0-1)
  - `b`: Componente azul (0-1)
  - `a`: Componente alpha/transparencia (0-1)

## Ejemplos de Prompts para Claude

### Ejemplo 1: Degradado Linear Simple (Azul a Verde)
```
Aplica un degradado lineal de azul a verde en el rectángulo con ID "123:456"
```

Claude ejecutará:
```javascript
set_gradient_fill({
  nodeId: "123:456",
  gradientType: "LINEAR",
  stops: [
    {
      position: 0,
      color: { r: 0, g: 0, b: 1, a: 1 } // Azul
    },
    {
      position: 1,
      color: { r: 0, g: 1, b: 0, a: 1 } // Verde
    }
  ]
})
```

### Ejemplo 2: Degradado Linear con Ángulo
```
Crea un degradado de rojo a amarillo con rotación de 45 grados en el nodo "789:012"
```

Claude ejecutará:
```javascript
set_gradient_fill({
  nodeId: "789:012",
  gradientType: "LINEAR",
  stops: [
    {
      position: 0,
      color: { r: 1, g: 0, b: 0, a: 1 } // Rojo
    },
    {
      position: 1,
      color: { r: 1, g: 1, b: 0, a: 1 } // Amarillo
    }
  ],
  angle: 45
})
```

### Ejemplo 3: Degradado Radial (Efecto de Luz)
```
Aplica un degradado radial de blanco en el centro a negro en los bordes del círculo seleccionado
```

Claude ejecutará:
```javascript
set_gradient_fill({
  nodeId: "{id-del-nodo}",
  gradientType: "RADIAL",
  stops: [
    {
      position: 0,
      color: { r: 1, g: 1, b: 1, a: 1 } // Blanco
    },
    {
      position: 1,
      color: { r: 0, g: 0, b: 0, a: 1 } // Negro
    }
  ]
})
```

### Ejemplo 4: Degradado con Múltiples Colores
```
Crea un degradado tipo arcoíris (rojo, naranja, amarillo, verde, azul, violeta) en el frame principal
```

Claude ejecutará:
```javascript
set_gradient_fill({
  nodeId: "{id-del-frame}",
  gradientType: "LINEAR",
  stops: [
    { position: 0.0, color: { r: 1, g: 0, b: 0, a: 1 } },     // Rojo
    { position: 0.2, color: { r: 1, g: 0.5, b: 0, a: 1 } },   // Naranja
    { position: 0.4, color: { r: 1, g: 1, b: 0, a: 1 } },     // Amarillo
    { position: 0.6, color: { r: 0, g: 1, b: 0, a: 1 } },     // Verde
    { position: 0.8, color: { r: 0, g: 0, b: 1, a: 1 } },     // Azul
    { position: 1.0, color: { r: 0.5, g: 0, b: 0.5, a: 1 } }  // Violeta
  ]
})
```

### Ejemplo 5: Degradado con Transparencia
```
Aplica un degradado de azul sólido a transparente para crear un efecto de desvanecimiento
```

Claude ejecutará:
```javascript
set_gradient_fill({
  nodeId: "{id-del-nodo}",
  gradientType: "LINEAR",
  stops: [
    {
      position: 0,
      color: { r: 0, g: 0.5, b: 1, a: 1 } // Azul sólido
    },
    {
      position: 1,
      color: { r: 0, g: 0.5, b: 1, a: 0 } // Azul transparente
    }
  ],
  angle: 90 // De arriba hacia abajo
})
```

### Ejemplo 6: Degradado Angular (Efecto Cónico)
```
Crea un degradado angular de color que gire alrededor del centro
```

Claude ejecutará:
```javascript
set_gradient_fill({
  nodeId: "{id-del-nodo}",
  gradientType: "ANGULAR",
  stops: [
    {
      position: 0,
      color: { r: 1, g: 0, b: 0, a: 1 } // Rojo
    },
    {
      position: 0.5,
      color: { r: 0, g: 1, b: 0, a: 1 } // Verde
    },
    {
      position: 1,
      color: { r: 1, g: 0, b: 0, a: 1 } // Vuelve a rojo
    }
  ]
})
```

### Ejemplo 7: Degradado Estilo Sunset
```
Aplica un degradado estilo atardecer (naranja oscuro, naranja, rosa, morado) en el fondo
```

Claude ejecutará:
```javascript
set_gradient_fill({
  nodeId: "{id-del-fondo}",
  gradientType: "LINEAR",
  stops: [
    { position: 0, color: { r: 1, g: 0.4, b: 0, a: 1 } },      // Naranja oscuro
    { position: 0.33, color: { r: 1, g: 0.6, b: 0.2, a: 1 } }, // Naranja
    { position: 0.66, color: { r: 1, g: 0.4, b: 0.6, a: 1 } }, // Rosa
    { position: 1, color: { r: 0.5, g: 0.2, b: 0.8, a: 1 } }   // Morado
  ],
  angle: 180 // De arriba hacia abajo
})
```

## Consejos de Uso

1. **Colores en formato 0-1**: Recuerda que Figma usa valores de color de 0 a 1, no de 0 a 255. Para convertir, divide por 255.
   - RGB(255, 128, 0) → { r: 1, g: 0.5, b: 0 }

2. **Ángulos de Degradado Linear**:
   - 0° = De izquierda a derecha
   - 90° = De arriba hacia abajo
   - 180° = De derecha a izquierda
   - 270° = De abajo hacia arriba

3. **Posicionamiento de Stops**:
   - Los stops deben estar ordenados de 0 a 1
   - Mínimo 2 stops, sin límite máximo
   - Stops más cercanos = transiciones más abruptas
   - Stops más separados = transiciones más suaves

4. **Degradados Radiales y Angulares**:
   - Estos tipos de degradado se centran automáticamente en el elemento
   - El parámetro `angle` no afecta estos tipos

## Casos de Uso Comunes

- **Fondos de Hero Section**: Degradados lineales verticales con colores de marca
- **Botones con Efecto de Profundidad**: Degradados lineales sutiles verticales
- **Iconos con Efecto de Luz**: Degradados radiales de claro a oscuro
- **Elementos Decorativos**: Degradados angulares para efectos modernos
- **Overlays de Imagen**: Degradados con transparencia para mejorar legibilidad de texto
- **Fondos Animados**: Degradados con múltiples colores vibrantes

## Flujo de Trabajo Típico con Claude

1. **Selecciona un elemento** en Figma o proporciona su ID
2. **Describe el degradado** que deseas en lenguaje natural
3. **Claude aplicará** el degradado automáticamente usando la herramienta
4. **Ajusta si es necesario** pidiendo cambios en ángulo, colores o tipo

Ejemplo de conversación:
```
Usuario: "Quiero un fondo con degradado de color para mi landing page"
Claude: "Claro, voy a aplicar un degradado moderno. ¿Qué colores prefieres?"
Usuario: "Azul oscuro a morado"
Claude: [aplica el degradado]
Usuario: "Perfecto, pero róotalo 45 grados"
Claude: [ajusta el ángulo]
```
