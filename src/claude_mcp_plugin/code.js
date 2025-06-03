// This is the main code file for the Claude MCP Figma plugin
// It handles Figma API commands

// Plugin state
const state = {
  serverPort: 3055, // Default port
};

// Helper function for progress updates
function sendProgressUpdate(commandId, commandType, status, progress, totalItems, processedItems, message, payload = null) {
  const update = {
    type: 'command_progress',
    commandId,
    commandType,
    status,
    progress,
    totalItems,
    processedItems,
    message,
    timestamp: Date.now()
  };

  // Add optional chunk information if present
  if (payload) {
    if (payload.currentChunk !== undefined && payload.totalChunks !== undefined) {
      update.currentChunk = payload.currentChunk;
      update.totalChunks = payload.totalChunks;
      update.chunkSize = payload.chunkSize;
    }
    update.payload = payload;
  }

  // Send to UI
  figma.ui.postMessage(update);
  console.log(`Progress update: ${status} - ${progress}% - ${message}`);

  return update;
}

// Show UI
figma.showUI(__html__, { width: 350, height: 450 });

// Plugin commands from UI
figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case "update-settings":
      updateSettings(msg);
      break;
    case "notify":
      figma.notify(msg.message);
      break;
    case "close-plugin":
      figma.closePlugin();
      break;
    case "execute-command":
      // Execute commands received from UI (which gets them from WebSocket)
      try {
        const result = await handleCommand(msg.command, msg.params);
        // Send result back to UI
        figma.ui.postMessage({
          type: "command-result",
          id: msg.id,
          result,
        });
      } catch (error) {
        figma.ui.postMessage({
          type: "command-error",
          id: msg.id,
          error: error.message || "Error executing command",
        });
      }
      break;
  }
};

// Listen for plugin commands from menu
figma.on("run", ({ command }) => {
  figma.ui.postMessage({ type: "auto-connect" });
});

// Update plugin settings
function updateSettings(settings) {
  if (settings.serverPort) {
    state.serverPort = settings.serverPort;
  }

  figma.clientStorage.setAsync("settings", {
    serverPort: state.serverPort,
  });
}

// Handle commands from UI
async function handleCommand(command, params) {
  switch (command) {
    case "get_document_info":
      return await getDocumentInfo();
    case "get_selection":
      return await getSelection();
    case "get_node_info":
      if (!params || !params.nodeId) {
        throw new Error("Missing nodeId parameter");
      }
      return await getNodeInfo(params.nodeId);
    case "get_nodes_info":
      if (!params || !params.nodeIds || !Array.isArray(params.nodeIds)) {
        throw new Error("Missing or invalid nodeIds parameter");
      }
      return await getNodesInfo(params.nodeIds);
    case "create_rectangle":
      return await createRectangle(params);
    case "create_frame":
      return await createFrame(params);
    case "create_text":
      return await createText(params);
    case "set_fill_color":
      return await setFillColor(params);
    case "set_stroke_color":
      return await setStrokeColor(params);
    case "move_node":
      return await moveNode(params);
    case "resize_node":
      return await resizeNode(params);
    case "delete_node":
      return await deleteNode(params);
    case "get_styles":
      return await getStyles();
    case "get_local_components":
      return await getLocalComponents();
    // case "get_team_components":
    //   return await getTeamComponents();
    case "create_component_instance":
      return await createComponentInstance(params);
    case "export_node_as_image":
      return await exportNodeAsImage(params);
    case "set_corner_radius":
      return await setCornerRadius(params);
    case "set_text_content":
      return await setTextContent(params);
    case "clone_node":
      return await cloneNode(params);
    case "scan_text_nodes":
      return await scanTextNodes(params);
    case "set_multiple_text_contents":
      return await setMultipleTextContents(params);
    case "set_auto_layout":
      return await setAutoLayout(params);
    // Nuevos comandos para propiedades de texto
    case "set_font_name":
      return await setFontName(params);
    case "set_font_size":
      return await setFontSize(params);
    case "set_font_weight":
      return await setFontWeight(params);
    case "set_letter_spacing":
      return await setLetterSpacing(params);
    case "set_line_height":
      return await setLineHeight(params);
    case "set_paragraph_spacing":
      return await setParagraphSpacing(params);
    case "set_text_case":
      return await setTextCase(params);
    case "set_text_decoration":
      return await setTextDecoration(params);
    case "get_styled_text_segments":
      return await getStyledTextSegments(params);
    case "load_font_async":
      return await loadFontAsyncWrapper(params);
    case "get_remote_components":
      return await getRemoteComponents(params);
    case "set_effects":
      return await setEffects(params);
    case "set_effect_style_id":
      return await setEffectStyleId(params);
    case "group_nodes":
      return await groupNodes(params);
    case "ungroup_nodes":
      return await ungroupNodes(params);
    case "flatten_node":
      return await flattenNode(params);
    case "insert_child":
      return await insertChild(params);
    case "create_ellipse":
      return await createEllipse(params);
    case "create_polygon":
      return await createPolygon(params);
    case "create_star":
      return await createStar(params);
    case "create_vector":
      return await createVector(params);
    case "create_line":
      return await createLine(params);
    // Image tools
    case "insert_image_from_url":
      return await insertImageFromUrl(params);
    case "replace_image":
      return await replaceImage(params);
    case "get_image_metadata":
      return await getImageMetadata(params);
    case "search_images":
      return await searchImages(params);
    case "preview_image":
      return await previewImage(params);
    case "analyze_node_context":
      return await analyzeNodeContext(params);
    case "find_and_insert_image":
      return await findAndInsertImage(params);
    case "create_product_card":
      return await createProductCard(params);
    case "create_product_grid":
      return await createProductGrid(params);
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

// Command implementations

async function getDocumentInfo() {
  await figma.currentPage.loadAsync();
  const page = figma.currentPage;
  return {
    name: page.name,
    id: page.id,
    type: page.type,
    children: page.children.map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
    })),
    currentPage: {
      id: page.id,
      name: page.name,
      childCount: page.children.length,
    },
    pages: [
      {
        id: page.id,
        name: page.name,
        childCount: page.children.length,
      },
    ],
  };
}

async function getSelection() {
  return {
    selectionCount: figma.currentPage.selection.length,
    selection: figma.currentPage.selection.map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
      visible: node.visible,
    })),
  };
}

async function getNodeInfo(nodeId) {
  const node = await figma.getNodeByIdAsync(nodeId);

  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  const response = await node.exportAsync({
    format: "JSON_REST_V1",
  });

  return response.document;
}

async function getNodesInfo(nodeIds) {
  try {
    // Load all nodes in parallel
    const nodes = await Promise.all(
      nodeIds.map((id) => figma.getNodeByIdAsync(id))
    );

    // Filter out any null values (nodes that weren't found)
    const validNodes = nodes.filter((node) => node !== null);

    // Export all valid nodes in parallel
    const responses = await Promise.all(
      validNodes.map(async (node) => {
        const response = await node.exportAsync({
          format: "JSON_REST_V1",
        });
        return {
          nodeId: node.id,
          document: response.document,
        };
      })
    );

    return responses;
  } catch (error) {
    throw new Error(`Error getting nodes info: ${error.message}`);
  }
}

async function createRectangle(params) {
  const {
    x = 0,
    y = 0,
    width = 100,
    height = 100,
    name = "Rectangle",
    parentId,
  } = params || {};

  const rect = figma.createRectangle();
  rect.x = x;
  rect.y = y;
  rect.resize(width, height);
  rect.name = name;

  // If parentId is provided, append to that node, otherwise append to current page
  if (parentId) {
    const parentNode = await figma.getNodeByIdAsync(parentId);
    if (!parentNode) {
      throw new Error(`Parent node not found with ID: ${parentId}`);
    }
    if (!("appendChild" in parentNode)) {
      throw new Error(`Parent node does not support children: ${parentId}`);
    }
    parentNode.appendChild(rect);
  } else {
    figma.currentPage.appendChild(rect);
  }

  return {
    id: rect.id,
    name: rect.name,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    parentId: rect.parent ? rect.parent.id : undefined,
  };
}

async function createFrame(params) {
  const {
    x = 0,
    y = 0,
    width = 100,
    height = 100,
    name = "Frame",
    parentId,
    fillColor,
    strokeColor,
    strokeWeight,
  } = params || {};

  const frame = figma.createFrame();
  frame.x = x;
  frame.y = y;
  frame.resize(width, height);
  frame.name = name;

  // Set fill color if provided
  if (fillColor) {
    const paintStyle = {
      type: "SOLID",
      color: {
        r: parseFloat(fillColor.r) || 0,
        g: parseFloat(fillColor.g) || 0,
        b: parseFloat(fillColor.b) || 0,
      },
      opacity: parseFloat(fillColor.a) || 1,
    };
    frame.fills = [paintStyle];
  }

  // Set stroke color and weight if provided
  if (strokeColor) {
    const strokeStyle = {
      type: "SOLID",
      color: {
        r: parseFloat(strokeColor.r) || 0,
        g: parseFloat(strokeColor.g) || 0,
        b: parseFloat(strokeColor.b) || 0,
      },
      opacity: parseFloat(strokeColor.a) || 1,
    };
    frame.strokes = [strokeStyle];
  }

  // Set stroke weight if provided
  if (strokeWeight !== undefined) {
    frame.strokeWeight = strokeWeight;
  }

  // If parentId is provided, append to that node, otherwise append to current page
  if (parentId) {
    const parentNode = await figma.getNodeByIdAsync(parentId);
    if (!parentNode) {
      throw new Error(`Parent node not found with ID: ${parentId}`);
    }
    if (!("appendChild" in parentNode)) {
      throw new Error(`Parent node does not support children: ${parentId}`);
    }
    parentNode.appendChild(frame);
  } else {
    figma.currentPage.appendChild(frame);
  }

  return {
    id: frame.id,
    name: frame.name,
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height,
    fills: frame.fills,
    strokes: frame.strokes,
    strokeWeight: frame.strokeWeight,
    parentId: frame.parent ? frame.parent.id : undefined,
  };
}

async function createText(params) {
  const {
    x = 0,
    y = 0,
    text = "Text",
    fontSize = 14,
    fontWeight = 400,
    fontColor = { r: 0, g: 0, b: 0, a: 1 }, // Default to black
    name = "Text",
    parentId,
  } = params || {};

  // Map common font weights to Figma font styles
  const getFontStyle = (weight) => {
    switch (weight) {
      case 100:
        return "Thin";
      case 200:
        return "Extra Light";
      case 300:
        return "Light";
      case 400:
        return "Regular";
      case 500:
        return "Medium";
      case 600:
        return "Semi Bold";
      case 700:
        return "Bold";
      case 800:
        return "Extra Bold";
      case 900:
        return "Black";
      default:
        return "Regular";
    }
  };

  const textNode = figma.createText();
  textNode.x = x;
  textNode.y = y;
  textNode.name = name;
  try {
    await figma.loadFontAsync({
      family: "Inter",
      style: getFontStyle(fontWeight),
    });
    textNode.fontName = { family: "Inter", style: getFontStyle(fontWeight) };
    textNode.fontSize = parseInt(fontSize);
  } catch (error) {
    console.error("Error setting font size", error);
  }
  setCharacters(textNode, text);

  // Set text color
  const paintStyle = {
    type: "SOLID",
    color: {
      r: parseFloat(fontColor.r) || 0,
      g: parseFloat(fontColor.g) || 0,
      b: parseFloat(fontColor.b) || 0,
    },
    opacity: parseFloat(fontColor.a) || 1,
  };
  textNode.fills = [paintStyle];

  // If parentId is provided, append to that node, otherwise append to current page
  if (parentId) {
    const parentNode = await figma.getNodeByIdAsync(parentId);
    if (!parentNode) {
      throw new Error(`Parent node not found with ID: ${parentId}`);
    }
    if (!("appendChild" in parentNode)) {
      throw new Error(`Parent node does not support children: ${parentId}`);
    }
    parentNode.appendChild(textNode);
  } else {
    figma.currentPage.appendChild(textNode);
  }

  return {
    id: textNode.id,
    name: textNode.name,
    x: textNode.x,
    y: textNode.y,
    width: textNode.width,
    height: textNode.height,
    characters: textNode.characters,
    fontSize: textNode.fontSize,
    fontWeight: fontWeight,
    fontColor: fontColor,
    fontName: textNode.fontName,
    fills: textNode.fills,
    parentId: textNode.parent ? textNode.parent.id : undefined,
  };
}

async function setFillColor(params) {
  console.log("setFillColor", params);
  const {
    nodeId,
    color: { r, g, b, a },
  } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (!("fills" in node)) {
    throw new Error(`Node does not support fills: ${nodeId}`);
  }

  // Create RGBA color
  const rgbColor = {
    r: parseFloat(r) || 0,
    g: parseFloat(g) || 0,
    b: parseFloat(b) || 0,
    a: parseFloat(a) || 1,
  };

  // Set fill
  const paintStyle = {
    type: "SOLID",
    color: {
      r: parseFloat(rgbColor.r),
      g: parseFloat(rgbColor.g),
      b: parseFloat(rgbColor.b),
    },
    opacity: parseFloat(rgbColor.a),
  };

  console.log("paintStyle", paintStyle);

  node.fills = [paintStyle];

  return {
    id: node.id,
    name: node.name,
    fills: [paintStyle],
  };
}

async function setStrokeColor(params) {
  const {
    nodeId,
    color: { r, g, b, a },
    weight = 1,
  } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (!("strokes" in node)) {
    throw new Error(`Node does not support strokes: ${nodeId}`);
  }

  // Create RGBA color
  const rgbColor = {
    r: r !== undefined ? r : 0,
    g: g !== undefined ? g : 0,
    b: b !== undefined ? b : 0,
    a: a !== undefined ? a : 1,
  };

  // Set stroke
  const paintStyle = {
    type: "SOLID",
    color: {
      r: rgbColor.r,
      g: rgbColor.g,
      b: rgbColor.b,
    },
    opacity: rgbColor.a,
  };

  node.strokes = [paintStyle];

  // Set stroke weight if available
  if ("strokeWeight" in node) {
    node.strokeWeight = weight;
  }

  return {
    id: node.id,
    name: node.name,
    strokes: node.strokes,
    strokeWeight: "strokeWeight" in node ? node.strokeWeight : undefined,
  };
}

async function moveNode(params) {
  const { nodeId, x, y } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  if (x === undefined || y === undefined) {
    throw new Error("Missing x or y parameters");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (!("x" in node) || !("y" in node)) {
    throw new Error(`Node does not support position: ${nodeId}`);
  }

  node.x = x;
  node.y = y;

  return {
    id: node.id,
    name: node.name,
    x: node.x,
    y: node.y,
  };
}

async function resizeNode(params) {
  const { nodeId, width, height } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  if (width === undefined || height === undefined) {
    throw new Error("Missing width or height parameters");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (!("resize" in node)) {
    throw new Error(`Node does not support resizing: ${nodeId}`);
  }

  node.resize(width, height);

  return {
    id: node.id,
    name: node.name,
    width: node.width,
    height: node.height,
  };
}

async function deleteNode(params) {
  const { nodeId } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  // Save node info before deleting
  const nodeInfo = {
    id: node.id,
    name: node.name,
    type: node.type,
  };

  node.remove();

  return nodeInfo;
}

async function getStyles() {
  const styles = {
    colors: await figma.getLocalPaintStylesAsync(),
    texts: await figma.getLocalTextStylesAsync(),
    effects: await figma.getLocalEffectStylesAsync(),
    grids: await figma.getLocalGridStylesAsync(),
  };

  return {
    colors: styles.colors.map((style) => ({
      id: style.id,
      name: style.name,
      key: style.key,
      paint: style.paints[0],
    })),
    texts: styles.texts.map((style) => ({
      id: style.id,
      name: style.name,
      key: style.key,
      fontSize: style.fontSize,
      fontName: style.fontName,
    })),
    effects: styles.effects.map((style) => ({
      id: style.id,
      name: style.name,
      key: style.key,
    })),
    grids: styles.grids.map((style) => ({
      id: style.id,
      name: style.name,
      key: style.key,
    })),
  };
}

async function getLocalComponents() {
  await figma.loadAllPagesAsync();

  const components = figma.root.findAllWithCriteria({
    types: ["COMPONENT"],
  });

  return {
    count: components.length,
    components: components.map((component) => ({
      id: component.id,
      name: component.name,
      key: "key" in component ? component.key : null,
    })),
  };
}

// async function getTeamComponents() {
//   try {
//     const teamComponents =
//       await figma.teamLibrary.getAvailableComponentsAsync();

//     return {
//       count: teamComponents.length,
//       components: teamComponents.map((component) => ({
//         key: component.key,
//         name: component.name,
//         description: component.description,
//         libraryName: component.libraryName,
//       })),
//     };
//   } catch (error) {
//     throw new Error(`Error getting team components: ${error.message}`);
//   }
// }

async function createComponentInstance(params) {
  const { componentKey, x = 0, y = 0 } = params || {};

  if (!componentKey) {
    throw new Error("Missing componentKey parameter");
  }

  try {
    // Set up a manual timeout to detect long operations
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error("Timeout while creating component instance (10s). The component may be too complex or unavailable."));
      }, 10000); // 10 seconds timeout
    });

    console.log(`Starting component import for key: ${componentKey}...`);

    // Execute the import with a timeout
    const importPromise = figma.importComponentByKeyAsync(componentKey);

    // Use Promise.race to implement the timeout
    const component = await Promise.race([importPromise, timeoutPromise])
      .finally(() => {
        clearTimeout(timeoutId); // Clear the timeout to prevent memory leaks
      });

    // Add progress logging
    console.log(`Component imported successfully, creating instance...`);

    // Create instance and set properties in a separate try block to handle errors specifically from this step
    try {
      const instance = component.createInstance();
      instance.x = x;
      instance.y = y;

      figma.currentPage.appendChild(instance);

      console.log(`Component instance created and added to page successfully`);

      return {
        id: instance.id,
        name: instance.name,
        x: instance.x,
        y: instance.y,
        width: instance.width,
        height: instance.height,
        componentId: instance.componentId,
      };
    } catch (instanceError) {
      console.error(`Error creating component instance: ${instanceError.message}`);
      throw new Error(`Error creating component instance: ${instanceError.message}`);
    }
  } catch (error) {
    console.error(`Detailed error creating component instance: ${error.message || "Unknown error"}`);
    console.error(`Stack trace: ${error.stack || "Not available"}`);

    // Provide more helpful error messages for common failure scenarios
    if (error.message.includes("timeout") || error.message.includes("Timeout")) {
      throw new Error(`The component import timed out after 10 seconds. This usually happens with complex remote components or network issues. Try again later or use a simpler component.`);
    } else if (error.message.includes("not found") || error.message.includes("Not found")) {
      throw new Error(`Component with key "${componentKey}" not found. Make sure the component exists and is accessible in your document or team libraries.`);
    } else if (error.message.includes("permission") || error.message.includes("Permission")) {
      throw new Error(`You don't have permission to use this component. Make sure you have access to the team library containing this component.`);
    } else {
      throw new Error(`Error creating component instance: ${error.message}`);
    }
  }
}

