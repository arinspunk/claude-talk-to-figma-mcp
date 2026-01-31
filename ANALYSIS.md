# Análisis del Proyecto: Claude Talk to Figma MCP

## 🛠 Stack Técnico

Una visión general de las tecnologías y herramientas utilizadas en este proyecto:

*   **Lenguaje Principal**: TypeScript (Todo el código fuente del servidor y herramientas).
*   **Runtime & Package Manager**:
    *   **Bun**: Utilizado para desarrollo local, scripts, instalación de dependencias y ejecución del servidor WebSocket.
    *   **Node.js**: Entorno de ejecución para el servidor MCP (especialmente en distribución DXT) y scripts de compatibilidad.
*   **Framework MCP**: `@modelcontextprotocol/sdk` (SDK oficial).
*   **Comunicación en Tiempo Real**:
    *   `ws`: Biblioteca WebSocket para la comunicación bidireccional.
    *   `Bun.serve`: Servidor HTTP/WS de alto rendimiento proporcionado por Bun.
*   **Validación**: `zod` (Para validación de esquemas y argumentos de herramientas).
*   **Build System**: `tsup` (Empaquetado de TypeScript a JS).
*   **Testing**: `jest` (Unit testing) y scripts personalizados para integración.
*   **Distribución**: `dxt` (Herramienta de empaquetado de extensiones de Anthropic).
*   **Figma Plugin**: JavaScript (ES6+), HTML (Interfaz UI del plugin).

---

## 🔍 Análisis en Profundidad

Este proyecto implementa un puente de comunicación complejo que permite a modelos de IA (como Claude) controlar directamente la interfaz de diseño de Figma. A diferencia de integraciones simples vía API REST, este proyecto utiliza una arquitectura de *relay* en tiempo real para operar dentro del contexto de ejecución de Figma.

### 🏗 Arquitectura del Sistema

La solución se divide en tres componentes desacoplados que trabajan en conjunto:

1.  **Servidor MCP (`src/talk_to_figma_mcp`)**:
    *   Actúa como la "cara" ante el asistente de IA (Claude).
    *   Define las herramientas ("tools") disponibles (`create_rectangle`, `get_document_info`, etc.).
    *   Recibe las instrucciones de la IA en lenguaje natural (convertidas a llamadas de función).
    *   No ejecuta los cambios en Figma directamente; los reenvía al Servidor WebSocket.

2.  **Servidor WebSocket (Relay) (`src/socket.ts`)**:
    *   Funciona como intermediario (hub) de mensajes.
    *   Escucha en el puerto `3055`.
    *   Mantiene los "canales" de comunicación. El plugin de Figma se une a un canal y el servidor MCP envía comandos a ese canal específico.
    *   Permite que la comunicación traspase la barrera del "sandbox" del navegador o la aplicación de escritorio de Figma.

3.  **Plugin de Figma (`src/claude_mcp_plugin`)**:
    *   **`manifest.json`**: Define el plugin dentro del ecosistema Figma.
    *   **`ui.html`**: Contiene la lógica del cliente WebSocket. Figma no permite WebSockets directamente en el hilo principal (`code.js`), por lo que utiliza un iframe invisible (`ui.html`) para mantener la conexión.
    *   **`code.js`**: El hilo principal del plugin que tiene acceso a la API de diseño de Figma (`figma.createRectangle`, etc.). Recibe mensajes del `ui.html` y ejecuta las acciones.

### 🔄 Flujo de Datos

1.  **Usuario** pide a Claude: "Dibuja un botón azul".
2.  **Claude** llama a la herramienta: `create_rectangle({ name: "Button", fills: [...] })`.
3.  **MCP Server** valida la petición y la envía vía WebSocket al canal activo.
4.  **Socket Server** recibe el mensaje y lo transmite al cliente conectado (Plugin Figma).
5.  **Figma Plugin (UI)** recibe el evento por socket y lo pasa al hilo `code.js`.
6.  **Figma Plugin (Logic)** ejecuta `figma.createRectangle()` modificando el documento real.
7.  **Respuesta**: El éxito o error viaja de vuelta por la misma cadena hasta Claude.

### 💡 Puntos Destacados

*   **Soporte DXT & Distribución**: El proyecto ha evolucionado para incluir soporte nativo para el formato `.dxt` de Anthropic, facilitando la instalación en Claude Desktop casi como una extensión nativa ("one-click install").
*   **Estrategia "Bypass" de Sandbox**: El uso inteligente de un servidor WebSocket local elude las restricciones habituales de las APIs web estáticas, permitiendo control en tiempo real sobre una aplicación de escritorio.
*   **Manejo de Errores y Logs**: Se observa un sistema de logging robusto (visible en `socket.ts`) para depurar la conexión, crucial dada la complejidad de los 3 saltos de red.
*   **Testing**: Existe una infraestructura de tests unitarios con Jest y un enfoque hacia tests de integración (`scripts/test-integration.js`) para validar la cadena completa.

### ⚠️ Consideraciones de Mantenimiento

*   La sincronización entre las definiciones de herramientas en el lado MCP y la implementación en el lado del Plugin de Figma es crítica. Un cambio en la API de uno requiere actualizar el otro.
*   La dependencia de un puerto local (`3055`) puede generar conflictos si el usuario tiene otros servicios corriendo, aunque es estándar para este tipo de bridges.