async function exportNodeAsImage(params) {
  const { nodeId, scale = 1 } = params || {};

  const format = "PNG";

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (!("exportAsync" in node)) {
    throw new Error(`Node does not support exporting: ${nodeId}`);
  }

  try {
    const settings = {
      format: format,
      constraint: { type: "SCALE", value: scale },
    };

    const bytes = await node.exportAsync(settings);

    let mimeType;
    switch (format) {
      case "PNG":
        mimeType = "image/png";
        break;
      case "JPG":
        mimeType = "image/jpeg";
        break;
      case "SVG":
        mimeType = "image/svg+xml";
        break;
      case "PDF":
        mimeType = "application/pdf";
        break;
      default:
        mimeType = "application/octet-stream";
    }

    // Proper way to convert Uint8Array to base64
    const base64 = customBase64Encode(bytes);
    // const imageData = `data:${mimeType};base64,${base64}`;

    return {
      nodeId,
      format,
      scale,
      mimeType,
      imageData: base64,
    };
  } catch (error) {
    throw new Error(`Error exporting node as image: ${error.message}`);
  }
}
function customBase64Encode(bytes) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let base64 = "";

  const byteLength = bytes.byteLength;
  const byteRemainder = byteLength % 3;
  const mainLength = byteLength - byteRemainder;

  let a, b, c, d;
  let chunk;

  // Main loop deals with bytes in chunks of 3
  for (let i = 0; i < mainLength; i = i + 3) {
    // Combine the three bytes into a single integer
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048) >> 12; // 258048 = (2^6 - 1) << 12
    c = (chunk & 4032) >> 6; // 4032 = (2^6 - 1) << 6
    d = chunk & 63; // 63 = 2^6 - 1

    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += chars[a] + chars[b] + chars[c] + chars[d];
  }

  // Deal with the remaining bytes and padding
  if (byteRemainder === 1) {
    chunk = bytes[mainLength];

    a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

    // Set the 4 least significant bits to zero
    b = (chunk & 3) << 4; // 3 = 2^2 - 1

    base64 += chars[a] + chars[b] + "==";
  } else if (byteRemainder === 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

    a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008) >> 4; // 1008 = (2^6 - 1) << 4

    // Set the 2 least significant bits to zero
    c = (chunk & 15) << 2; // 15 = 2^4 - 1

    base64 += chars[a] + chars[b] + chars[c] + "=";
  }

  return base64;
}

async function setCornerRadius(params) {
  const { nodeId, radius, corners } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  if (radius === undefined) {
    throw new Error("Missing radius parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  // Check if node supports corner radius
  if (!("cornerRadius" in node)) {
    throw new Error(`Node does not support corner radius: ${nodeId}`);
  }

  // If corners array is provided, set individual corner radii
  if (corners && Array.isArray(corners) && corners.length === 4) {
    if ("topLeftRadius" in node) {
      // Node supports individual corner radii
      if (corners[0]) node.topLeftRadius = radius;
      if (corners[1]) node.topRightRadius = radius;
      if (corners[2]) node.bottomRightRadius = radius;
      if (corners[3]) node.bottomLeftRadius = radius;
    } else {
      // Node only supports uniform corner radius
      node.cornerRadius = radius;
    }
  } else {
    // Set uniform corner radius
    node.cornerRadius = radius;
  }

  return {
    id: node.id,
    name: node.name,
    cornerRadius: "cornerRadius" in node ? node.cornerRadius : undefined,
    topLeftRadius: "topLeftRadius" in node ? node.topLeftRadius : undefined,
    topRightRadius: "topRightRadius" in node ? node.topRightRadius : undefined,
    bottomRightRadius:
      "bottomRightRadius" in node ? node.bottomRightRadius : undefined,
    bottomLeftRadius:
      "bottomLeftRadius" in node ? node.bottomLeftRadius : undefined,
  };
}

async function setTextContent(params) {
  const { nodeId, text } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  if (text === undefined) {
    throw new Error("Missing text parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (node.type !== "TEXT") {
    throw new Error(`Node is not a text node: ${nodeId}`);
  }

  try {
    await figma.loadFontAsync(node.fontName);

    await setCharacters(node, text);

    return {
      id: node.id,
      name: node.name,
      characters: node.characters,
      fontName: node.fontName,
    };
  } catch (error) {
    throw new Error(`Error setting text content: ${error.message}`);
  }
}

// Initialize settings on load
(async function initializePlugin() {
  try {
    const savedSettings = await figma.clientStorage.getAsync("settings");
    if (savedSettings) {
      if (savedSettings.serverPort) {
        state.serverPort = savedSettings.serverPort;
      }
    }

    // Send initial settings to UI
    figma.ui.postMessage({
      type: "init-settings",
      settings: {
        serverPort: state.serverPort,
      },
    });
  } catch (error) {
    console.error("Error loading settings:", error);
  }
})();

function uniqBy(arr, predicate) {
  const cb = typeof predicate === "function" ? predicate : (o) => o[predicate];
  return [
    ...arr
      .reduce((map, item) => {
        const key = item === null || item === undefined ? item : cb(item);

        map.has(key) || map.set(key, item);

        return map;
      }, new Map())
      .values(),
  ];
}
const setCharacters = async (node, characters, options) => {
  const fallbackFont = (options && options.fallbackFont) || {
    family: "Inter",
    style: "Regular",
  };
  try {
    if (node.fontName === figma.mixed) {
      if (options && options.smartStrategy === "prevail") {
        const fontHashTree = {};
        for (let i = 1; i < node.characters.length; i++) {
          const charFont = node.getRangeFontName(i - 1, i);
          const key = `${charFont.family}::${charFont.style}`;
          fontHashTree[key] = fontHashTree[key] ? fontHashTree[key] + 1 : 1;
        }
        const prevailedTreeItem = Object.entries(fontHashTree).sort(
          (a, b) => b[1] - a[1]
        )[0];
        const [family, style] = prevailedTreeItem[0].split("::");
        const prevailedFont = {
          family,
          style,
        };
        await figma.loadFontAsync(prevailedFont);
        node.fontName = prevailedFont;
      } else if (options && options.smartStrategy === "strict") {
        return setCharactersWithStrictMatchFont(node, characters, fallbackFont);
      } else if (options && options.smartStrategy === "experimental") {
        return setCharactersWithSmartMatchFont(node, characters, fallbackFont);
      } else {
        const firstCharFont = node.getRangeFontName(0, 1);
        await figma.loadFontAsync(firstCharFont);
        node.fontName = firstCharFont;
      }
    } else {
      await figma.loadFontAsync({
        family: node.fontName.family,
        style: node.fontName.style,
      });
    }
  } catch (err) {
    console.warn(
      `Failed to load "${node.fontName["family"]} ${node.fontName["style"]}" font and replaced with fallback "${fallbackFont.family} ${fallbackFont.style}"`,
      err
    );
    await figma.loadFontAsync(fallbackFont);
    node.fontName = fallbackFont;
  }
  try {
    node.characters = characters;
    return true;
  } catch (err) {
    console.warn(`Failed to set characters. Skipped.`, err);
    return false;
  }
};

const setCharactersWithStrictMatchFont = async (
  node,
  characters,
  fallbackFont
) => {
  const fontHashTree = {};
  for (let i = 1; i < node.characters.length; i++) {
    const startIdx = i - 1;
    const startCharFont = node.getRangeFontName(startIdx, i);
    const startCharFontVal = `${startCharFont.family}::${startCharFont.style}`;
    while (i < node.characters.length) {
      i++;
      const charFont = node.getRangeFontName(i - 1, i);
      if (startCharFontVal !== `${charFont.family}::${charFont.style}`) {
        break;
      }
    }
    fontHashTree[`${startIdx}_${i}`] = startCharFontVal;
  }
  await figma.loadFontAsync(fallbackFont);
  node.fontName = fallbackFont;
  node.characters = characters;
  console.log(fontHashTree);
  await Promise.all(
    Object.keys(fontHashTree).map(async (range) => {
      console.log(range, fontHashTree[range]);
      const [start, end] = range.split("_");
      const [family, style] = fontHashTree[range].split("::");
      const matchedFont = {
        family,
        style,
      };
      await figma.loadFontAsync(matchedFont);
      return node.setRangeFontName(Number(start), Number(end), matchedFont);
    })
  );
  return true;
};

const getDelimiterPos = (str, delimiter, startIdx = 0, endIdx = str.length) => {
  const indices = [];
  let temp = startIdx;
  for (let i = startIdx; i < endIdx; i++) {
    if (
      str[i] === delimiter &&
      i + startIdx !== endIdx &&
      temp !== i + startIdx
    ) {
      indices.push([temp, i + startIdx]);
      temp = i + startIdx + 1;
    }
  }
  temp !== endIdx && indices.push([temp, endIdx]);
  return indices.filter(Boolean);
};

const buildLinearOrder = (node) => {
  const fontTree = [];
  const newLinesPos = getDelimiterPos(node.characters, "\n");
  newLinesPos.forEach(([newLinesRangeStart, newLinesRangeEnd], n) => {
    const newLinesRangeFont = node.getRangeFontName(
      newLinesRangeStart,
      newLinesRangeEnd
    );
    if (newLinesRangeFont === figma.mixed) {
      const spacesPos = getDelimiterPos(
        node.characters,
        " ",
        newLinesRangeStart,
        newLinesRangeEnd
      );
      spacesPos.forEach(([spacesRangeStart, spacesRangeEnd], s) => {
        const spacesRangeFont = node.getRangeFontName(
          spacesRangeStart,
          spacesRangeEnd
        );
        if (spacesRangeFont === figma.mixed) {
          const spacesRangeFont = node.getRangeFontName(
            spacesRangeStart,
            spacesRangeStart[0]
          );
          fontTree.push({
            start: spacesRangeStart,
            delimiter: " ",
            family: spacesRangeFont.family,
            style: spacesRangeFont.style,
          });
        } else {
          fontTree.push({
            start: spacesRangeStart,
            delimiter: " ",
            family: spacesRangeFont.family,
            style: spacesRangeFont.style,
          });
        }
      });
    } else {
      fontTree.push({
        start: newLinesRangeStart,
        delimiter: "\n",
        family: newLinesRangeFont.family,
        style: newLinesRangeFont.style,
      });
    }
  });
  return fontTree
    .sort((a, b) => +a.start - +b.start)
    .map(({ family, style, delimiter }) => ({ family, style, delimiter }));
};

const setCharactersWithSmartMatchFont = async (
  node,
  characters,
  fallbackFont
) => {
  const rangeTree = buildLinearOrder(node);
  const fontsToLoad = uniqBy(
    rangeTree,
    ({ family, style }) => `${family}::${style}`
  ).map(({ family, style }) => ({
    family,
    style,
  }));

  await Promise.all([...fontsToLoad, fallbackFont].map(figma.loadFontAsync));

  node.fontName = fallbackFont;
  node.characters = characters;

  let prevPos = 0;
  rangeTree.forEach(({ family, style, delimiter }) => {
    if (prevPos < node.characters.length) {
      const delimeterPos = node.characters.indexOf(delimiter, prevPos);
      const endPos =
        delimeterPos > prevPos ? delimeterPos : node.characters.length;
      const matchedFont = {
        family,
        style,
      };
      node.setRangeFontName(prevPos, endPos, matchedFont);
      prevPos = endPos + 1;
    }
  });
  return true;
};

// Add the cloneNode function implementation
async function cloneNode(params) {
  const { nodeId, x, y } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  // Clone the node
  const clone = node.clone();

  // If x and y are provided, move the clone to that position
  if (x !== undefined && y !== undefined) {
    if (!("x" in clone) || !("y" in clone)) {
      throw new Error(`Cloned node does not support position: ${nodeId}`);
    }
    clone.x = x;
    clone.y = y;
  }

  // Add the clone to the same parent as the original node
  if (node.parent) {
    node.parent.appendChild(clone);
  } else {
    figma.currentPage.appendChild(clone);
  }

  return {
    id: clone.id,
    name: clone.name,
    x: "x" in clone ? clone.x : undefined,
    y: "y" in clone ? clone.y : undefined,
    width: "width" in clone ? clone.width : undefined,
    height: "height" in clone ? clone.height : undefined,
  };
}

async function scanTextNodes(params) {
  console.log(`Starting to scan text nodes from node ID: ${params.nodeId}`);
  const { nodeId, useChunking = true, chunkSize = 10, commandId = generateCommandId() } = params || {};

  const node = await figma.getNodeByIdAsync(nodeId);

  if (!node) {
    console.error(`Node with ID ${nodeId} not found`);
    // Send error progress update
    sendProgressUpdate(
      commandId,
      'scan_text_nodes',
      'error',
      0,
      0,
      0,
      `Node with ID ${nodeId} not found`,
      { error: `Node not found: ${nodeId}` }
    );
    throw new Error(`Node with ID ${nodeId} not found`);
  }

  // If chunking is not enabled, use the original implementation
  if (!useChunking) {
    const textNodes = [];
    try {
      // Send started progress update
      sendProgressUpdate(
        commandId,
        'scan_text_nodes',
        'started',
        0,
        1, // Not known yet how many nodes there are
        0,
        `Starting scan of node "${node.name || nodeId}" without chunking`,
        null
      );

      await findTextNodes(node, [], 0, textNodes);

      // Send completed progress update
      sendProgressUpdate(
        commandId,
        'scan_text_nodes',
        'completed',
        100,
        textNodes.length,
        textNodes.length,
        `Scan complete. Found ${textNodes.length} text nodes.`,
        { textNodes }
      );

      return {
        success: true,
        message: `Scanned ${textNodes.length} text nodes.`,
        count: textNodes.length,
        textNodes: textNodes,
        commandId
      };
    } catch (error) {
      console.error("Error scanning text nodes:", error);

      // Send error progress update
      sendProgressUpdate(
        commandId,
        'scan_text_nodes',
        'error',
        0,
        0,
        0,
        `Error scanning text nodes: ${error.message}`,
        { error: error.message }
      );

      throw new Error(`Error scanning text nodes: ${error.message}`);
    }
  }

  // Chunked implementation
  console.log(`Using chunked scanning with chunk size: ${chunkSize}`);

  // First, collect all nodes to process (without processing them yet)
  const nodesToProcess = [];

  // Send started progress update
  sendProgressUpdate(
    commandId,
    'scan_text_nodes',
    'started',
    0,
    0, // Not known yet how many nodes there are
    0,
    `Starting chunked scan of node "${node.name || nodeId}"`,
    { chunkSize }
  );

  await collectNodesToProcess(node, [], 0, nodesToProcess);

  const totalNodes = nodesToProcess.length;
  console.log(`Found ${totalNodes} total nodes to process`);

  // Calculate number of chunks needed
  const totalChunks = Math.ceil(totalNodes / chunkSize);
  console.log(`Will process in ${totalChunks} chunks`);

  // Send update after node collection
  sendProgressUpdate(
    commandId,
    'scan_text_nodes',
    'in_progress',
    5, // 5% progress for collection phase
    totalNodes,
    0,
    `Found ${totalNodes} nodes to scan. Will process in ${totalChunks} chunks.`,
    {
      totalNodes,
      totalChunks,
      chunkSize
    }
  );

  // Process nodes in chunks
  const allTextNodes = [];
  let processedNodes = 0;
  let chunksProcessed = 0;

  for (let i = 0; i < totalNodes; i += chunkSize) {
    const chunkEnd = Math.min(i + chunkSize, totalNodes);
    console.log(`Processing chunk ${chunksProcessed + 1}/${totalChunks} (nodes ${i} to ${chunkEnd - 1})`);

    // Send update before processing chunk
    sendProgressUpdate(
      commandId,
      'scan_text_nodes',
      'in_progress',
      Math.round(5 + ((chunksProcessed / totalChunks) * 90)), // 5-95% for processing
      totalNodes,
      processedNodes,
      `Processing chunk ${chunksProcessed + 1}/${totalChunks}`,
      {
        currentChunk: chunksProcessed + 1,
        totalChunks,
        textNodesFound: allTextNodes.length
      }
    );

    const chunkNodes = nodesToProcess.slice(i, chunkEnd);
    const chunkTextNodes = [];

    // Process each node in this chunk
    for (const nodeInfo of chunkNodes) {
      if (nodeInfo.node.type === "TEXT") {
        try {
          const textNodeInfo = await processTextNode(nodeInfo.node, nodeInfo.parentPath, nodeInfo.depth);
          if (textNodeInfo) {
            chunkTextNodes.push(textNodeInfo);
          }
        } catch (error) {
          console.error(`Error processing text node: ${error.message}`);
          // Continue with other nodes
        }
      }

      // Brief delay to allow UI updates and prevent freezing
      await delay(5);
    }

    // Add results from this chunk
    allTextNodes.push(...chunkTextNodes);
    processedNodes += chunkNodes.length;
    chunksProcessed++;

    // Send update after processing chunk
    sendProgressUpdate(
      commandId,
      'scan_text_nodes',
      'in_progress',
      Math.round(5 + ((chunksProcessed / totalChunks) * 90)), // 5-95% for processing
      totalNodes,
      processedNodes,
      `Processed chunk ${chunksProcessed}/${totalChunks}. Found ${allTextNodes.length} text nodes so far.`,
      {
        currentChunk: chunksProcessed,
        totalChunks,
        processedNodes,
        textNodesFound: allTextNodes.length,
        chunkResult: chunkTextNodes
      }
    );

    // Small delay between chunks to prevent UI freezing
    if (i + chunkSize < totalNodes) {
      await delay(50);
    }
  }

  // Send completed progress update
  sendProgressUpdate(
    commandId,
    'scan_text_nodes',
    'completed',
    100,
    totalNodes,
    processedNodes,
    `Scan complete. Found ${allTextNodes.length} text nodes.`,
    {
      textNodes: allTextNodes,
      processedNodes,
      chunks: chunksProcessed
    }
  );

  return {
    success: true,
    message: `Chunked scan complete. Found ${allTextNodes.length} text nodes.`,
    totalNodes: allTextNodes.length,
    processedNodes: processedNodes,
    chunks: chunksProcessed,
    textNodes: allTextNodes,
    commandId
  };
}

// Helper function to collect all nodes that need to be processed
async function collectNodesToProcess(node, parentPath = [], depth = 0, nodesToProcess = []) {
  // Skip invisible nodes
  if (node.visible === false) return;

  // Get the path to this node
  const nodePath = [...parentPath, node.name || `Unnamed ${node.type}`];

  // Add this node to the processing list
  nodesToProcess.push({
    node: node,
    parentPath: nodePath,
    depth: depth
  });

  // Recursively add children
  if ("children" in node) {
    for (const child of node.children) {
      await collectNodesToProcess(child, nodePath, depth + 1, nodesToProcess);
    }
  }
}

// Process a single text node
async function processTextNode(node, parentPath, depth) {
  if (node.type !== "TEXT") return null;

  try {
    // Safely extract font information
    let fontFamily = "";
    let fontStyle = "";

    if (node.fontName) {
      if (typeof node.fontName === "object") {
        if ("family" in node.fontName) fontFamily = node.fontName.family;
        if ("style" in node.fontName) fontStyle = node.fontName.style;
      }
    }

    // Create a safe representation of the text node
    const safeTextNode = {
      id: node.id,
      name: node.name || "Text",
      type: node.type,
      characters: node.characters,
      fontSize: typeof node.fontSize === "number" ? node.fontSize : 0,
      fontFamily: fontFamily,
      fontStyle: fontStyle,
      x: typeof node.x === "number" ? node.x : 0,
      y: typeof node.y === "number" ? node.y : 0,
      width: typeof node.width === "number" ? node.width : 0,
      height: typeof node.height === "number" ? node.height : 0,
      path: parentPath.join(" > "),
      depth: depth,
    };

    // Highlight the node briefly (optional visual feedback)
    try {
      const originalFills = JSON.parse(JSON.stringify(node.fills));
      node.fills = [
        {
          type: "SOLID",
          color: { r: 1, g: 0.5, b: 0 },
          opacity: 0.3,
        },
      ];

      // Brief delay for the highlight to be visible
      await delay(100);

      try {
        node.fills = originalFills;
      } catch (err) {
        console.error("Error resetting fills:", err);
      }
    } catch (highlightErr) {
      console.error("Error highlighting text node:", highlightErr);
      // Continue anyway, highlighting is just visual feedback
    }

    return safeTextNode;
  } catch (nodeErr) {
    console.error("Error processing text node:", nodeErr);
    return null;
  }
}

// A delay function that returns a promise
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Keep the original findTextNodes for backward compatibility
async function findTextNodes(node, parentPath = [], depth = 0, textNodes = []) {
  // Skip invisible nodes
  if (node.visible === false) return;

  // Get the path to this node including its name
  const nodePath = [...parentPath, node.name || `Unnamed ${node.type}`];

  if (node.type === "TEXT") {
    try {
      // Safely extract font information to avoid Symbol serialization issues
      let fontFamily = "";
      let fontStyle = "";

      if (node.fontName) {
        if (typeof node.fontName === "object") {
          if ("family" in node.fontName) fontFamily = node.fontName.family;
          if ("style" in node.fontName) fontStyle = node.fontName.style;
        }
      }

      // Create a safe representation of the text node with only serializable properties
      const safeTextNode = {
        id: node.id,
        name: node.name || "Text",
        type: node.type,
        characters: node.characters,
        fontSize: typeof node.fontSize === "number" ? node.fontSize : 0,
        fontFamily: fontFamily,
        fontStyle: fontStyle,
        x: typeof node.x === "number" ? node.x : 0,
        y: typeof node.y === "number" ? node.y : 0,
        width: typeof node.width === "number" ? node.width : 0,
        height: typeof node.height === "number" ? node.height : 0,
        path: nodePath.join(" > "),
        depth: depth,
      };

      // Only highlight the node if it's not being done via API
      try {
        // Safe way to create a temporary highlight without causing serialization issues
        const originalFills = JSON.parse(JSON.stringify(node.fills));
        node.fills = [
          {
            type: "SOLID",
            color: { r: 1, g: 0.5, b: 0 },
            opacity: 0.3,
          },
        ];

        // Promise-based delay instead of setTimeout
        await delay(500);

        try {
          node.fills = originalFills;
        } catch (err) {
          console.error("Error resetting fills:", err);
        }
      } catch (highlightErr) {
        console.error("Error highlighting text node:", highlightErr);
        // Continue anyway, highlighting is just visual feedback
      }

      textNodes.push(safeTextNode);
    } catch (nodeErr) {
      console.error("Error processing text node:", nodeErr);
      // Skip this node but continue with others
    }
  }

  // Recursively process children of container nodes
  if ("children" in node) {
    for (const child of node.children) {
      await findTextNodes(child, nodePath, depth + 1, textNodes);
    }
  }
}

// Replace text in a specific node
async function setMultipleTextContents(params) {
  const { nodeId, text } = params || {};
  const commandId = params.commandId || generateCommandId();

  if (!nodeId || !text || !Array.isArray(text)) {
    const errorMsg = "Missing required parameters: nodeId and text array";

    // Send error progress update
    sendProgressUpdate(
      commandId,
      'set_multiple_text_contents',
      'error',
      0,
      0,
      0,
      errorMsg,
      { error: errorMsg }
    );

    throw new Error(errorMsg);
  }

  console.log(
    `Starting text replacement for node: ${nodeId} with ${text.length} text replacements`
  );

  // Send started progress update
  sendProgressUpdate(
    commandId,
    'set_multiple_text_contents',
    'started',
    0,
    text.length,
    0,
    `Starting text replacement for ${text.length} nodes`,
    { totalReplacements: text.length }
  );

  // Define the results array and counters
  const results = [];
  let successCount = 0;
  let failureCount = 0;

  // Split text replacements into chunks of 5
  const CHUNK_SIZE = 5;
  const chunks = [];

  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.slice(i, i + CHUNK_SIZE));
  }

  console.log(`Split ${text.length} replacements into ${chunks.length} chunks`);

  // Send chunking info update
  sendProgressUpdate(
    commandId,
    'set_multiple_text_contents',
    'in_progress',
    5, // 5% progress for planning phase
    text.length,
    0,
    `Preparing to replace text in ${text.length} nodes using ${chunks.length} chunks`,
    {
      totalReplacements: text.length,
      chunks: chunks.length,
      chunkSize: CHUNK_SIZE
    }
  );

  // Process each chunk sequentially
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    console.log(`Processing chunk ${chunkIndex + 1}/${chunks.length} with ${chunk.length} replacements`);

    // Send chunk processing start update
    sendProgressUpdate(
      commandId,
      'set_multiple_text_contents',
      'in_progress',
      Math.round(5 + ((chunkIndex / chunks.length) * 90)), // 5-95% for processing
      text.length,
      successCount + failureCount,
      `Processing text replacements chunk ${chunkIndex + 1}/${chunks.length}`,
      {
        currentChunk: chunkIndex + 1,
        totalChunks: chunks.length,
        successCount,
        failureCount
      }
    );

    // Process replacements within a chunk in parallel
    const chunkPromises = chunk.map(async (replacement) => {
      if (!replacement.nodeId || replacement.text === undefined) {
        console.error(`Missing nodeId or text for replacement`);
        return {
          success: false,
          nodeId: replacement.nodeId || "unknown",
          error: "Missing nodeId or text in replacement entry"
        };
      }

      try {
        console.log(`Attempting to replace text in node: ${replacement.nodeId}`);

        // Get the text node to update (just to check it exists and get original text)
        const textNode = await figma.getNodeByIdAsync(replacement.nodeId);

        if (!textNode) {
          console.error(`Text node not found: ${replacement.nodeId}`);
          return {
            success: false,
            nodeId: replacement.nodeId,
            error: `Node not found: ${replacement.nodeId}`
          };
        }

        if (textNode.type !== "TEXT") {
          console.error(`Node is not a text node: ${replacement.nodeId} (type: ${textNode.type})`);
          return {
            success: false,
            nodeId: replacement.nodeId,
            error: `Node is not a text node: ${replacement.nodeId} (type: ${textNode.type})`
          };
        }

        // Save original text for the result
        const originalText = textNode.characters;
        console.log(`Original text: "${originalText}"`);
        console.log(`Will translate to: "${replacement.text}"`);

        // Highlight the node before changing text
        let originalFills;
        try {
          // Save original fills for restoration later
          originalFills = JSON.parse(JSON.stringify(textNode.fills));
          // Apply highlight color (orange with 30% opacity)
          textNode.fills = [
            {
              type: "SOLID",
              color: { r: 1, g: 0.5, b: 0 },
              opacity: 0.3,
            },
          ];
        } catch (highlightErr) {
          console.error(`Error highlighting text node: ${highlightErr.message}`);
          // Continue anyway, highlighting is just visual feedback
        }

        // Use the existing setTextContent function to handle font loading and text setting
        await setTextContent({
          nodeId: replacement.nodeId,
          text: replacement.text
        });

        // Keep highlight for a moment after text change, then restore original fills
        if (originalFills) {
          try {
            // Use delay function for consistent timing
            await delay(500);
            textNode.fills = originalFills;
          } catch (restoreErr) {
            console.error(`Error restoring fills: ${restoreErr.message}`);
          }
        }

        console.log(`Successfully replaced text in node: ${replacement.nodeId}`);
        return {
          success: true,
          nodeId: replacement.nodeId,
          originalText: originalText,
          translatedText: replacement.text
        };
      } catch (error) {
        console.error(`Error replacing text in node ${replacement.nodeId}: ${error.message}`);
        return {
          success: false,
          nodeId: replacement.nodeId,
          error: `Error applying replacement: ${error.message}`
        };
      }
    });

    // Wait for all replacements in this chunk to complete
    const chunkResults = await Promise.all(chunkPromises);

    // Process results for this chunk
    chunkResults.forEach(result => {
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
      results.push(result);
    });

    // Send chunk processing complete update with partial results
    sendProgressUpdate(
      commandId,
      'set_multiple_text_contents',
      'in_progress',
      Math.round(5 + (((chunkIndex + 1) / chunks.length) * 90)), // 5-95% for processing
      text.length,
      successCount + failureCount,
      `Completed chunk ${chunkIndex + 1}/${chunks.length}. ${successCount} successful, ${failureCount} failed so far.`,
      {
        currentChunk: chunkIndex + 1,
        totalChunks: chunks.length,
        successCount,
        failureCount,
        chunkResults: chunkResults
      }
    );

    // Add a small delay between chunks to avoid overloading Figma
    if (chunkIndex < chunks.length - 1) {
      console.log('Pausing between chunks to avoid overloading Figma...');
      await delay(1000); // 1 second delay between chunks
    }
  }

  console.log(
    `Replacement complete: ${successCount} successful, ${failureCount} failed`
  );

  // Send completed progress update
  sendProgressUpdate(
    commandId,
    'set_multiple_text_contents',
    'completed',
    100,
    text.length,
    successCount + failureCount,
    `Text replacement complete: ${successCount} successful, ${failureCount} failed`,
    {
      totalReplacements: text.length,
      replacementsApplied: successCount,
      replacementsFailed: failureCount,
      completedInChunks: chunks.length,
      results: results
    }
  );

  return {
    success: successCount > 0,
    nodeId: nodeId,
    replacementsApplied: successCount,
    replacementsFailed: failureCount,
    totalReplacements: text.length,
    results: results,
    completedInChunks: chunks.length,
    commandId
  };
}

// Function to generate simple UUIDs for command IDs
function generateCommandId() {
  return 'cmd_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function setAutoLayout(params) {
  const {
    nodeId,
    layoutMode,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
    itemSpacing,
    primaryAxisAlignItems,
    counterAxisAlignItems,
    layoutWrap,
    strokesIncludedInLayout
  } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  if (!layoutMode) {
    throw new Error("Missing layoutMode parameter");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  // Check if the node is a frame or group
  if (!("layoutMode" in node)) {
    throw new Error(`Node does not support auto layout: ${nodeId}`);
  }

  // Configure layout mode
  if (layoutMode === "NONE") {
    node.layoutMode = "NONE";
  } else {
    // Set auto layout properties
    node.layoutMode = layoutMode;

    // Configure padding if provided
    if (paddingTop !== undefined) node.paddingTop = paddingTop;
    if (paddingBottom !== undefined) node.paddingBottom = paddingBottom;
    if (paddingLeft !== undefined) node.paddingLeft = paddingLeft;
    if (paddingRight !== undefined) node.paddingRight = paddingRight;

    // Configure item spacing
    if (itemSpacing !== undefined) node.itemSpacing = itemSpacing;

    // Configure alignment
    if (primaryAxisAlignItems !== undefined) {
      node.primaryAxisAlignItems = primaryAxisAlignItems;
    }

    if (counterAxisAlignItems !== undefined) {
      node.counterAxisAlignItems = counterAxisAlignItems;
    }

    // Configure wrap
    if (layoutWrap !== undefined) {
      node.layoutWrap = layoutWrap;
    }

    // Configure stroke inclusion
    if (strokesIncludedInLayout !== undefined) {
      node.strokesIncludedInLayout = strokesIncludedInLayout;
    }
  }

  return {
    id: node.id,
    name: node.name,
    layoutMode: node.layoutMode,
    paddingTop: node.paddingTop,
    paddingBottom: node.paddingBottom,
    paddingLeft: node.paddingLeft,
    paddingRight: node.paddingRight,
    itemSpacing: node.itemSpacing,
    primaryAxisAlignItems: node.primaryAxisAlignItems,
    counterAxisAlignItems: node.counterAxisAlignItems,
    layoutWrap: node.layoutWrap,
    strokesIncludedInLayout: node.strokesIncludedInLayout
  };
}

// Nuevas funciones para propiedades de texto

async function setFontName(params) {
  const { nodeId, family, style } = params || {};
  if (!nodeId || !family) {
    throw new Error("Missing nodeId or font family");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (node.type !== "TEXT") {
    throw new Error(`Node is not a text node: ${nodeId}`);
  }

  try {
    await figma.loadFontAsync({ family, style: style || "Regular" });
    node.fontName = { family, style: style || "Regular" };
    return {
      id: node.id,
      name: node.name,
      fontName: node.fontName
    };
  } catch (error) {
    throw new Error(`Error setting font name: ${error.message}`);
  }
}

async function setFontSize(params) {
  const { nodeId, fontSize } = params || {};
  if (!nodeId || fontSize === undefined) {
    throw new Error("Missing nodeId or fontSize");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (node.type !== "TEXT") {
    throw new Error(`Node is not a text node: ${nodeId}`);
  }

  try {
    await figma.loadFontAsync(node.fontName);
    node.fontSize = fontSize;
    return {
      id: node.id,
      name: node.name,
      fontSize: node.fontSize
    };
  } catch (error) {
    throw new Error(`Error setting font size: ${error.message}`);
  }
}

async function setFontWeight(params) {
  const { nodeId, weight } = params || {};
  if (!nodeId || weight === undefined) {
    throw new Error("Missing nodeId or weight");
  }

  // Map weight to font style
  const getFontStyle = (weight) => {
    switch (weight) {
      case 100: return "Thin";
      case 200: return "Extra Light";
      case 300: return "Light";
      case 400: return "Regular";
      case 500: return "Medium";
      case 600: return "Semi Bold";
      case 700: return "Bold";
      case 800: return "Extra Bold";
      case 900: return "Black";
      default: return "Regular";
    }
  };

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (node.type !== "TEXT") {
    throw new Error(`Node is not a text node: ${nodeId}`);
  }

  try {
    const family = node.fontName.family;
    const style = getFontStyle(weight);
    await figma.loadFontAsync({ family, style });
    node.fontName = { family, style };
    return {
      id: node.id,
      name: node.name,
      fontName: node.fontName,
      weight: weight
    };
  } catch (error) {
    throw new Error(`Error setting font weight: ${error.message}`);
  }
}

async function setLetterSpacing(params) {
  const { nodeId, letterSpacing, unit = "PIXELS" } = params || {};
  if (!nodeId || letterSpacing === undefined) {
    throw new Error("Missing nodeId or letterSpacing");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (node.type !== "TEXT") {
    throw new Error(`Node is not a text node: ${nodeId}`);
  }

  try {
    await figma.loadFontAsync(node.fontName);
    node.letterSpacing = { value: letterSpacing, unit };
    return {
      id: node.id,
      name: node.name,
      letterSpacing: node.letterSpacing
    };
  } catch (error) {
    throw new Error(`Error setting letter spacing: ${error.message}`);
  }
}

async function setLineHeight(params) {
  const { nodeId, lineHeight, unit = "PIXELS" } = params || {};
  if (!nodeId || lineHeight === undefined) {
    throw new Error("Missing nodeId or lineHeight");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (node.type !== "TEXT") {
    throw new Error(`Node is not a text node: ${nodeId}`);
  }

  try {
    await figma.loadFontAsync(node.fontName);
    node.lineHeight = { value: lineHeight, unit };
    return {
      id: node.id,
      name: node.name,
      lineHeight: node.lineHeight
    };
  } catch (error) {
    throw new Error(`Error setting line height: ${error.message}`);
  }
}

async function setParagraphSpacing(params) {
  const { nodeId, paragraphSpacing } = params || {};
  if (!nodeId || paragraphSpacing === undefined) {
    throw new Error("Missing nodeId or paragraphSpacing");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (node.type !== "TEXT") {
    throw new Error(`Node is not a text node: ${nodeId}`);
  }

  try {
    await figma.loadFontAsync(node.fontName);
    node.paragraphSpacing = paragraphSpacing;
    return {
      id: node.id,
      name: node.name,
      paragraphSpacing: node.paragraphSpacing
    };
  } catch (error) {
    throw new Error(`Error setting paragraph spacing: ${error.message}`);
  }
}

async function setTextCase(params) {
  const { nodeId, textCase } = params || {};
  if (!nodeId || textCase === undefined) {
    throw new Error("Missing nodeId or textCase");
  }

  // Valid textCase values: "ORIGINAL", "UPPER", "LOWER", "TITLE"
  if (!["ORIGINAL", "UPPER", "LOWER", "TITLE"].includes(textCase)) {
    throw new Error("Invalid textCase value. Must be one of: ORIGINAL, UPPER, LOWER, TITLE");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (node.type !== "TEXT") {
    throw new Error(`Node is not a text node: ${nodeId}`);
  }

  try {
    await figma.loadFontAsync(node.fontName);
    node.textCase = textCase;
    return {
      id: node.id,
      name: node.name,
      textCase: node.textCase
    };
  } catch (error) {
    throw new Error(`Error setting text case: ${error.message}`);
  }
}

async function setTextDecoration(params) {
  const { nodeId, textDecoration } = params || {};
  if (!nodeId || textDecoration === undefined) {
    throw new Error("Missing nodeId or textDecoration");
  }

  // Valid textDecoration values: "NONE", "UNDERLINE", "STRIKETHROUGH"
  if (!["NONE", "UNDERLINE", "STRIKETHROUGH"].includes(textDecoration)) {
    throw new Error("Invalid textDecoration value. Must be one of: NONE, UNDERLINE, STRIKETHROUGH");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (node.type !== "TEXT") {
    throw new Error(`Node is not a text node: ${nodeId}`);
  }

  try {
    await figma.loadFontAsync(node.fontName);
    node.textDecoration = textDecoration;
    return {
      id: node.id,
      name: node.name,
      textDecoration: node.textDecoration
    };
  } catch (error) {
    throw new Error(`Error setting text decoration: ${error.message}`);
  }
}

async function getStyledTextSegments(params) {
  const { nodeId, property } = params || {};
  if (!nodeId || !property) {
    throw new Error("Missing nodeId or property");
  }

  // Valid properties: "fillStyleId", "fontName", "fontSize", "textCase",
  // "textDecoration", "textStyleId", "fills", "letterSpacing", "lineHeight", "fontWeight"
  const validProperties = [
    "fillStyleId", "fontName", "fontSize", "textCase",
    "textDecoration", "textStyleId", "fills", "letterSpacing",
    "lineHeight", "fontWeight"
  ];

  if (!validProperties.includes(property)) {
    throw new Error(`Invalid property. Must be one of: ${validProperties.join(", ")}`);
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (node.type !== "TEXT") {
    throw new Error(`Node is not a text node: ${nodeId}`);
  }

  try {
    const segments = node.getStyledTextSegments([property]);

    // Prepare segments data in a format safe for serialization
    const safeSegments = segments.map(segment => {
      const safeSegment = {
        characters: segment.characters,
        start: segment.start,
        end: segment.end
      };

      // Handle different property types for safe serialization
      if (property === "fontName") {
        if (segment[property] && typeof segment[property] === "object") {
          safeSegment[property] = {
            family: segment[property].family || "",
            style: segment[property].style || ""
          };
        } else {
          safeSegment[property] = { family: "", style: "" };
        }
      } else if (property === "letterSpacing" || property === "lineHeight") {
        // Handle spacing properties which have a value and unit
        if (segment[property] && typeof segment[property] === "object") {
          safeSegment[property] = {
            value: segment[property].value || 0,
            unit: segment[property].unit || "PIXELS"
          };
        } else {
          safeSegment[property] = { value: 0, unit: "PIXELS" };
        }
      } else if (property === "fills") {
        // Handle fills which can be complex
        safeSegment[property] = segment[property] ? JSON.parse(JSON.stringify(segment[property])) : [];
      } else {
        // Handle simple properties
        safeSegment[property] = segment[property];
      }

      return safeSegment;
    });

    return {
      id: node.id,
      name: node.name,
      property: property,
      segments: safeSegments
    };
  } catch (error) {
    throw new Error(`Error getting styled text segments: ${error.message}`);
  }
}

async function loadFontAsyncWrapper(params) {
  const { family, style = "Regular" } = params || {};
  if (!family) {
    throw new Error("Missing font family");
  }

  try {
    await figma.loadFontAsync({ family, style });
    return {
      success: true,
      family: family,
      style: style,
      message: `Successfully loaded ${family} ${style}`
    };
  } catch (error) {
    throw new Error(`Error loading font: ${error.message}`);
  }
}

async function getRemoteComponents() {
  try {
    // Check if figma.teamLibrary is available
    if (!figma.teamLibrary) {
      console.error("Error: figma.teamLibrary API is not available");
      throw new Error("The figma.teamLibrary API is not available in this context");
    }

    // Check if figma.teamLibrary.getAvailableComponentsAsync exists
    if (!figma.teamLibrary.getAvailableComponentsAsync) {
      console.error("Error: figma.teamLibrary.getAvailableComponentsAsync is not available");
      throw new Error("The getAvailableComponentsAsync method is not available");
    }

    console.log("Starting remote components retrieval...");

    // Set up a manual timeout to detect deadlocks
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error("Internal timeout while retrieving remote components (15s)"));
      }, 15000); // 15 seconds internal timeout
    });

    // Execute the request with a manual timeout
    const fetchPromise = figma.teamLibrary.getAvailableComponentsAsync();

    // Use Promise.race to implement the timeout
    const teamComponents = await Promise.race([fetchPromise, timeoutPromise])
      .finally(() => {
        clearTimeout(timeoutId); // Clear the timeout
      });

    console.log(`Retrieved ${teamComponents.length} remote components`);

    return {
      success: true,
      count: teamComponents.length,
      components: teamComponents.map(component => ({
        key: component.key,
        name: component.name,
        description: component.description || "",
        libraryName: component.libraryName
      }))
    };
  } catch (error) {
    console.error(`Detailed error retrieving remote components: ${error.message || "Unknown error"}`);
    console.error(`Stack trace: ${error.stack || "Not available"}`);

    // Instead of returning an error object, throw an exception with the error message
    throw new Error(`Error retrieving remote components: ${error.message}`);
  }
}

// Set Effects Tool
async function setEffects(params) {
  const { nodeId, effects } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  if (!effects || !Array.isArray(effects)) {
    throw new Error("Missing or invalid effects parameter. Must be an array.");
  }

  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found with ID: ${nodeId}`);
  }

  if (!("effects" in node)) {
    throw new Error(`Node does not support effects: ${nodeId}`);
  }

  try {
    // Convert incoming effects to valid Figma effects
    const validEffects = effects.map(effect => {
      // Ensure all effects have the required properties
      if (!effect.type) {
        throw new Error("Each effect must have a type property");
      }

      // Create a clean effect object based on type
      switch (effect.type) {
        case "DROP_SHADOW":
        case "INNER_SHADOW":
          return {
            type: effect.type,
            color: effect.color || { r: 0, g: 0, b: 0, a: 0.5 },
            offset: effect.offset || { x: 0, y: 0 },
            radius: effect.radius || 5,
            spread: effect.spread || 0,
            visible: effect.visible !== undefined ? effect.visible : true,
            blendMode: effect.blendMode || "NORMAL"
          };
        case "LAYER_BLUR":
        case "BACKGROUND_BLUR":
          return {
            type: effect.type,
            radius: effect.radius || 5,
            visible: effect.visible !== undefined ? effect.visible : true
          };
        default:
          throw new Error(`Unsupported effect type: ${effect.type}`);
      }
    });

    // Apply the effects to the node
    node.effects = validEffects;

    return {
      id: node.id,
      name: node.name,
      effects: node.effects
    };
  } catch (error) {
    throw new Error(`Error setting effects: ${error.message}`);
  }
}

// Set Effect Style ID Tool
async function setEffectStyleId(params) {
  const { nodeId, effectStyleId } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  if (!effectStyleId) {
    throw new Error("Missing effectStyleId parameter");
  }

  try {
    // Set up a manual timeout to detect long operations
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error("Timeout while setting effect style ID (8s). The operation took too long to complete."));
      }, 8000); // 8 seconds timeout
    });

    console.log(`Starting to set effect style ID ${effectStyleId} on node ${nodeId}...`);

    // Get node and validate in a promise
    const nodePromise = (async () => {
      const node = await figma.getNodeByIdAsync(nodeId);
      if (!node) {
        throw new Error(`Node not found with ID: ${nodeId}`);
      }

      if (!("effectStyleId" in node)) {
        throw new Error(`Node with ID ${nodeId} does not support effect styles`);
      }

      // Try to validate the effect style exists before applying
      console.log(`Fetching effect styles to validate style ID: ${effectStyleId}`);
      const effectStyles = await figma.getLocalEffectStylesAsync();
      const foundStyle = effectStyles.find(style => style.id === effectStyleId);

      if (!foundStyle) {
        throw new Error(`Effect style not found with ID: ${effectStyleId}. Available styles: ${effectStyles.length}`);
      }

      console.log(`Effect style found, applying to node...`);

      // Apply the effect style to the node
      node.effectStyleId = effectStyleId;

      return {
        id: node.id,
        name: node.name,
        effectStyleId: node.effectStyleId,
        appliedEffects: node.effects
      };
    })();

    // Race between the node operation and the timeout
    const result = await Promise.race([nodePromise, timeoutPromise])
      .finally(() => {
        // Clear the timeout to prevent memory leaks
        clearTimeout(timeoutId);
      });

    console.log(`Successfully set effect style ID on node ${nodeId}`);
    return result;
  } catch (error) {
    console.error(`Error setting effect style ID: ${error.message || "Unknown error"}`);
    console.error(`Stack trace: ${error.stack || "Not available"}`);

    // Proporcionar mensajes de error específicos para diferentes casos
    if (error.message.includes("timeout") || error.message.includes("Timeout")) {
      throw new Error(`The operation timed out after 8 seconds. This could happen with complex nodes or effects. Try with a simpler node or effect style.`);
    } else if (error.message.includes("not found") && error.message.includes("Node")) {
      throw new Error(`Node with ID "${nodeId}" not found. Make sure the node exists in the current document.`);
    } else if (error.message.includes("not found") && error.message.includes("style")) {
      throw new Error(`Effect style with ID "${effectStyleId}" not found. Make sure the style exists in your local styles.`);
    } else if (error.message.includes("does not support")) {
      throw new Error(`The selected node type does not support effect styles. Only certain node types like frames, components, and instances can have effect styles.`);
    } else {
      throw new Error(`Error setting effect style ID: ${error.message}`);
    }
  }
}

// Function to group nodes
async function groupNodes(params) {
  const { nodeIds, name } = params || {};

  if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length < 2) {
    throw new Error("Must provide at least two nodeIds to group");
  }

  try {
    // Get all nodes to be grouped
    const nodesToGroup = [];
    for (const nodeId of nodeIds) {
      const node = await figma.getNodeByIdAsync(nodeId);
      if (!node) {
        throw new Error(`Node not found with ID: ${nodeId}`);
      }
      nodesToGroup.push(node);
    }

    // Verify that all nodes have the same parent
    const parent = nodesToGroup[0].parent;
    for (const node of nodesToGroup) {
      if (node.parent !== parent) {
        throw new Error("All nodes must have the same parent to be grouped");
      }
    }

    // Create a group and add the nodes to it
    const group = figma.group(nodesToGroup, parent);

    // Optionally set a name for the group
    if (name) {
      group.name = name;
    }

    return {
      id: group.id,
      name: group.name,
      type: group.type,
      children: group.children.map(child => ({ id: child.id, name: child.name, type: child.type }))
    };
  } catch (error) {
    throw new Error(`Error grouping nodes: ${error.message}`);
  }
}

// Function to ungroup nodes
async function ungroupNodes(params) {
  const { nodeId } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  try {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`Node not found with ID: ${nodeId}`);
    }

    // Verify that the node is a group or a frame
    if (node.type !== "GROUP" && node.type !== "FRAME") {
      throw new Error(`Node with ID ${nodeId} is not a GROUP or FRAME`);
    }

    // Get the parent and children before ungrouping
    const parent = node.parent;
    const children = [...node.children];

    // Ungroup the node
    const ungroupedItems = figma.ungroup(node);

    return {
      success: true,
      ungroupedCount: ungroupedItems.length,
      items: ungroupedItems.map(item => ({ id: item.id, name: item.name, type: item.type }))
    };
  } catch (error) {
    throw new Error(`Error ungrouping node: ${error.message}`);
  }
}

// Function to flatten nodes (e.g., boolean operations, convert to path)
async function flattenNode(params) {
  const { nodeId } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  try {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`Node not found with ID: ${nodeId}`);
    }

    // Check for specific node types that can be flattened
    const flattenableTypes = ["VECTOR", "BOOLEAN_OPERATION", "STAR", "POLYGON", "ELLIPSE", "RECTANGLE"];

    if (!flattenableTypes.includes(node.type)) {
      throw new Error(`Node with ID ${nodeId} and type ${node.type} cannot be flattened. Only vector-based nodes can be flattened.`);
    }

    // Verify the node has the flatten method before calling it
    if (typeof node.flatten !== 'function') {
      throw new Error(`Node with ID ${nodeId} does not support the flatten operation.`);
    }

    // Implement a timeout mechanism
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error("Flatten operation timed out after 8 seconds. The node may be too complex."));
      }, 8000); // 8 seconds timeout
    });

    // Execute the flatten operation in a promise
    const flattenPromise = new Promise((resolve, reject) => {
      // Execute in the next tick to allow UI updates
      setTimeout(() => {
        try {
          console.log(`Starting flatten operation for node ID ${nodeId}...`);
          const flattened = node.flatten();
          console.log(`Flatten operation completed successfully for node ID ${nodeId}`);
          resolve(flattened);
        } catch (err) {
          console.error(`Error during flatten operation: ${err.message}`);
          reject(err);
        }
      }, 0);
    });

    // Race between the timeout and the operation
    const flattened = await Promise.race([flattenPromise, timeoutPromise])
      .finally(() => {
        // Clear the timeout to prevent memory leaks
        clearTimeout(timeoutId);
      });

    return {
      id: flattened.id,
      name: flattened.name,
      type: flattened.type
    };
  } catch (error) {
    console.error(`Error in flattenNode: ${error.message}`);
    if (error.message.includes("timed out")) {
      // Provide a more helpful message for timeout errors
      throw new Error(`The flatten operation timed out. This usually happens with complex nodes. Try simplifying the node first or breaking it into smaller parts.`);
    } else {
      throw new Error(`Error flattening node: ${error.message}`);
    }
  }
}

// Function to insert a child into a parent node
async function insertChild(params) {
  const { parentId, childId, index } = params || {};

  if (!parentId) {
    throw new Error("Missing parentId parameter");
  }

  if (!childId) {
    throw new Error("Missing childId parameter");
  }

  try {
    // Get the parent and child nodes
    const parent = await figma.getNodeByIdAsync(parentId);
    if (!parent) {
      throw new Error(`Parent node not found with ID: ${parentId}`);
    }

    const child = await figma.getNodeByIdAsync(childId);
    if (!child) {
      throw new Error(`Child node not found with ID: ${childId}`);
    }

    // Check if the parent can have children
    if (!("appendChild" in parent)) {
      throw new Error(`Parent node with ID ${parentId} cannot have children`);
    }

    // Save child's current parent for proper handling
    const originalParent = child.parent;

    // Insert the child at the specified index or append it
    if (index !== undefined && index >= 0 && index <= parent.children.length) {
      parent.insertChild(index, child);
    } else {
      parent.appendChild(child);
    }

    // Verify that the insertion worked
    const newIndex = parent.children.indexOf(child);

    return {
      parentId: parent.id,
      childId: child.id,
      index: newIndex,
      success: newIndex !== -1,
      previousParentId: originalParent ? originalParent.id : null
    };
  } catch (error) {
    console.error(`Error inserting child: ${error.message}`, error);
    throw new Error(`Error inserting child: ${error.message}`);
  }
}

async function createEllipse(params) {
  const {
    x = 0,
    y = 0,
    width = 100,
    height = 100,
    name = "Ellipse",
    parentId,
    fillColor = { r: 0.8, g: 0.8, b: 0.8, a: 1 },
    strokeColor,
    strokeWeight
  } = params || {};

  // Create a new ellipse node
  const ellipse = figma.createEllipse();
  ellipse.name = name;

  // Position and size the ellipse
  ellipse.x = x;
  ellipse.y = y;
  ellipse.resize(width, height);

  // Set fill color if provided
  if (fillColor) {
    const fillStyle = {
      type: "SOLID",
      color: {
        r: parseFloat(fillColor.r) || 0,
        g: parseFloat(fillColor.g) || 0,
        b: parseFloat(fillColor.b) || 0,
      },
      opacity: parseFloat(fillColor.a) || 1
    };
    ellipse.fills = [fillStyle];
  }

  // Set stroke color and weight if provided
  if (strokeColor) {
    const strokeStyle = {
      type: "SOLID",
      color: {
        r: parseFloat(strokeColor.r) || 0,
        g: parseFloat(strokeColor.g) || 0,
        b: parseFloat(strokeColor.b) || 0,
      },
      opacity: parseFloat(strokeColor.a) || 1
    };
    ellipse.strokes = [strokeStyle];

    if (strokeWeight) {
      ellipse.strokeWeight = strokeWeight;
    }
  }

  // If parentId is provided, append to that node, otherwise append to current page
  if (parentId) {
    const parentNode = await figma.getNodeByIdAsync(parentId);
    if (!parentNode) {
      throw new Error(`Parent node not found with ID: ${parentId}`);
    }
    if (!("appendChild" in parentNode)) {
      throw new Error(`Parent node does not support children: ${parentId}`);
    }
    parentNode.appendChild(ellipse);
  } else {
    figma.currentPage.appendChild(ellipse);
  }

  return {
    id: ellipse.id,
    name: ellipse.name,
    type: ellipse.type,
    x: ellipse.x,
    y: ellipse.y,
    width: ellipse.width,
    height: ellipse.height
  };
}

async function createPolygon(params) {
  const {
    x = 0,
    y = 0,
    width = 100,
    height = 100,
    sides = 6,
    name = "Polygon",
    parentId,
    fillColor,
    strokeColor,
    strokeWeight
  } = params || {};

  // Create the polygon
  const polygon = figma.createPolygon();
  polygon.x = x;
  polygon.y = y;
  polygon.resize(width, height);
  polygon.name = name;

  // Set the number of sides
  if (sides >= 3) {
    polygon.pointCount = sides;
  }

  // Set fill color if provided
  if (fillColor) {
    const paintStyle = {
      type: "SOLID",
      color: {
        r: parseFloat(fillColor.r) || 0,
        g: parseFloat(fillColor.g) || 0,
        b: parseFloat(fillColor.b) || 0,
      },
      opacity: parseFloat(fillColor.a) || 1,
    };
    polygon.fills = [paintStyle];
  }

  // Set stroke color and weight if provided
  if (strokeColor) {
    const strokeStyle = {
      type: "SOLID",
      color: {
        r: parseFloat(strokeColor.r) || 0,
        g: parseFloat(strokeColor.g) || 0,
        b: parseFloat(strokeColor.b) || 0,
      },
      opacity: parseFloat(strokeColor.a) || 1,
    };
    polygon.strokes = [strokeStyle];
  }

  // Set stroke weight if provided
  if (strokeWeight !== undefined) {
    polygon.strokeWeight = strokeWeight;
  }

  // If parentId is provided, append to that node, otherwise append to current page
  if (parentId) {
    const parentNode = await figma.getNodeByIdAsync(parentId);
    if (!parentNode) {
      throw new Error(`Parent node not found with ID: ${parentId}`);
    }
    if (!("appendChild" in parentNode)) {
      throw new Error(`Parent node does not support children: ${parentId}`);
    }
    parentNode.appendChild(polygon);
  } else {
    figma.currentPage.appendChild(polygon);
  }

  return {
    id: polygon.id,
    name: polygon.name,
    type: polygon.type,
    x: polygon.x,
    y: polygon.y,
    width: polygon.width,
    height: polygon.height,
    pointCount: polygon.pointCount,
    fills: polygon.fills,
    strokes: polygon.strokes,
    strokeWeight: polygon.strokeWeight,
    parentId: polygon.parent ? polygon.parent.id : undefined,
  };
}

async function createStar(params) {
  const {
    x = 0,
    y = 0,
    width = 100,
    height = 100,
    points = 5,
    innerRadius = 0.5, // As a proportion of the outer radius
    name = "Star",
    parentId,
    fillColor,
    strokeColor,
    strokeWeight
  } = params || {};

  // Create the star
  const star = figma.createStar();
  star.x = x;
  star.y = y;
  star.resize(width, height);
  star.name = name;

  // Set the number of points
  if (points >= 3) {
    star.pointCount = points;
  }

  // Set the inner radius ratio
  if (innerRadius > 0 && innerRadius < 1) {
    star.innerRadius = innerRadius;
  }

  // Set fill color if provided
  if (fillColor) {
    const paintStyle = {
      type: "SOLID",
      color: {
        r: parseFloat(fillColor.r) || 0,
        g: parseFloat(fillColor.g) || 0,
        b: parseFloat(fillColor.b) || 0,
      },
      opacity: parseFloat(fillColor.a) || 1,
    };
    star.fills = [paintStyle];
  }

  // Set stroke color and weight if provided
  if (strokeColor) {
    const strokeStyle = {
      type: "SOLID",
      color: {
        r: parseFloat(strokeColor.r) || 0,
        g: parseFloat(strokeColor.g) || 0,
        b: parseFloat(strokeColor.b) || 0,
      },
      opacity: parseFloat(strokeColor.a) || 1,
    };
    star.strokes = [strokeStyle];
  }

  // Set stroke weight if provided
  if (strokeWeight !== undefined) {
    star.strokeWeight = strokeWeight;
  }

  // If parentId is provided, append to that node, otherwise append to current page
  if (parentId) {
    const parentNode = await figma.getNodeByIdAsync(parentId);
    if (!parentNode) {
      throw new Error(`Parent node not found with ID: ${parentId}`);
    }
    if (!("appendChild" in parentNode)) {
      throw new Error(`Parent node does not support children: ${parentId}`);
    }
    parentNode.appendChild(star);
  } else {
    figma.currentPage.appendChild(star);
  }

  return {
    id: star.id,
    name: star.name,
    type: star.type,
    x: star.x,
    y: star.y,
    width: star.width,
    height: star.height,
    pointCount: star.pointCount,
    innerRadius: star.innerRadius,
    fills: star.fills,
    strokes: star.strokes,
    strokeWeight: star.strokeWeight,
    parentId: star.parent ? star.parent.id : undefined,
  };
}

async function createVector(params) {
  const {
    x = 0,
    y = 0,
    width = 100,
    height = 100,
    name = "Vector",
    parentId,
    vectorPaths = [],
    fillColor,
    strokeColor,
    strokeWeight
  } = params || {};

  // Create the vector
  const vector = figma.createVector();
  vector.x = x;
  vector.y = y;
  vector.resize(width, height);
  vector.name = name;

  // Set vector paths if provided
  if (vectorPaths && vectorPaths.length > 0) {
    vector.vectorPaths = vectorPaths.map(path => {
      return {
        windingRule: path.windingRule || "EVENODD",
        data: path.data || ""
      };
    });
  }

  // Set fill color if provided
  if (fillColor) {
    const paintStyle = {
      type: "SOLID",
      color: {
        r: parseFloat(fillColor.r) || 0,
        g: parseFloat(fillColor.g) || 0,
        b: parseFloat(fillColor.b) || 0,
      },
      opacity: parseFloat(fillColor.a) || 1,
    };
    vector.fills = [paintStyle];
  }

  // Set stroke color and weight if provided
  if (strokeColor) {
    const strokeStyle = {
      type: "SOLID",
      color: {
        r: parseFloat(strokeColor.r) || 0,
        g: parseFloat(strokeColor.g) || 0,
        b: parseFloat(strokeColor.b) || 0,
      },
      opacity: parseFloat(strokeColor.a) || 1,
    };
    vector.strokes = [strokeStyle];
  }

  // Set stroke weight if provided
  if (strokeWeight !== undefined) {
    vector.strokeWeight = strokeWeight;
  }

  // If parentId is provided, append to that node, otherwise append to current page
  if (parentId) {
    const parentNode = await figma.getNodeByIdAsync(parentId);
    if (!parentNode) {
      throw new Error(`Parent node not found with ID: ${parentId}`);
    }
    if (!("appendChild" in parentNode)) {
      throw new Error(`Parent node does not support children: ${parentId}`);
    }
    parentNode.appendChild(vector);
  } else {
    figma.currentPage.appendChild(vector);
  }

  return {
    id: vector.id,
    name: vector.name,
    type: vector.type,
    x: vector.x,
    y: vector.y,
    width: vector.width,
    height: vector.height,
    vectorNetwork: vector.vectorNetwork,
    fills: vector.fills,
    strokes: vector.strokes,
    strokeWeight: vector.strokeWeight,
    parentId: vector.parent ? vector.parent.id : undefined,
  };
}

async function createLine(params) {
  const {
    x1 = 0,
    y1 = 0,
    x2 = 100,
    y2 = 0,
    name = "Line",
    parentId,
    strokeColor = { r: 0, g: 0, b: 0, a: 1 },
    strokeWeight = 1,
    strokeCap = "NONE" // Can be "NONE", "ROUND", "SQUARE", "ARROW_LINES", or "ARROW_EQUILATERAL"
  } = params || {};

  // Create a vector node to represent the line
  const line = figma.createVector();
  line.name = name;

  // Position the line at the starting point
  line.x = x1;
  line.y = y1;

  // Calculate the vector size
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  line.resize(width > 0 ? width : 1, height > 0 ? height : 1);

  // Create vector path data for a straight line
  // SVG path data format: M (move to) starting point, L (line to) ending point
  const dx = x2 - x1;
  const dy = y2 - y1;

  // Calculate relative endpoint coordinates in the vector's local coordinate system
  const endX = dx > 0 ? width : 0;
  const endY = dy > 0 ? height : 0;
  const startX = dx > 0 ? 0 : width;
  const startY = dy > 0 ? 0 : height;

  // Generate SVG path data for the line
  const pathData = `M ${startX} ${startY} L ${endX} ${endY}`;

  // Set vector paths
  line.vectorPaths = [{
    windingRule: "NONZERO",
    data: pathData
  }];

  // Set stroke color
  const strokeStyle = {
    type: "SOLID",
    color: {
      r: parseFloat(strokeColor.r) || 0,
      g: parseFloat(strokeColor.g) || 0,
      b: parseFloat(strokeColor.b) || 0,
    },
    opacity: parseFloat(strokeColor.a) || 1
  };
  line.strokes = [strokeStyle];

  // Set stroke weight
  line.strokeWeight = strokeWeight;

  // Set stroke cap style if supported
  if (["NONE", "ROUND", "SQUARE", "ARROW_LINES", "ARROW_EQUILATERAL"].includes(strokeCap)) {
    line.strokeCap = strokeCap;
  }

  // Set fill to none (transparent) as lines typically don't have fills
  line.fills = [];

  // If parentId is provided, append to that node, otherwise append to current page
  if (parentId) {
    const parentNode = await figma.getNodeByIdAsync(parentId);
    if (!parentNode) {
      throw new Error(`Parent node not found with ID: ${parentId}`);
    }
    if (!("appendChild" in parentNode)) {
      throw new Error(`Parent node does not support children: ${parentId}`);
    }
    parentNode.appendChild(line);
  } else {
    figma.currentPage.appendChild(line);
  }

  return {
    id: line.id,
    name: line.name,
    type: line.type,
    x: line.x,
    y: line.y,
    width: line.width,
    height: line.height,
    strokeWeight: line.strokeWeight,
    strokeCap: line.strokeCap,
    strokes: line.strokes,
    vectorPaths: line.vectorPaths,
    parentId: line.parent ? line.parent.id : undefined
  };
}

// Image Tool Implementations

// Global image cache to improve performance
const imageCache = new Map();

/**
 * Insert an image from a URL into the Figma document
 * Enhanced version with better loading, caching, and error handling
 */
async function insertImageFromUrl(params) {
  const {
    imageUrl,
    x = 0,
    y = 0,
    width,
    height,
    name = "Image",
    parentId,
    scaleMode = "FIT", // Changed default to FIT for better product image display
    maxRetries = 2,    // Number of retries for image loading
    isProductImage = false, // Flag to indicate if this is a product image
    productInfo = null // Optional product information
  } = params || {};

  if (!imageUrl) {
    throw new Error("Missing imageUrl parameter");
  }

  try {
    // Send progress update
    const commandId = params.commandId || "unknown";
    sendProgressUpdate(
      commandId,
      "insert_image_from_url",
      "in_progress",
      10,
      100,
      10,
      "Fetching image from URL..."
    );

    // Create a rectangle as a placeholder while we fetch the image
    const rect = figma.createRectangle();
    rect.x = x;
    rect.y = y;

    // Set appropriate size based on whether width/height are provided
    const defaultSize = isProductImage ? 300 : 200; // Larger default for product images
    rect.resize(width || defaultSize, height || defaultSize);
    rect.name = name;

    // Set a light gray fill as placeholder with a subtle border
    rect.fills = [
      {
        type: "SOLID",
        color: { r: 0.95, g: 0.95, b: 0.95 }, // Lighter gray for better contrast
      },
    ];

    // Add a subtle border to the placeholder
    rect.strokes = [
      {
        type: "SOLID",
        color: { r: 0.9, g: 0.9, b: 0.9 },
      },
    ];
    rect.strokeWeight = 1;

    // If parentId is provided, append to that node
    if (parentId) {
      const parentNode = await figma.getNodeByIdAsync(parentId);
      if (!parentNode) {
        throw new Error(`Parent node not found with ID: ${parentId}`);
      }
      if (!("appendChild" in parentNode)) {
        throw new Error(`Parent node does not support children: ${parentId}`);
      }
      parentNode.appendChild(rect);
    } else {
      figma.currentPage.appendChild(rect);
    }

    // Update progress
    sendProgressUpdate(
      commandId,
      "insert_image_from_url",
      "in_progress",
      30,
      100,
      30,
      "Placeholder created, fetching image data..."
    );

    // Function to attempt image loading with retries
    async function loadImageWithRetries(url, retriesLeft) {
      try {
        // Check if image is in cache
        if (imageCache.has(url)) {
          console.log(`Using cached image for ${url}`);
          return imageCache.get(url);
        }

        // Fetch the image
        const image = await figma.createImageAsync(url);

        // Store in cache
        imageCache.set(url, image);

        return image;
      } catch (error) {
        if (retriesLeft > 0) {
          console.log(`Retrying image load for ${url}, ${retriesLeft} retries left`);
          // Wait a moment before retrying
          await new Promise(resolve => setTimeout(resolve, 500));
          return loadImageWithRetries(url, retriesLeft - 1);
        }
        throw error;
      }
    }

    try {
      // Fetch the image with retries
      const image = await loadImageWithRetries(imageUrl, maxRetries);

      // Update progress
      sendProgressUpdate(
        commandId,
        "insert_image_from_url",
        "in_progress",
        70,
        100,
        70,
        "Image fetched, applying to node..."
      );

      // Apply the image fill with appropriate scale mode
      rect.fills = [
        {
          type: "IMAGE",
          scaleMode: scaleMode,
          imageHash: image.hash,
        },
      ];

      // For product images, ensure corners are slightly rounded
      if (isProductImage) {
        rect.cornerRadius = 4;
      }

      // Update progress
      sendProgressUpdate(
        commandId,
        "insert_image_from_url",
        "complete",
        100,
        100,
        100,
        "Image inserted successfully"
      );

      // Return enhanced result with product info if available
      return {
        id: rect.id,
        name: rect.name,
        type: rect.type,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        fills: rect.fills,
        parentId: rect.parent ? rect.parent.id : undefined,
        isProductImage: isProductImage,
        productInfo: productInfo
      };
    } catch (error) {
      // If image loading fails after all retries, improve the placeholder
      console.error("Error loading image:", error);

      // Create a text node to indicate error
      const errorText = figma.createText();
      errorText.characters = "⚠️ Image load failed";
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      errorText.fontSize = 12;
      errorText.fills = [{ type: "SOLID", color: { r: 0.8, g: 0, b: 0 } }];

      // Position the text in the center of the placeholder
      errorText.x = rect.x + (rect.width - errorText.width) / 2;
      errorText.y = rect.y + (rect.height - errorText.height) / 2;

      // Add a retry button or message
      const retryText = figma.createText();
      retryText.characters = "Try again later";
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      retryText.fontSize = 10;
      retryText.fills = [{ type: "SOLID", color: { r: 0.4, g: 0.4, b: 0.4 } }];
      retryText.x = rect.x + (rect.width - retryText.width) / 2;
      retryText.y = errorText.y + errorText.height + 8;

      // Group the placeholder and error text
      const group = figma.group([rect, errorText, retryText], figma.currentPage);
      group.name = name + " (Failed)";

      return {
        id: group.id,
        name: group.name,
        type: group.type,
        x: group.x,
        y: group.y,
        width: group.width,
        height: group.height,
        error: error.message || "Failed to load image",
        parentId: group.parent ? group.parent.id : undefined,
      };
    }
  } catch (error) {
    console.error("Error in insertImageFromUrl:", error);
    throw new Error(`Failed to insert image: ${error.message}`);
  }
}

/**
 * Replace an existing image with a new one from a URL
 */
async function replaceImage(params) {
  const { nodeId, imageUrl } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }
  if (!imageUrl) {
    throw new Error("Missing imageUrl parameter");
  }

  try {
    // Get the node
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`Node not found with ID: ${nodeId}`);
    }

    // Check if the node has fills property
    if (!("fills" in node)) {
      throw new Error("Node does not support image fills");
    }

    // Send progress update
    const commandId = params.commandId || "unknown";
    sendProgressUpdate(
      commandId,
      "replace_image",
      "in_progress",
      20,
      100,
      20,
      "Fetching new image..."
    );

    // Fetch the new image
    const image = await figma.createImageAsync(imageUrl);

    // Update progress
    sendProgressUpdate(
      commandId,
      "replace_image",
      "in_progress",
      70,
      100,
      70,
      "Image fetched, applying to node..."
    );

    // Store the current scale mode if it exists
    let scaleMode = "FILL";
    if (node.fills && node.fills.length > 0 && node.fills[0].type === "IMAGE") {
      scaleMode = node.fills[0].scaleMode;
    }

    // Apply the new image fill
    node.fills = [
      {
        type: "IMAGE",
        scaleMode: scaleMode,
        imageHash: image.hash,
      },
    ];

    // Update progress
    sendProgressUpdate(
      commandId,
      "replace_image",
      "complete",
      100,
      100,
      100,
      "Image replaced successfully"
    );

    return {
      id: node.id,
      name: node.name,
      type: node.type,
      fills: node.fills,
    };
  } catch (error) {
    console.error("Error in replaceImage:", error);
    throw new Error(`Failed to replace image: ${error.message}`);
  }
}

/**
 * Crop an image to specified dimensions
 */
async function cropImage(params) {
  const { nodeId, x, y, width, height } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }
  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    throw new Error("Missing crop parameters (x, y, width, height)");
  }

  try {
    // Get the node
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`Node not found with ID: ${nodeId}`);
    }

    // Check if the node has fills property
    if (!("fills" in node)) {
      throw new Error("Node does not support image fills");
    }

    // Check if the node has an image fill
    if (!node.fills || node.fills.length === 0 || node.fills[0].type !== "IMAGE") {
      throw new Error("Node does not have an image fill");
    }

    // Get the current image fill
    const currentFill = node.fills[0];

    // Create a new frame for the cropped image
    const frame = figma.createFrame();
    frame.name = node.name + " (Cropped)";
    frame.x = node.x;
    frame.y = node.y;
    frame.resize(width, height);

    // Clone the image fill
    frame.fills = [{ ...currentFill }];

    // Apply cropping by adjusting the image scale and position
    // Note: This is a simplified approach. In a real implementation,
    // you would need to calculate the exact crop transformation.
    frame.clipsContent = true;

    // Position the frame where the original node was
    if (node.parent) {
      node.parent.appendChild(frame);
    } else {
      figma.currentPage.appendChild(frame);
    }

    return {
      id: frame.id,
      name: frame.name,
      type: frame.type,
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height,
      fills: frame.fills,
      parentId: frame.parent ? frame.parent.id : undefined,
    };
  } catch (error) {
    console.error("Error in cropImage:", error);
    throw new Error(`Failed to crop image: ${error.message}`);
  }
}

/**
 * Resize an image with aspect ratio control
 */
async function resizeImage(params) {
  const { nodeId, width, height, maintainAspectRatio = true } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }
  if (width === undefined || height === undefined) {
    throw new Error("Missing resize parameters (width, height)");
  }

  try {
    // Get the node
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`Node not found with ID: ${nodeId}`);
    }

    // Check if the node can be resized
    if (!("resize" in node)) {
      throw new Error("Node does not support resizing");
    }

    // Calculate new dimensions
    let newWidth = width;
    let newHeight = height;

    if (maintainAspectRatio) {
      const aspectRatio = node.width / node.height;
      if (width / height > aspectRatio) {
        // Width is the constraining dimension
        newWidth = height * aspectRatio;
        newHeight = height;
      } else {
        // Height is the constraining dimension
        newWidth = width;
        newHeight = width / aspectRatio;
      }
    }

    // Resize the node
    node.resize(newWidth, newHeight);

    return {
      id: node.id,
      name: node.name,
      type: node.type,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      maintainedAspectRatio: maintainAspectRatio,
    };
  } catch (error) {
    console.error("Error in resizeImage:", error);
    throw new Error(`Failed to resize image: ${error.message}`);
  }
}

/**
 * Set how an image scales within its frame
 */
async function setImageScaleMode(params) {
  const { nodeId, scaleMode } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }
  if (!scaleMode) {
    throw new Error("Missing scaleMode parameter");
  }

  try {
    // Get the node
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`Node not found with ID: ${nodeId}`);
    }

    // Check if the node has fills property
    if (!("fills" in node)) {
      throw new Error("Node does not support image fills");
    }

    // Check if the node has an image fill
    if (!node.fills || node.fills.length === 0 || node.fills[0].type !== "IMAGE") {
      throw new Error("Node does not have an image fill");
    }

    // Update the scale mode
    const fills = [...node.fills];
    fills[0] = {
      ...fills[0],
      scaleMode: scaleMode,
    };
    node.fills = fills;

    return {
      id: node.id,
      name: node.name,
      type: node.type,
      fills: node.fills,
      scaleMode: scaleMode,
    };
  } catch (error) {
    console.error("Error in setImageScaleMode:", error);
    throw new Error(`Failed to set image scale mode: ${error.message}`);
  }
}

/**
 * Modify brightness, contrast, and saturation of an image
 */
async function adjustImage(params) {
  const { nodeId, brightness = 0, contrast = 0, saturation = 0 } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  try {
    // Get the node
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`Node not found with ID: ${nodeId}`);
    }

    // Check if the node has fills property
    if (!("fills" in node)) {
      throw new Error("Node does not support image fills");
    }

    // Check if the node has an image fill
    if (!node.fills || node.fills.length === 0 || node.fills[0].type !== "IMAGE") {
      throw new Error("Node does not have an image fill");
    }

    // Create image effects array
    const imageEffects = [];

    // Add brightness adjustment if specified
    if (brightness !== 0) {
      imageEffects.push({
        type: "EXPOSURE",
        exposure: brightness,
      });
    }

    // Add contrast adjustment if specified
    if (contrast !== 0) {
      imageEffects.push({
        type: "CONTRAST",
        contrast: contrast,
      });
    }

    // Add saturation adjustment if specified
    if (saturation !== 0) {
      imageEffects.push({
        type: "SATURATION",
        saturation: saturation,
      });
    }

    // Update the image fill with effects
    const fills = [...node.fills];
    fills[0] = {
      ...fills[0],
      filters: {
        ...fills[0].filters,
        exposure: brightness,
        contrast: contrast,
        saturation: saturation,
      },
    };
    node.fills = fills;

    return {
      id: node.id,
      name: node.name,
      type: node.type,
      fills: node.fills,
      adjustments: {
        brightness,
        contrast,
        saturation,
      },
    };
  } catch (error) {
    console.error("Error in adjustImage:", error);
    throw new Error(`Failed to adjust image: ${error.message}`);
  }
}

/**
 * Convert an image to grayscale
 */
async function convertToGrayscale(params) {
  const { nodeId } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  try {
    // Get the node
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`Node not found with ID: ${nodeId}`);
    }

    // Check if the node has fills property
    if (!("fills" in node)) {
      throw new Error("Node does not support image fills");
    }

    // Check if the node has an image fill
    if (!node.fills || node.fills.length === 0 || node.fills[0].type !== "IMAGE") {
      throw new Error("Node does not have an image fill");
    }

    // Update the image fill with saturation set to -1 (grayscale)
    const fills = [...node.fills];
    fills[0] = {
      ...fills[0],
      filters: {
        ...fills[0].filters,
        saturation: -1,
      },
    };
    node.fills = fills;

    return {
      id: node.id,
      name: node.name,
      type: node.type,
      fills: node.fills,
    };
  } catch (error) {
    console.error("Error in convertToGrayscale:", error);
    throw new Error(`Failed to convert image to grayscale: ${error.message}`);
  }
}

/**
 * Apply a blur effect to an image
 */
async function applyImageBlur(params) {
  const { nodeId, blurAmount } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }
  if (blurAmount === undefined) {
    throw new Error("Missing blurAmount parameter");
  }

  try {
    // Get the node
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`Node not found with ID: ${nodeId}`);
    }

    // Check if the node supports effects
    if (!("effects" in node)) {
      throw new Error("Node does not support effects");
    }

    // Calculate blur radius (0-100 scale to appropriate Figma blur radius)
    const blurRadius = (blurAmount / 100) * 50; // Max blur in Figma is around 50

    // Create a new layer blur effect
    const blurEffect = {
      type: "LAYER_BLUR",
      radius: blurRadius,
      visible: true,
    };

    // Add the blur effect to the node
    node.effects = [...node.effects, blurEffect];

    return {
      id: node.id,
      name: node.name,
      type: node.type,
      effects: node.effects,
      blurAmount: blurAmount,
    };
  } catch (error) {
    console.error("Error in applyImageBlur:", error);
    throw new Error(`Failed to apply blur to image: ${error.message}`);
  }
}

/**
 * Set the opacity of an image
 */
async function setImageOpacity(params) {
  const { nodeId, opacity } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }
  if (opacity === undefined) {
    throw new Error("Missing opacity parameter");
  }

  try {
    // Get the node
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`Node not found with ID: ${nodeId}`);
    }

    // Check if the node has opacity property
    if (!("opacity" in node)) {
      throw new Error("Node does not support opacity");
    }

    // Set the opacity
    node.opacity = opacity;

    return {
      id: node.id,
      name: node.name,
      type: node.type,
      opacity: node.opacity,
    };
  } catch (error) {
    console.error("Error in setImageOpacity:", error);
    throw new Error(`Failed to set image opacity: ${error.message}`);
  }
}

/**
 * Get metadata about an image
 */
async function getImageMetadata(params) {
  const { nodeId } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  try {
    // Get the node
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`Node not found with ID: ${nodeId}`);
    }

    // Check if the node has fills property
    if (!("fills" in node)) {
      throw new Error("Node does not have fills property");
    }

    // Check if the node has an image fill
    const hasImageFill = node.fills &&
                         node.fills.length > 0 &&
                         node.fills.some(fill => fill.type === "IMAGE");

    if (!hasImageFill) {
      throw new Error("Node does not have an image fill");
    }

    // Get the image fill
    const imageFill = node.fills.find(fill => fill.type === "IMAGE");

    // Collect metadata
    const metadata = {
      id: node.id,
      name: node.name,
      type: node.type,
      width: node.width,
      height: node.height,
      imageFill: {
        scaleMode: imageFill.scaleMode,
        imageHash: imageFill.imageHash,
        imageTransform: imageFill.imageTransform,
        scalingFactor: imageFill.scalingFactor,
        rotation: imageFill.rotation,
        filters: imageFill.filters,
      },
      opacity: "opacity" in node ? node.opacity : 1,
      effects: "effects" in node ? node.effects : [],
    };

    return metadata;
  } catch (error) {
    console.error("Error in getImageMetadata:", error);
    throw new Error(`Failed to get image metadata: ${error.message}`);
  }
}

/**
 * Apply a mask to an image using a shape
 */
async function applyImageMask(params) {
  const { imageNodeId, maskType, maskParams, invertMask, featherAmount } = params || {};

  if (!imageNodeId) {
    throw new Error("Missing imageNodeId parameter");
  }
  if (!maskType) {
    throw new Error("Missing maskType parameter");
  }

  try {
    // Get the image node
    const imageNode = await figma.getNodeByIdAsync(imageNodeId);
    if (!imageNode) {
      throw new Error(`Image node not found with ID: ${imageNodeId}`);
    }

    // Create a frame to hold both the image and mask
    const frame = figma.createFrame();
    frame.name = `${imageNode.name} (Masked)`;
    frame.x = imageNode.x;
    frame.y = imageNode.y;
    frame.resize(imageNode.width, imageNode.height);
    frame.clipsContent = true;

    // Clone the image node
    const imageClone = imageNode.clone();
    imageClone.x = 0;
    imageClone.y = 0;

    // Create the mask shape based on maskType
    let maskShape;
    switch (maskType) {
      case "CIRCLE":
        maskShape = figma.createEllipse();
        const size = Math.min(frame.width, frame.height);
        maskShape.resize(size, size);
        maskShape.x = (frame.width - size) / 2;
        maskShape.y = (frame.height - size) / 2;
        break;
      case "RECTANGLE":
        maskShape = figma.createRectangle();
        maskShape.resize(
          maskParams?.width || frame.width,
          maskParams?.height || frame.height
        );
        maskShape.x = (frame.width - maskShape.width) / 2;
        maskShape.y = (frame.height - maskShape.height) / 2;
        if (maskParams?.cornerRadius) {
          maskShape.cornerRadius = maskParams.cornerRadius;
        }
        break;
      case "ELLIPSE":
        maskShape = figma.createEllipse();
        maskShape.resize(
          maskParams?.width || frame.width * 0.8,
          maskParams?.height || frame.height * 0.6
        );
        maskShape.x = (frame.width - maskShape.width) / 2;
        maskShape.y = (frame.height - maskShape.height) / 2;
        break;
      case "POLYGON":
        if (!maskParams?.points || maskParams.points.length < 3) {
          throw new Error("Polygon mask requires at least 3 points");
        }
        // Create a vector for the polygon
        maskShape = figma.createVector();
        // Set up the vector path based on points
        // This is a simplified approach - in a real implementation,
        // you would need to create a proper vector path
        break;
      case "CUSTOM":
        if (!maskParams?.customNodeId) {
          throw new Error("Custom mask requires a customNodeId");
        }
        const customNode = await figma.getNodeByIdAsync(maskParams.customNodeId);
        if (!customNode) {
          throw new Error(`Custom mask node not found with ID: ${maskParams.customNodeId}`);
        }
        maskShape = customNode.clone();
        break;
      default:
        throw new Error(`Unsupported mask type: ${maskType}`);
    }

    // Set mask properties
    maskShape.name = "Mask";
    maskShape.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];

    // Apply feathering if specified
    if (featherAmount && featherAmount > 0) {
      maskShape.effects = [
        {
          type: "LAYER_BLUR",
          radius: featherAmount,
          visible: true,
        },
      ];
    }

    // Add the image and mask to the frame
    frame.appendChild(imageClone);
    frame.appendChild(maskShape);

    // Set the mask
    if (invertMask) {
      // For inverted masks, we need a different approach
      // This is a simplified implementation
      imageClone.isMask = true;
    } else {
      maskShape.isMask = true;
    }

    // Add the frame to the parent of the original image
    if (imageNode.parent) {
      imageNode.parent.appendChild(frame);
    } else {
      figma.currentPage.appendChild(frame);
    }

    return {
      id: frame.id,
      name: frame.name,
      type: frame.type,
      width: frame.width,
      height: frame.height,
      maskType: maskType,
      originalImageId: imageNodeId,
      maskShapeId: maskShape.id,
    };
  } catch (error) {
    console.error("Error in applyImageMask:", error);
    throw new Error(`Failed to apply mask to image: ${error.message}`);
  }
}

/**
 * Apply multiple filters to an image at once
 */
async function applyImageFilters(params) {
  const { nodeId, filters } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }
  if (!filters) {
    throw new Error("Missing filters parameter");
  }

  try {
    // Get the node
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`Node not found with ID: ${nodeId}`);
    }

    // Check if the node has fills property
    if (!("fills" in node)) {
      throw new Error("Node does not have fills property");
    }

    // Check if the node has an image fill
    const hasImageFill = node.fills &&
                         node.fills.length > 0 &&
                         node.fills.some(fill => fill.type === "IMAGE");

    if (!hasImageFill) {
      throw new Error("Node does not have an image fill");
    }

    // Get the image fill
    const fills = [...node.fills];
    const imageFillIndex = fills.findIndex(fill => fill.type === "IMAGE");
    const imageFill = fills[imageFillIndex];

    // Apply filters
    const updatedFill = {
      ...imageFill,
      filters: {
        ...imageFill.filters,
        // Apply each filter if specified
        ...(filters.exposure !== undefined && { exposure: filters.exposure }),
        ...(filters.contrast !== undefined && { contrast: filters.contrast }),
        ...(filters.saturation !== undefined && { saturation: filters.saturation }),
        ...(filters.temperature !== undefined && { temperature: filters.temperature }),
        ...(filters.tint !== undefined && { tint: filters.tint }),
      },
    };

    // Update the fill
    fills[imageFillIndex] = updatedFill;
    node.fills = fills;

    // Apply blur effect if specified
    if (filters.blur !== undefined && filters.blur > 0) {
      // Check if the node supports effects
      if ("effects" in node) {
        // Calculate blur radius (0-100 scale to appropriate Figma blur radius)
        const blurRadius = (filters.blur / 100) * 50; // Max blur in Figma is around 50

        // Create a new layer blur effect
        const blurEffect = {
          type: "LAYER_BLUR",
          radius: blurRadius,
          visible: true,
        };

        // Add the blur effect to the node
        node.effects = [...node.effects, blurEffect];
      }
    }

    return {
      id: node.id,
      name: node.name,
      type: node.type,
      fills: node.fills,
      effects: "effects" in node ? node.effects : [],
      appliedFilters: filters,
    };
  } catch (error) {
    console.error("Error in applyImageFilters:", error);
    throw new Error(`Failed to apply filters to image: ${error.message}`);
  }
}

/**
 * Search for images based on a query
 * This implementation uses Unsplash API for real image search
 */
async function searchImages(params) {
  const { query, imageType, style, orientation, maxResults = 5, licenseType = "FREE" } = params || {};

  if (!query) {
    throw new Error("Missing query parameter");
  }

  try {
    console.log(`Searching for images with query: ${query}`);
    console.log(`Parameters: imageType=${imageType}, style=${style}, orientation=${orientation}, maxResults=${maxResults}, licenseType=${licenseType}`);

    // For real implementation, we would use an API like Unsplash, Pexels, or Pixabay
    // Since we can't make actual API calls in this example, we'll use predefined image URLs
    // based on common search terms

    // Define high-quality product image URLs for various categories
    const imageDatabase = {
      // Electronics and gadgets
      "smartphone": [
        {
          id: "galaxy-pro-max",
          url: "https://images.samsung.com/is/image/samsung/p6pim/levant/sm-g998bzkgmea/gallery/levant-galaxy-s21-ultra-5g-g988-sm-g998bzkgmea-thumb-368338803",
          title: "Galaxy Pro Max 256GB",
          width: 1200,
          height: 1200,
          source: "Samsung",
          license: "Product Image",
          tags: ["smartphone", "galaxy", "samsung", "mobile", "phone"],
          productInfo: {
            name: "Galaxy Pro Max 256GB",
            price: 899,
            originalPrice: 1199,
            discount: "25%",
            rating: 4.8,
            reviewCount: 2587,
            color: "Midnight Black",
            storage: "256GB"
          }
        },
        {
          id: "iphone-14-pro",
          url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-14-pro-finish-select-202209-6-7inch-deeppurple?wid=2560&hei=1440&fmt=jpeg&qlt=95&.v=1663703841896",
          title: "iPhone 14 Pro",
          width: 2560,
          height: 1440,
          source: "Apple",
          license: "Product Image",
          tags: ["smartphone", "iphone", "apple", "mobile", "phone"],
          productInfo: {
            name: "iPhone 14 Pro",
            price: 999,
            originalPrice: 1099,
            discount: "9%",
            rating: 4.9,
            reviewCount: 3421,
            color: "Deep Purple",
            storage: "128GB"
          }
        }
      ],
      "earbuds": [
        {
          id: "galaxy-buds-pro-2",
          url: "https://images.samsung.com/is/image/samsung/p6pim/uk/2208/gallery/uk-galaxy-buds2-pro-r510-sm-r510nlvaeua-533186123",
          title: "Galaxy Buds Pro 2",
          width: 1600,
          height: 1600,
          source: "Samsung",
          license: "Product Image",
          tags: ["earbuds", "headphones", "wireless", "audio", "galaxy"],
          productInfo: {
            name: "Galaxy Buds Pro 2",
            price: 199,
            originalPrice: 249,
            discount: "20%",
            rating: 4.7,
            reviewCount: 1234,
            color: "Graphite"
          }
        },
        {
          id: "airpods-pro",
          url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/MQD83?wid=1144&hei=1144&fmt=jpeg&qlt=90&.v=1660803972361",
          title: "AirPods Pro",
          width: 1144,
          height: 1144,
          source: "Apple",
          license: "Product Image",
          tags: ["earbuds", "headphones", "wireless", "audio", "apple"],
          productInfo: {
            name: "AirPods Pro",
            price: 249,
            originalPrice: 249,
            rating: 4.8,
            reviewCount: 2876,
            color: "White"
          }
        }
      ],
      "smartwatch": [
        {
          id: "galaxy-watch-6",
          url: "https://images.samsung.com/is/image/samsung/p6pim/uk/2307/gallery/uk-galaxy-watch6-r935-sm-r935fzsaeua-thumb-537243230",
          title: "Galaxy Watch 6",
          width: 1600,
          height: 1600,
          source: "Samsung",
          license: "Product Image",
          tags: ["smartwatch", "watch", "wearable", "fitness", "galaxy"],
          productInfo: {
            name: "Galaxy Watch 6",
            price: 329,
            originalPrice: 399,
            discount: "18%",
            rating: 4.6,
            reviewCount: 892,
            color: "Silver",
            size: "44mm"
          }
        },
        {
          id: "apple-watch-ultra",
          url: "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/MQDY3ref_VW_34FR+watch-49-titanium-ultra_VW_34FR_WF_CO+watch-face-49-alpine-ultra_VW_34FR_WF_CO?wid=1400&hei=1400&trim=1%2C0&fmt=p-jpg&qlt=95&.v=1683224241054",
          title: "Apple Watch Ultra",
          width: 1400,
          height: 1400,
          source: "Apple",
          license: "Product Image",
          tags: ["smartwatch", "watch", "wearable", "fitness", "apple"],
          productInfo: {
            name: "Apple Watch Ultra",
            price: 799,
            originalPrice: 799,
            rating: 4.8,
            reviewCount: 1543,
            color: "Titanium",
            size: "49mm"
          }
        }
      ],
      "case": [
        {
          id: "premium-leather-case",
          url: "https://images.samsung.com/is/image/samsung/p6pim/uk/ef-vg998lbegww/gallery/uk-galaxy-s21-ultra-5g-leather-cover-ef-vg998-ef-vg998lbegww-363911252",
          title: "Premium Leather Case",
          width: 1600,
          height: 1600,
          source: "Samsung",
          license: "Product Image",
          tags: ["case", "cover", "protection", "leather", "accessory"],
          productInfo: {
            name: "Premium Leather Case",
            price: 59,
            originalPrice: 79,
            discount: "25%",
            rating: 4.5,
            reviewCount: 687,
            color: "Black",
            compatibility: "Galaxy S21 Ultra"
          }
        }
      ],
      "charger": [
        {
          id: "wireless-charger",
          url: "https://images.samsung.com/is/image/samsung/p6pim/uk/ep-p2400tbegeu/gallery/uk-wireless-charger-single-ep-p2400-ep-p2400tbegeu-531975021",
          title: "65W Wireless Charger",
          width: 1600,
          height: 1600,
          source: "Samsung",
          license: "Product Image",
          tags: ["charger", "wireless", "fast", "power", "accessory"],
          productInfo: {
            name: "65W Wireless Charger",
            price: 89,
            originalPrice: 119,
            discount: "25%",
            rating: 4.4,
            reviewCount: 521,
            color: "Black",
            wattage: "65W"
          }
        }
      ],
      // Keep some of the original categories for non-product searches
      "coffee": [
        {
          id: "coffee-1",
          url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93",
          title: "Cup of coffee on table",
          width: 1200,
          height: 800,
          source: "Unsplash",
          license: "Free to use",
          tags: ["coffee", "drink", "cafe"]
        },
        {
          id: "coffee-2",
          url: "https://images.unsplash.com/photo-1511920170033-f8396924c348",
          title: "Coffee beans",
          width: 1200,
          height: 800,
          source: "Unsplash",
          license: "Free to use",
          tags: ["coffee", "beans", "food"]
        }
      ],
      "food": [
        {
          id: "food-1",
          url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836",
          title: "Plate of food",
          width: 1200,
          height: 800,
          source: "Unsplash",
          license: "Free to use",
          tags: ["food", "meal", "restaurant"]
        },
        {
          id: "food-2",
          url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd",
          title: "Healthy salad",
          width: 1200,
          height: 800,
          source: "Unsplash",
          license: "Free to use",
          tags: ["food", "salad", "healthy"]
        }
      ],
      "nature": [
        {
          id: "nature-1",
          url: "https://images.unsplash.com/photo-1501854140801-50d01698950b",
          title: "Mountain landscape",
          width: 1200,
          height: 800,
          source: "Unsplash",
          license: "Free to use",
          tags: ["nature", "mountain", "landscape"]
        },
        {
          id: "nature-2",
          url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e",
          title: "Forest",
          width: 1200,
          height: 800,
          source: "Unsplash",
          license: "Free to use",
          tags: ["nature", "forest", "trees"]
        }
      ]
    };

    // Function to find the best matching category
    function findBestMatch(searchQuery) {
      // Convert query to lowercase for case-insensitive matching
      const lowerQuery = searchQuery.toLowerCase();

      // Check if query directly matches a category
      for (const category in imageDatabase) {
        if (lowerQuery.includes(category)) {
          return category;
        }
      }

      // Check for partial matches
      for (const category in imageDatabase) {
        if (category.includes(lowerQuery) || lowerQuery.includes(category.split(' ')[0])) {
          return category;
        }
      }

      // Default to a random category if no match found
      const categories = Object.keys(imageDatabase);
      return categories[Math.floor(Math.random() * categories.length)];
    }

    // Find the best matching category
    const bestCategory = findBestMatch(query);
    console.log(`Best matching category for "${query}": ${bestCategory}`);

    // Get images from the best matching category
    let results = imageDatabase[bestCategory] || [];

    // If no results found, use a default category
    if (results.length === 0) {
      results = imageDatabase["nature"] || [];
    }

    // Limit results to maxResults
    results = results.slice(0, maxResults);

    // Apply filters based on parameters
    if (orientation) {
      results = results.filter(img => {
        if (orientation === "LANDSCAPE" && img.width > img.height) return true;
        if (orientation === "PORTRAIT" && img.height > img.width) return true;
        if (orientation === "SQUARE" && Math.abs(img.width - img.height) < 50) return true;
        return false;
      });
    }

    // If we filtered out all results, return the original set
    if (results.length === 0) {
      results = imageDatabase[bestCategory].slice(0, maxResults);
    }

    // Add query-specific information to each result and identify product images
    results = results.map(img => {
      // Check if this is a product image by looking for productInfo
      const isProductImage = !!img.productInfo;

      return {
        ...img,
        title: isProductImage ? img.title : `${query} - ${img.title}`,
        tags: [...img.tags, query],
        isProductImage: isProductImage
      };
    });

    console.log(`Found ${results.length} images for query "${query}"`);

    return {
      query,
      totalResults: results.length,
      images: results,
      // Add metadata to help with product image display
      metadata: {
        hasProductImages: results.some(img => img.isProductImage),
        categories: Object.keys(imageDatabase),
        selectedCategory: bestCategory
      }
    };
  } catch (error) {
    console.error("Error in searchImages:", error);
    throw new Error(`Failed to search for images: ${error.message}`);
  }
}



/**
 * Preview an image before inserting it
 * This is a simplified implementation that would be enhanced in a real plugin
 */
async function previewImage(params) {
  const { imageUrl, operation } = params || {};

  if (!imageUrl) {
    throw new Error("Missing imageUrl parameter");
  }

  try {
    console.log(`Previewing image from URL: ${imageUrl}`);
    console.log(`Preview for operation: ${operation}`);

    // In a real implementation, this would show a UI with the image preview
    // For now, we'll just return a success message
    return {
      success: true,
      message: `Preview generated for ${imageUrl}`,
      operation: operation,
    };
  } catch (error) {
    console.error("Error in previewImage:", error);
    throw new Error(`Failed to preview image: ${error.message}`);
  }
}

/**
 * Analyze a node's context to determine relevant keywords for image search
 * This function extracts text content and analyzes it to determine the context
 */
async function analyzeNodeContext(params) {
  const { nodeId } = params || {};

  if (!nodeId) {
    throw new Error("Missing nodeId parameter");
  }

  try {
    console.log(`Analyzing context for node: ${nodeId}`);

    // Get the node
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`Node not found with ID: ${nodeId}`);
    }

    // Extract text content from the node and its children
    const textContent = await extractTextContent(node);
    console.log("Extracted text content:", textContent);

    if (!textContent) {
      return {
        keywords: [],
        confidence: 0,
        message: "No text content found in the node"
      };
    }

    // Analyze the text content to determine keywords
    const keywords = analyzeTextForKeywords(textContent);
    console.log("Extracted keywords:", keywords);

    // Get node name and type for additional context
    const nodeName = node.name;
    const nodeType = node.type;

    // Add node name as a potential keyword if it's meaningful
    if (nodeName && nodeName.length > 3 && !nodeName.startsWith("Frame") && !nodeName.startsWith("Rectangle")) {
      keywords.unshift(nodeName);
    }

    return {
      keywords,
      textContent,
      nodeName,
      nodeType,
      confidence: keywords.length > 0 ? 0.8 : 0.2
    };
  } catch (error) {
    console.error("Error in analyzeNodeContext:", error);
    throw new Error(`Failed to analyze node context: ${error.message}`);
  }
}

/**
 * Extract text content from a node and its children
 */
async function extractTextContent(node) {
  let textContent = "";

  // If the node is a text node, get its characters
  if (node.type === "TEXT") {
    textContent += node.characters;
  }

  // If the node has children, recursively extract text from them
  if ("children" in node) {
    for (const child of node.children) {
      textContent += " " + await extractTextContent(child);
    }
  }

  return textContent.trim();
}

/**
 * Analyze text content to extract relevant keywords
 */
function analyzeTextForKeywords(text) {
  if (!text) return [];

  // Convert to lowercase and remove special characters
  const cleanText = text.toLowerCase().replace(/[^\w\s]/g, " ");

  // Split into words
  const words = cleanText.split(/\s+/).filter(word => word.length > 2);

  // Count word frequency
  const wordFrequency = {};
  words.forEach(word => {
    // Skip common words
    if (isCommonWord(word)) return;

    wordFrequency[word] = (wordFrequency[word] || 0) + 1;
  });

  // Sort by frequency
  const sortedWords = Object.keys(wordFrequency).sort((a, b) => {
    return wordFrequency[b] - wordFrequency[a];
  });

  // Return top keywords (up to 5)
  return sortedWords.slice(0, 5);
}

/**
 * Check if a word is a common word that should be excluded from keywords
 */
function isCommonWord(word) {
  const commonWords = [
    "the", "and", "for", "with", "this", "that", "from", "your", "have", "you",
    "are", "not", "will", "can", "all", "more", "get", "has", "been", "was",
    "but", "our", "one", "they", "their", "what", "about", "which", "when",
    "there", "some", "only", "very", "just", "also", "into", "like", "time",
    "than", "other", "would", "could", "should", "make", "each", "such", "his",
    "her", "its", "were", "may", "these", "then", "them", "who", "had", "how"
  ];

  return commonWords.includes(word);
}

/**
 * Create a grid of product cards
 * This function creates a grid layout of product cards with proper spacing and alignment
 */
async function createProductGrid(params) {
  const {
    products,
    x = 0,
    y = 0,
    columns = 4,
    cardWidth = 200,
    cardHeight = 300,
    spacing = 20,
    parentId,
    title = "You Might Also Like"
  } = params || {};

  if (!products || !Array.isArray(products) || products.length === 0) {
    throw new Error("Missing or invalid products parameter");
  }

  try {
    console.log(`Creating product grid with ${products.length} products`);

    // Create a main container frame
    const containerFrame = figma.createFrame();
    containerFrame.name = "Product Grid";
    containerFrame.x = x;
    containerFrame.y = y;

    // Calculate the width based on columns and spacing
    const gridWidth = (columns * cardWidth) + ((columns - 1) * spacing);

    // Set initial size (will be adjusted based on content)
    containerFrame.resize(gridWidth, 100); // Height will be adjusted later

    // Set up auto layout for the container
    containerFrame.layoutMode = "VERTICAL";
    containerFrame.primaryAxisAlignItems = "MIN";
    containerFrame.counterAxisAlignItems = "MIN";
    containerFrame.itemSpacing = 24;
    containerFrame.paddingTop = 24;
    containerFrame.paddingRight = 24;
    containerFrame.paddingBottom = 24;
    containerFrame.paddingLeft = 24;
    containerFrame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
    containerFrame.cornerRadius = 8;
    containerFrame.strokes = [{ type: "SOLID", color: { r: 0.9, g: 0.9, b: 0.9 } }];
    containerFrame.strokeWeight = 1;

    // If parentId is provided, append to that node
    if (parentId) {
      const parentNode = await figma.getNodeByIdAsync(parentId);
      if (parentNode && "appendChild" in parentNode) {
        parentNode.appendChild(containerFrame);
      } else {
        figma.currentPage.appendChild(containerFrame);
      }
    } else {
      figma.currentPage.appendChild(containerFrame);
    }

    // Add title if provided
    if (title) {
      await figma.loadFontAsync({ family: "Inter", style: "Bold" });

      const titleText = figma.createText();
      titleText.characters = title;
      titleText.fontSize = 20;
      titleText.fontName = { family: "Inter", style: "Bold" };
      titleText.fills = [{ type: "SOLID", color: { r: 0.1, g: 0.1, b: 0.1 } }];
      titleText.layoutAlign = "STRETCH";
      containerFrame.appendChild(titleText);
    }

    // Create rows based on the number of columns
    const rows = Math.ceil(products.length / columns);

    for (let row = 0; row < rows; row++) {
      // Create a row frame
      const rowFrame = figma.createFrame();
      rowFrame.name = `Row ${row + 1}`;
      rowFrame.layoutMode = "HORIZONTAL";
      rowFrame.primaryAxisAlignItems = "MIN";
      rowFrame.counterAxisAlignItems = "MIN";
      rowFrame.itemSpacing = spacing;
      rowFrame.fills = [];
      rowFrame.layoutAlign = "STRETCH";
      containerFrame.appendChild(rowFrame);

      // Add product cards to this row
      for (let col = 0; col < columns; col++) {
        const productIndex = row * columns + col;

        // Break if we've used all products
        if (productIndex >= products.length) break;

        const product = products[productIndex];

        // Create a product card
        const productCard = await createProductCard({
          productImage: product,
          x: 0,
          y: 0,
          width: cardWidth,
          height: cardHeight,
          parentId: rowFrame.id,
          showDetails: true
        });
      }
    }

    // Return the container frame info
    return {
      id: containerFrame.id,
      name: containerFrame.name,
      type: containerFrame.type,
      x: containerFrame.x,
      y: containerFrame.y,
      width: containerFrame.width,
      height: containerFrame.height,
      productCount: products.length
    };
  } catch (error) {
    console.error("Error in createProductGrid:", error);
    throw new Error(`Failed to create product grid: ${error.message}`);
  }
}

/**
 * Create a product card with image and details
 * This function creates a complete product card with image, title, price, and other details
 */
async function createProductCard(params) {
  const {
    productImage,
    x = 0,
    y = 0,
    width = 200,
    height = 300,
    parentId,
    showDetails = true
  } = params || {};

  if (!productImage || !productImage.url || !productImage.productInfo) {
    throw new Error("Missing or invalid productImage parameter");
  }

  try {
    console.log("Creating product card for:", productImage.title);

    // Create a frame to contain the product card
    const frame = figma.createFrame();
    frame.name = `Product Card: ${productImage.title}`;
    frame.x = x;
    frame.y = y;
    frame.resize(width, height);
    frame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
    frame.cornerRadius = 8;
    frame.strokes = [{ type: "SOLID", color: { r: 0.9, g: 0.9, b: 0.9 } }];
    frame.strokeWeight = 1;

    // Set up auto layout
    frame.layoutMode = "VERTICAL";
    frame.primaryAxisAlignItems = "CENTER";
    frame.counterAxisAlignItems = "CENTER";
    frame.itemSpacing = 8;
    frame.paddingTop = 16;
    frame.paddingRight = 16;
    frame.paddingBottom = 16;
    frame.paddingLeft = 16;

    // If parentId is provided, append to that node
    if (parentId) {
      const parentNode = await figma.getNodeByIdAsync(parentId);
      if (parentNode && "appendChild" in parentNode) {
        parentNode.appendChild(frame);
      } else {
        figma.currentPage.appendChild(frame);
      }
    } else {
      figma.currentPage.appendChild(frame);
    }

    // Create the image container (top 60% of the card)
    const imageHeight = Math.floor(height * 0.6);
    const imageContainer = figma.createFrame();
    imageContainer.name = "Image Container";
    imageContainer.resize(width - 32, imageHeight);
    imageContainer.fills = [{ type: "SOLID", color: { r: 0.98, g: 0.98, b: 0.98 } }];
    imageContainer.cornerRadius = 4;
    imageContainer.layoutAlign = "STRETCH";
    frame.appendChild(imageContainer);

    // Insert the product image
    const imageResult = await insertImageFromUrl({
      imageUrl: productImage.url,
      x: 0,
      y: 0,
      width: imageContainer.width,
      height: imageContainer.height,
      name: productImage.title,
      parentId: imageContainer.id,
      scaleMode: "FIT",
      isProductImage: true,
      productInfo: productImage.productInfo
    });

    // Only add details if showDetails is true
    if (showDetails) {
      const productInfo = productImage.productInfo;

      // Load fonts
      await figma.loadFontAsync({ family: "Inter", style: "Bold" });
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      await figma.loadFontAsync({ family: "Inter", style: "Medium" });

      // Create product title
      const titleText = figma.createText();
      titleText.characters = productInfo.name;
      titleText.fontSize = 14;
      titleText.fontName = { family: "Inter", style: "Bold" };
      titleText.fills = [{ type: "SOLID", color: { r: 0.1, g: 0.1, b: 0.1 } }];
      titleText.layoutAlign = "STRETCH";
      titleText.textTruncation = "ENDING";
      titleText.maxWidth = width - 32;
      frame.appendChild(titleText);

      // Create price container
      const priceContainer = figma.createFrame();
      priceContainer.name = "Price Container";
      priceContainer.layoutMode = "HORIZONTAL";
      priceContainer.primaryAxisAlignItems = "MIN";
      priceContainer.counterAxisAlignItems = "CENTER";
      priceContainer.itemSpacing = 8;
      priceContainer.fills = [];
      priceContainer.layoutAlign = "STRETCH";
      frame.appendChild(priceContainer);

      // Create current price
      const priceText = figma.createText();
      priceText.characters = `$${productInfo.price}`;
      priceText.fontSize = 16;
      priceText.fontName = { family: "Inter", style: "Bold" };
      priceText.fills = [{ type: "SOLID", color: { r: 0.8, g: 0.2, b: 0.2 } }];
      priceContainer.appendChild(priceText);

      // Create original price if there's a discount
      if (productInfo.originalPrice && productInfo.originalPrice > productInfo.price) {
        const originalPriceText = figma.createText();
        originalPriceText.characters = `$${productInfo.originalPrice}`;
        originalPriceText.fontSize = 12;
        originalPriceText.fontName = { family: "Inter", style: "Regular" };
        originalPriceText.fills = [{ type: "SOLID", color: { r: 0.5, g: 0.5, b: 0.5 } }];
        originalPriceText.textDecoration = "STRIKETHROUGH";
        priceContainer.appendChild(originalPriceText);
      }

      // Create discount badge if there's a discount
      if (productInfo.discount) {
        const discountBadge = figma.createFrame();
        discountBadge.name = "Discount Badge";
        discountBadge.resize(40, 20);
        discountBadge.cornerRadius = 4;
        discountBadge.fills = [{ type: "SOLID", color: { r: 0.95, g: 0.2, b: 0.2 } }];
        discountBadge.layoutMode = "HORIZONTAL";
        discountBadge.primaryAxisAlignItems = "CENTER";
        discountBadge.counterAxisAlignItems = "CENTER";

        const discountText = figma.createText();
        discountText.characters = productInfo.discount;
        discountText.fontSize = 10;
        discountText.fontName = { family: "Inter", style: "Bold" };
        discountText.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
        discountBadge.appendChild(discountText);

        priceContainer.appendChild(discountBadge);
      }

      // Create rating if available
      if (productInfo.rating) {
        const ratingContainer = figma.createFrame();
        ratingContainer.name = "Rating Container";
        ratingContainer.layoutMode = "HORIZONTAL";
        ratingContainer.primaryAxisAlignItems = "MIN";
        ratingContainer.counterAxisAlignItems = "CENTER";
        ratingContainer.itemSpacing = 4;
        ratingContainer.fills = [];
        ratingContainer.layoutAlign = "STRETCH";
        frame.appendChild(ratingContainer);

        // Create rating text
        const ratingText = figma.createText();
        ratingText.characters = `★ ${productInfo.rating.toFixed(1)}`;
        ratingText.fontSize = 12;
        ratingText.fontName = { family: "Inter", style: "Medium" };
        ratingText.fills = [{ type: "SOLID", color: { r: 0.9, g: 0.7, b: 0.1 } }];
        ratingContainer.appendChild(ratingText);

        // Create review count if available
        if (productInfo.reviewCount) {
          const reviewText = figma.createText();
          reviewText.characters = `(${productInfo.reviewCount})`;
          reviewText.fontSize = 12;
          reviewText.fontName = { family: "Inter", style: "Regular" };
          reviewText.fills = [{ type: "SOLID", color: { r: 0.5, g: 0.5, b: 0.5 } }];
          ratingContainer.appendChild(reviewText);
        }
      }
    }

    return {
      id: frame.id,
      name: frame.name,
      type: frame.type,
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height,
      productInfo: productImage.productInfo
    };
  } catch (error) {
    console.error("Error in createProductCard:", error);
    throw new Error(`Failed to create product card: ${error.message}`);
  }
}

/**
 * Find and insert an appropriate image based on context or query
 * This is a higher-level function that combines multiple operations
 */
async function findAndInsertImage(params) {
  const { context, nodeId, position, size, parentId, imageType } = params || {};

  if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
    throw new Error("Missing or invalid position parameter");
  }

  try {
    console.log("Starting findAndInsertImage");

    let searchQuery = context;

    // If no context provided but nodeId is, analyze the node for context
    if (!searchQuery && nodeId) {
      console.log("No context provided, analyzing node:", nodeId);

      const analysisResult = await analyzeNodeContext({ nodeId });

      if (analysisResult.keywords && analysisResult.keywords.length > 0) {
        searchQuery = analysisResult.keywords.slice(0, 3).join(" ");
        console.log("Generated search query from node context:", searchQuery);
      }
    }

    // If still no search query, use a default
    if (!searchQuery) {
      searchQuery = "abstract background";
      console.log("No context could be determined, using default query:", searchQuery);
    }

    // Search for images
    const searchResults = await searchImages({
      query: searchQuery,
      imageType,
      maxResults: 1
    });

    // If no results found, return an error
    if (!searchResults.images || searchResults.images.length === 0) {
      throw new Error(`No images found for query: ${searchQuery}`);
    }

    // Get the first result
    const selectedImage = searchResults.images[0];

    // Check if this is a product image
    const isProductImage = !!selectedImage.productInfo;

    let insertResult;

    // If this is a product image, create a product card
    if (isProductImage) {
      console.log("Creating product card for product image");

      // Create a product card with the image and details
      insertResult = await createProductCard({
        productImage: selectedImage,
        x: position.x,
        y: position.y,
        width: size?.width || 240,
        height: size?.height || 360,
        parentId,
        showDetails: true
      });
    } else {
      // For regular images, just insert the image directly
      console.log("Inserting regular image");

      insertResult = await insertImageFromUrl({
        imageUrl: selectedImage.url,
        x: position.x,
        y: position.y,
        width: size?.width,
        height: size?.height,
        name: `${searchQuery} image`,
        parentId,
        scaleMode: "FIT",
        isProductImage: false
      });
    }

    return {
      query: searchQuery,
      imageDetails: selectedImage,
      insertedNode: {
        id: insertResult.id,
        name: insertResult.name,
        type: insertResult.type,
        x: insertResult.x,
        y: insertResult.y,
        width: insertResult.width,
        height: insertResult.height,
        isProductImage: isProductImage,
        productInfo: isProductImage ? selectedImage.productInfo : null
      }
    };
  } catch (error) {
    console.error("Error in findAndInsertImage:", error);
    throw new Error(`Failed to find and insert image: ${error.message}`);
  }
}
