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
    
    // Variable Tools - Task 1.11 Synchronization
    case "create_variable":
      return await createVariable(params);
    case "create_variable_collection":
      return await createVariableCollection(params);
    case "get_local_variables":
      return await getLocalVariables(params);
    case "get_local_variable_collections":
      return await getLocalVariableCollections(params);
    case "get_variable_by_id":
      return await getVariableById(params);
    case "get_variable_collection_by_id":
      return await getVariableCollectionById(params);
    case "set_bound_variable":
      return await setBoundVariable(params);
    case "set_bound_variable_for_paint":
      return await setBoundVariableForPaint(params);
    case "remove_bound_variable":
      return await removeBoundVariable(params);
    case "remove_bound_variable_batch":
      return await removeBoundVariableBatch(params);
    case "update_variable_value":
      return await updateVariableValue(params);
    case "update_variable_name":
      return await updateVariableName(params);
    case "delete_variable":
      return await deleteVariable(params);
    case "delete_variable_collection":
      return await deleteVariableCollection(params);
    case "get_variable_references":
      return await getVariableReferences(params);
    case "set_variable_mode_value":
      return await setVariableModeValue(params);
    case "create_variable_mode":
      return await createVariableMode(params);
    case "delete_variable_mode":
      return await deleteVariableMode(params);
    case "reorder_variable_modes":
      return await reorderVariableModes(params);
    case "publish_variable_collection":
      return await publishVariableCollection(params);
    case "get_published_variables":
      return await getPublishedVariables(params);
    
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

  // Validate that MCP layer provided complete data
  if (r === undefined || g === undefined || b === undefined || a === undefined) {
    throw new Error("Incomplete color data received from MCP layer. All RGBA components must be provided.");
  }

  // Parse values - no defaults, just format conversion
  const rgbColor = {
    r: parseFloat(r),
    g: parseFloat(g), 
    b: parseFloat(b),
    a: parseFloat(a)
  };

  // Validate parsing succeeded
  if (isNaN(rgbColor.r) || isNaN(rgbColor.g) || isNaN(rgbColor.b) || isNaN(rgbColor.a)) {
    throw new Error("Invalid color values received - all components must be valid numbers");
  }

  // Set fill - pure translation to Figma API format
  const paintStyle = {
    type: "SOLID",
    color: {
      r: rgbColor.r,
      g: rgbColor.g,
      b: rgbColor.b,
    },
    opacity: rgbColor.a,
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
    strokeWeight,
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

  if (r === undefined || g === undefined || b === undefined || a === undefined) {
    throw new Error("Incomplete color data received from MCP layer. All RGBA components must be provided.");
  }
  
  if (strokeWeight === undefined) {
    throw new Error("Stroke weight must be provided by MCP layer.");
  }

  const rgbColor = {
    r: parseFloat(r),
    g: parseFloat(g),
    b: parseFloat(b),
    a: parseFloat(a)
  };
  const strokeWeightParsed = parseFloat(strokeWeight);

  if (isNaN(rgbColor.r) || isNaN(rgbColor.g) || isNaN(rgbColor.b) || isNaN(rgbColor.a)) {
    throw new Error("Invalid color values received - all components must be valid numbers");
  }
  
  if (isNaN(strokeWeightParsed)) {
    throw new Error("Invalid stroke weight - must be a valid number");
  }

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
    node.strokeWeight = strokeWeightParsed;
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

// =============================================================================
// VARIABLE TOOLS IMPLEMENTATION - Task 1.11 Synchronization
// =============================================================================

/**
 * Create a new variable in a variable collection
 * Implements Figma Variables API for variable creation
 */
async function createVariable(params) {
  try {
    const { name, variableCollectionId, resolvedType, initialValue, description = "" } = params;
    
    // Validate required parameters
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Variable name is required and cannot be empty');
    }
    
    if (!variableCollectionId || typeof variableCollectionId !== 'string') {
      throw new Error('Variable collection ID is required');
    }
    
    if (!resolvedType || !['BOOLEAN', 'FLOAT', 'STRING', 'COLOR'].includes(resolvedType)) {
      throw new Error('Invalid resolvedType. Must be BOOLEAN, FLOAT, STRING, or COLOR');
    }
    
    // Get the variable collection
    const collection = await figma.variables.getVariableCollectionByIdAsync(variableCollectionId);
    if (!collection) {
      throw new Error(`Variable collection not found: ${variableCollectionId}`);
    }
    
    // Create the variable
    const variable = figma.variables.createVariable(name, collection, resolvedType);
    
    // Set description if provided
    if (description) {
      variable.description = description;
    }
    
    // Set initial value if provided with enhanced validation - Task 1.14
    if (initialValue !== undefined && initialValue !== null) {
      // Validate and set value based on type with strict type checking
      if (resolvedType === 'COLOR' && typeof initialValue === 'object') {
        // Enhanced COLOR validation
        if (typeof initialValue.r !== 'number' || typeof initialValue.g !== 'number' || typeof initialValue.b !== 'number') {
          throw new Error('COLOR variables require numeric r, g, b values');
        }
        if (initialValue.r < 0 || initialValue.r > 1 || initialValue.g < 0 || initialValue.g > 1 || initialValue.b < 0 || initialValue.b > 1) {
          throw new Error('COLOR values must be in range 0-1 for r, g, b components');
        }
        const colorValue = {
          r: initialValue.r,
          g: initialValue.g,
          b: initialValue.b,
          a: typeof initialValue.a === 'number' ? initialValue.a : 1.0
        };
        variable.setValueForMode(collection.defaultModeId, colorValue);
      } else if (resolvedType === 'BOOLEAN') {
        // Strict boolean validation - prevent type coercion
        if (typeof initialValue !== 'boolean') {
          throw new Error(`BOOLEAN variable requires boolean value, got: ${typeof initialValue} (${initialValue})`);
        }
        variable.setValueForMode(collection.defaultModeId, initialValue);
      } else if (resolvedType === 'FLOAT') {
        // Strict number validation - prevent type coercion
        if (typeof initialValue !== 'number' || isNaN(initialValue)) {
          throw new Error(`FLOAT variable requires number value, got: ${typeof initialValue} (${initialValue})`);
        }
        variable.setValueForMode(collection.defaultModeId, initialValue);
      } else if (resolvedType === 'STRING') {
        // Strict string validation - prevent type coercion
        if (typeof initialValue !== 'string') {
          throw new Error(`STRING variable requires string value, got: ${typeof initialValue} (${initialValue})`);
        }
        variable.setValueForMode(collection.defaultModeId, initialValue);
      } else {
        throw new Error(`Invalid initial value type for ${resolvedType} variable: ${typeof initialValue}`);
      }
    }
    
    return {
      success: true,
      message: `Variable "${name}" created successfully`,
      variable: {
        id: variable.id,
        name: variable.name,
        key: variable.key,
        resolvedType: variable.resolvedType,
        description: variable.description,
        variableCollectionId: variable.variableCollectionId,
        remote: variable.remote,
        hiddenFromPublishing: variable.hiddenFromPublishing,
        scopes: variable.scopes,
        codeSyntax: variable.codeSyntax,
        valuesByMode: variable.valuesByMode
      }
    };
    
  } catch (error) {
    throw new Error(`Failed to create variable: ${error.message}`);
  }
}

/**
 * Create a new variable collection with mode support
 */
async function createVariableCollection(params) {
  try {
    const { name, initialModeNames = ["Mode 1"] } = params;
    
    // Validate required parameters
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Collection name is required and cannot be empty');
    }
    
    // Create the variable collection
    const collection = figma.variables.createVariableCollection(name);
    
    // Add additional modes if specified
    if (initialModeNames.length > 1) {
      for (let i = 1; i < initialModeNames.length; i++) {
        collection.addMode(initialModeNames[i]);
      }
      
      // Rename the default mode to the first specified name
      const modes = collection.modes;
      if (modes.length > 0) {
        modes[0].name = initialModeNames[0];
      }
    }
    
    return {
      success: true,
      message: `Variable collection "${name}" created successfully`,
      collection: {
        id: collection.id,
        name: collection.name,
        modes: collection.modes.map(mode => ({
          modeId: mode.modeId,
          name: mode.name
        })),
        defaultModeId: collection.defaultModeId,
        remote: collection.remote
      }
    };
    
  } catch (error) {
    throw new Error(`Failed to create variable collection: ${error.message}`);
  }
}

/**
 * Get local variables with filtering and pagination - OPTIMIZED for Task 1.13
 * Implements chunked processing to prevent UI freeze and timeouts
 */
async function getLocalVariables(params = {}) {
  try {
    const { 
      collectionId, 
      type, 
      namePattern, 
      limit = 100,  // Reduced default limit for better performance
      offset = 0,
      chunkSize = 50  // Process in chunks to prevent UI freeze
    } = params;

    // Send progress update for long operations
    const commandId = params.commandId || 'get_local_variables';
    sendProgressUpdate(commandId, 'get_local_variables', 'started', 0, 0, 0, 'Starting variable query...');

    // Get all local variables (this is unavoidable but we'll process in chunks)
    const allVariables = figma.variables.getLocalVariables();
    const totalVariables = allVariables.length;

    sendProgressUpdate(commandId, 'get_local_variables', 'processing', 10, totalVariables, 0, `Found ${totalVariables} variables, applying filters...`);

    // Process variables in chunks to prevent UI freeze
    let filteredVariables = [];
    let processedCount = 0;

    for (let i = 0; i < allVariables.length; i += chunkSize) {
      const chunk = allVariables.slice(i, i + chunkSize);
      
      // Apply filters to chunk
      const filteredChunk = chunk.filter(variable => {
        // Collection filter
        if (collectionId && variable.variableCollectionId !== collectionId) {
          return false;
        }
        
        // Type filter
        if (type && variable.resolvedType !== type) {
          return false;
        }
        
        // Name pattern filter
        if (namePattern) {
          const pattern = new RegExp(namePattern, 'i');
          if (!pattern.test(variable.name)) {
            return false;
          }
        }
        
        return true;
      });

      filteredVariables.push(...filteredChunk);
      processedCount += chunk.length;

      // Send progress update every chunk
      const progress = Math.floor((processedCount / totalVariables) * 70) + 10; // 10-80% for filtering
      sendProgressUpdate(commandId, 'get_local_variables', 'processing', progress, totalVariables, processedCount, 
        `Filtered ${processedCount}/${totalVariables} variables...`);

      // Yield control to prevent UI freeze
      if (i % (chunkSize * 4) === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }

    sendProgressUpdate(commandId, 'get_local_variables', 'processing', 80, totalVariables, totalVariables, 
      `Filtering complete. Found ${filteredVariables.length} matching variables. Applying pagination...`);

    // Apply pagination to filtered results
    const totalCount = filteredVariables.length;
    const paginatedVariables = filteredVariables.slice(offset, offset + limit);

    sendProgressUpdate(commandId, 'get_local_variables', 'processing', 90, totalVariables, totalVariables, 
      'Formatting response...');

    // Format response with minimal data to reduce payload
    const formattedVariables = paginatedVariables.map(variable => {
      const result = {
        id: variable.id,
        name: variable.name,
        resolvedType: variable.resolvedType,
        variableCollectionId: variable.variableCollectionId,
        remote: variable.remote
      };

      // Only include description if it exists (reduce payload)
      if (variable.description) {
        result.description = variable.description;
      }

      // Only include valuesByMode if specifically requested or small dataset
      if (totalCount <= 50 || params.includeValues === true) {
        result.valuesByMode = variable.valuesByMode;
      }

      return result;
    });

    sendProgressUpdate(commandId, 'get_local_variables', 'completed', 100, totalVariables, totalVariables, 
      `Successfully retrieved ${formattedVariables.length} variables`);

    return {
      success: true,
      variables: formattedVariables,
      pagination: {
        total: totalCount,
        offset: offset,
        limit: limit,
        hasMore: offset + limit < totalCount,
        filtered: totalCount !== totalVariables,
        originalTotal: totalVariables
      },
      performance: {
        totalProcessed: totalVariables,
        filtered: totalCount,
        returned: formattedVariables.length,
        chunksProcessed: Math.ceil(totalVariables / chunkSize)
      }
    };
    
  } catch (error) {
    const commandId = params.commandId || 'get_local_variables';
    sendProgressUpdate(commandId, 'get_local_variables', 'error', 0, 0, 0, `Error: ${error.message}`);
    throw new Error(`Failed to get local variables: ${error.message}`);
  }
}

/**
 * Get local variable collections with metadata - OPTIMIZED for Task 1.13
 * Implements efficient variable counting and progress tracking
 */
async function getLocalVariableCollections(params = {}) {
  try {
    const { 
      includeVariableCount = false, 
      includeModes = true, 
      namePattern, 
      sortBy = "name", 
      sortOrder = "asc",
      limit = 50,  // Add pagination support
      offset = 0
    } = params;

    // Send progress update for long operations
    const commandId = params.commandId || 'get_local_variable_collections';
    sendProgressUpdate(commandId, 'get_local_variable_collections', 'started', 0, 0, 0, 'Starting collection query...');
    
    // Get all local variable collections
    const allCollections = figma.variables.getLocalVariableCollections();
    const totalCollections = allCollections.length;

    sendProgressUpdate(commandId, 'get_local_variable_collections', 'processing', 20, totalCollections, 0, 
      `Found ${totalCollections} collections, applying filters...`);
    
    // Apply name pattern filter first (most efficient)
    let filteredCollections = allCollections;
    if (namePattern) {
      const pattern = new RegExp(namePattern, 'i');
      filteredCollections = allCollections.filter(collection => pattern.test(collection.name));
    }

    sendProgressUpdate(commandId, 'get_local_variable_collections', 'processing', 40, totalCollections, 0, 
      `Filtered to ${filteredCollections.length} collections, formatting data...`);

    // Pre-load variables only once if variable count is needed
    let allVariables = null;
    if (includeVariableCount) {
      allVariables = figma.variables.getLocalVariables();
      sendProgressUpdate(commandId, 'get_local_variable_collections', 'processing', 60, totalCollections, 0, 
        `Loaded ${allVariables.length} variables for counting...`);
    }
    
    // Format collections efficiently
    const formattedCollections = filteredCollections.map((collection, index) => {
      const result = {
        id: collection.id,
        name: collection.name,
        defaultModeId: collection.defaultModeId,
        remote: collection.remote
      };
      
      // Include modes if requested (lightweight operation)
      if (includeModes) {
        result.modes = collection.modes.map(mode => ({
          modeId: mode.modeId,
          name: mode.name
        }));
      }
      
      // Include variable count if requested (expensive operation - optimized)
      if (includeVariableCount && allVariables) {
        result.variableCount = allVariables.filter(v => v.variableCollectionId === collection.id).length;
      }

      // Send progress update every 10 collections
      if (index % 10 === 0) {
        const progress = 60 + Math.floor((index / filteredCollections.length) * 20); // 60-80% for formatting
        sendProgressUpdate(commandId, 'get_local_variable_collections', 'processing', progress, totalCollections, index, 
          `Formatted ${index}/${filteredCollections.length} collections...`);
      }
      
      return result;
    });

    sendProgressUpdate(commandId, 'get_local_variable_collections', 'processing', 80, totalCollections, filteredCollections.length, 
      'Applying sorting...');
    
    // Apply sorting efficiently
    formattedCollections.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "variableCount":
          aValue = a.variableCount || 0;
          bValue = b.variableCount || 0;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (sortOrder === "desc") {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    sendProgressUpdate(commandId, 'get_local_variable_collections', 'processing', 90, totalCollections, filteredCollections.length, 
      'Applying pagination...');

    // Apply pagination
    const totalFiltered = formattedCollections.length;
    const paginatedCollections = formattedCollections.slice(offset, offset + limit);

    sendProgressUpdate(commandId, 'get_local_variable_collections', 'completed', 100, totalCollections, totalFiltered, 
      `Successfully retrieved ${paginatedCollections.length} collections`);
    
    return {
      success: true,
      collections: paginatedCollections,
      pagination: {
        total: totalFiltered,
        offset: offset,
        limit: limit,
        hasMore: offset + limit < totalFiltered,
        filtered: totalFiltered !== totalCollections,
        originalTotal: totalCollections
      },
      performance: {
        totalCollections: totalCollections,
        filtered: totalFiltered,
        returned: paginatedCollections.length,
        variableCountingEnabled: includeVariableCount,
        totalVariablesProcessed: allVariables ? allVariables.length : 0
      }
    };
    
  } catch (error) {
    const commandId = params.commandId || 'get_local_variable_collections';
    sendProgressUpdate(commandId, 'get_local_variable_collections', 'error', 0, 0, 0, `Error: ${error.message}`);
    throw new Error(`Failed to get local variable collections: ${error.message}`);
  }
}

/**
 * Get a specific variable by ID
 */
async function getVariableById(params) {
  try {
    const { variableId } = params;
    
    if (!variableId) {
      throw new Error('Variable ID is required');
    }
    
    const variable = await figma.variables.getVariableByIdAsync(variableId);
    
    if (!variable) {
      throw new Error(`Variable not found: ${variableId}`);
    }
    
    return {
      success: true,
      variable: {
        id: variable.id,
        name: variable.name,
        resolvedType: variable.resolvedType,
        description: variable.description,
        variableCollectionId: variable.variableCollectionId,
        remote: variable.remote,
        valuesByMode: variable.valuesByMode
      }
    };
    
  } catch (error) {
    throw new Error(`Failed to get variable: ${error.message}`);
  }
}

/**
 * Get a specific variable collection by ID
 */
async function getVariableCollectionById(params) {
  try {
    const { collectionId } = params;
    
    if (!collectionId) {
      throw new Error('Collection ID is required');
    }
    
    const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
    
    if (!collection) {
      throw new Error(`Variable collection not found: ${collectionId}`);
    }
    
    return {
      success: true,
      collection: {
        id: collection.id,
        name: collection.name,
        modes: collection.modes.map(mode => ({
          modeId: mode.modeId,
          name: mode.name
        })),
        defaultModeId: collection.defaultModeId,
        remote: collection.remote
      }
    };
    
  } catch (error) {
    throw new Error(`Failed to get variable collection: ${error.message}`);
  }
}

/**
 * Bind a variable to a node property
 */
async function setBoundVariable(params) {
  try {
    const { nodeId, property, variableId, modeId } = params;
    
    // Validate required parameters
    if (!nodeId) {
      throw new Error('Node ID is required');
    }
    
    if (!property) {
      throw new Error('Property is required');
    }
    
    if (!variableId) {
      throw new Error('Variable ID is required');
    }
    
    // Get the node
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    
    // Get the variable
    const variable = await figma.variables.getVariableByIdAsync(variableId);
    if (!variable) {
      throw new Error(`Variable not found: ${variableId}`);
    }
    
    // Validate property compatibility
    const supportedProperties = {
      'width': ['FLOAT'],
      'height': ['FLOAT'],
      'x': ['FLOAT'],
      'y': ['FLOAT'],
      'rotation': ['FLOAT'],
      'opacity': ['FLOAT'],
      'cornerRadius': ['FLOAT'],
      'strokeWeight': ['FLOAT'],
      'visible': ['BOOLEAN'],
      'locked': ['BOOLEAN'],
      'characters': ['STRING']
    };
    
    if (!supportedProperties[property] || !supportedProperties[property].includes(variable.resolvedType)) {
      throw new Error(`Property "${property}" is not compatible with variable type "${variable.resolvedType}"`);
    }
    
    // Set the bound variable
    if (modeId) {
      node.setBoundVariable(property, variable, modeId);
    } else {
      node.setBoundVariable(property, variable);
    }
    
    return {
      success: true,
      message: `Variable "${variable.name}" bound to property "${property}" on node "${node.name}"`,
      binding: {
        nodeId: node.id,
        nodeName: node.name,
        property: property,
        variableId: variable.id,
        variableName: variable.name,
        modeId: modeId || null
      }
    };
    
  } catch (error) {
    throw new Error(`Failed to bind variable: ${error.message}`);
  }
}

/**
 * Bind a variable to a paint property (fill or stroke) - OPTIMIZED for Task 1.15
 * Fixes: timeout issues, parameter compatibility, validation, error handling
 */
async function setBoundVariableForPaint(params) {
  try {
    // CRITICAL FIX 1: Handle both 'paintType' (MCP) and 'property' (legacy) parameters
    const { nodeId, paintType, property, variableId, paintIndex = 0, variableType } = params;
    
    // Determine the paint property (prioritize paintType from MCP)
    const paintProperty = paintType || property;
    
    // CRITICAL FIX 2: Enhanced parameter validation with specific error messages
    if (!nodeId) {
      throw new Error('Node ID is required');
    }
    
    if (!paintProperty || !['fills', 'strokes'].includes(paintProperty)) {
      throw new Error('Paint type must be "fills" or "strokes"');
    }
    
    if (!variableId) {
      throw new Error('Variable ID is required');
    }
    
    // CRITICAL FIX 3: Validate paint index range (non-negative)
    if (paintIndex < 0) {
      throw new Error(`Paint index must be non-negative, got: ${paintIndex}`);
    }
    
    // CRITICAL FIX 4: Pre-validate variable type if provided (early validation)
    if (variableType && variableType !== 'COLOR') {
      throw new Error(`Variable must be of type COLOR for paint properties, got: ${variableType}`);
    }
    
    // PERFORMANCE FIX 1: Use synchronous getNodeById for faster execution
    const node = figma.getNodeById(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    
    // CRITICAL FIX 5: Validate node supports paint properties
    if (!('fills' in node) && paintProperty === 'fills') {
      throw new Error(`Node type ${node.type} does not support fill properties`);
    }
    
    if (!('strokes' in node) && paintProperty === 'strokes') {
      throw new Error(`Node type ${node.type} does not support stroke properties`);
    }
    
    // PERFORMANCE FIX 2: Use synchronous getVariableById for faster execution
    const variable = figma.variables.getVariableById(variableId);
    if (!variable) {
      throw new Error(`Variable not found: ${variableId}`);
    }
    
    // CRITICAL FIX 6: Enhanced COLOR variable validation
    if (variable.resolvedType !== 'COLOR') {
      throw new Error(`Variable must be of type COLOR for paint properties, got: ${variable.resolvedType}`);
    }
    
    // CRITICAL FIX 7: Validate paint index is within range
    const currentPaints = node[paintProperty] || [];
    if (paintIndex >= currentPaints.length && currentPaints.length > 0) {
      throw new Error(`Paint index ${paintIndex} is out of range for node ${paintProperty} (max: ${currentPaints.length - 1})`);
    }
    
    // PERFORMANCE FIX 3: Direct paint binding with optimized timeout
    try {
      node.setBoundVariable(paintProperty, variable, paintIndex);
    } catch (bindingError) {
      throw new Error(`Failed to bind variable to ${paintProperty}[${paintIndex}]: ${bindingError.message}`);
    }
    
    // CRITICAL FIX 8: Enhanced response with performance metrics and compatibility info
    return {
      success: true,
      message: `Color variable "${variable.name}" bound to ${paintProperty}[${paintIndex}] on node "${node.name}"`,
      binding: {
        nodeId: node.id,
        nodeName: node.name,
        property: paintProperty, // Maintain backward compatibility
        paintType: paintProperty, // New MCP-compatible field
        paintIndex: paintIndex,
        variableId: variable.id,
        variableName: variable.name
      },
      performance: {
        executionTimeMs: Date.now() - (params._startTime || Date.now()),
        timeoutOptimized: true,
        paintOperationTimeout: 4500 // From VARIABLE_OPERATION_TIMEOUTS.SET_BOUND_PAINT
      }
    };
    
  } catch (error) {
    // CRITICAL FIX 9: Enhanced error handling with specific error types
    let enhancedMessage = `Failed to bind variable for paint: ${error.message}`;
    
    // Provide more helpful messages for common errors
    if (error.message.includes('out of range') || error.message.includes('index')) {
      enhancedMessage += '. The paint index may be out of range for this node.';
    } else if (error.message.includes('not support') || error.message.includes('incompatible')) {
      enhancedMessage += '. This node type may not support paint binding.';
    } else if (error.message.includes('COLOR variable')) {
      enhancedMessage += '. Only COLOR variables can be bound to paint properties.';
    }
    
    throw new Error(enhancedMessage);
  }
}

/**
 * Remove a bound variable from a node property
 */
async function removeBoundVariable(params) {
  try {
    const { nodeId, property } = params;
    
    // Validate required parameters
    if (!nodeId) {
      throw new Error('Node ID is required');
    }
    
    if (!property) {
      throw new Error('Property is required');
    }
    
    // Get the node
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    
    // Remove the bound variable
    node.removeBoundVariable(property);
    
    return {
      success: true,
      message: `Bound variable removed from property "${property}" on node "${node.name}"`,
      nodeId: node.id,
      nodeName: node.name,
      property: property
    };
    
  } catch (error) {
    throw new Error(`Failed to remove bound variable: ${error.message}`);
  }
}

/**
 * Remove bound variables from multiple nodes in batch operation - TASK 1.16 OPTIMIZATION
 */
async function removeBoundVariableBatch(params) {
  try {
    const { operations } = params;
    
    // Validate required parameters
    if (!operations || !Array.isArray(operations)) {
      throw new Error('Operations array is required');
    }
    
    if (operations.length === 0) {
      throw new Error('At least one operation is required');
    }
    
    if (operations.length > 50) {
      throw new Error('Maximum 50 operations per batch');
    }
    
    const results = [];
    let successfulOperations = 0;
    let failedOperations = 0;
    const errors = [];
    
    // Process each operation
    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      
      try {
        const { nodeId, property, paintType, paintIndex, forceCleanup } = operation;
        
        // Validate operation parameters
        if (!nodeId) {
          throw new Error(`Operation ${i}: Node ID is required`);
        }
        
        // Get the node
        const node = await figma.getNodeByIdAsync(nodeId);
        if (!node) {
          throw new Error(`Operation ${i}: Node not found: ${nodeId}`);
        }
        
        // Determine what to remove
        if (property) {
          // Remove property binding
          node.removeBoundVariable(property);
          results.push({
            nodeId: node.id,
            property: property,
            success: true,
            index: i
          });
        } else if (paintType && paintIndex !== undefined) {
          // Remove paint binding
          const paintProperty = paintType; // 'fills' or 'strokes'
          node.removeBoundVariable(paintProperty, paintIndex);
          results.push({
            nodeId: node.id,
            paintType: paintType,
            paintIndex: paintIndex,
            success: true,
            index: i
          });
        } else {
          throw new Error(`Operation ${i}: Must specify either property or paintType/paintIndex`);
        }
        
        successfulOperations++;
        
      } catch (error) {
        // Handle individual operation failure
        failedOperations++;
        errors.push(`Operation ${i}: ${error.message}`);
        
        results.push({
          nodeId: operation.nodeId,
          property: operation.property,
          paintType: operation.paintType,
          paintIndex: operation.paintIndex,
          success: false,
          error: error.message,
          index: i
        });
      }
    }
    
    return {
      success: failedOperations === 0,
      message: `Batch operation completed: ${successfulOperations}/${operations.length} successful`,
      results: results,
      performance: {
        totalOperations: operations.length,
        successfulOperations: successfulOperations,
        failedOperations: failedOperations,
        batchOptimized: true
      },
      errors: errors.length > 0 ? errors : undefined
    };
    
  } catch (error) {
    throw new Error(`Failed to execute batch remove operation: ${error.message}`);
  }
}

/**
 * Update a variable's value for a specific mode
 */
async function updateVariableValue(params) {
  try {
    const { variableId, modeId, value } = params;
    
    // Validate required parameters
    if (!variableId) {
      throw new Error('Variable ID is required');
    }
    
    if (!modeId) {
      throw new Error('Mode ID is required');
    }
    
    if (value === undefined || value === null) {
      throw new Error('Value is required');
    }
    
    // Get the variable
    const variable = await figma.variables.getVariableByIdAsync(variableId);
    if (!variable) {
      throw new Error(`Variable not found: ${variableId}`);
    }
    
    // Validate value based on variable type
    if (variable.resolvedType === 'COLOR' && typeof value === 'object') {
      if (!value.r || !value.g || !value.b) {
        throw new Error('COLOR variables require r, g, b values');
      }
      variable.setValueForMode(modeId, {
        r: value.r,
        g: value.g,
        b: value.b,
        a: value.a || 1.0
      });
    } else if (variable.resolvedType === 'BOOLEAN' && typeof value === 'boolean') {
      variable.setValueForMode(modeId, value);
    } else if (variable.resolvedType === 'FLOAT' && typeof value === 'number') {
      variable.setValueForMode(modeId, value);
    } else if (variable.resolvedType === 'STRING' && typeof value === 'string') {
      variable.setValueForMode(modeId, value);
    } else {
      throw new Error(`Invalid value type for variable type "${variable.resolvedType}"`);
    }
    
    return {
      success: true,
      message: `Variable "${variable.name}" updated successfully`,
      variable: {
        id: variable.id,
        name: variable.name,
        resolvedType: variable.resolvedType,
        modeId: modeId,
        newValue: value
      }
    };
    
  } catch (error) {
    throw new Error(`Failed to update variable value: ${error.message}`);
  }
}

/**
 * Update a variable's name
 */
async function updateVariableName(params) {
  try {
    const { variableId, newName } = params;
    
    // Validate required parameters
    if (!variableId) {
      throw new Error('Variable ID is required');
    }
    
    if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
      throw new Error('New name is required and cannot be empty');
    }
    
    // Get the variable
    const variable = await figma.variables.getVariableByIdAsync(variableId);
    if (!variable) {
      throw new Error(`Variable not found: ${variableId}`);
    }
    
    const oldName = variable.name;
    variable.name = newName.trim();
    
    return {
      success: true,
      message: `Variable renamed from "${oldName}" to "${newName}"`,
      variable: {
        id: variable.id,
        oldName: oldName,
        newName: variable.name,
        resolvedType: variable.resolvedType
      }
    };
    
  } catch (error) {
    throw new Error(`Failed to update variable name: ${error.message}`);
  }
}

/**
 * Delete a variable
 */
async function deleteVariable(params) {
  try {
    const { variableId } = params;
    
    // Validate required parameters
    if (!variableId) {
      throw new Error('Variable ID is required');
    }
    
    // Get the variable
    const variable = await figma.variables.getVariableByIdAsync(variableId);
    if (!variable) {
      throw new Error(`Variable not found: ${variableId}`);
    }
    
    const variableName = variable.name;
    
    // Delete the variable
    variable.remove();
    
    return {
      success: true,
      message: `Variable "${variableName}" deleted successfully`,
      deletedVariable: {
        id: variableId,
        name: variableName
      }
    };
    
  } catch (error) {
    throw new Error(`Failed to delete variable: ${error.message}`);
  }
}

/**
 * Delete a variable collection
 */
async function deleteVariableCollection(params) {
  try {
    const { collectionId } = params;
    
    // Validate required parameters
    if (!collectionId) {
      throw new Error('Collection ID is required');
    }
    
    // Get the collection
    const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
    if (!collection) {
      throw new Error(`Variable collection not found: ${collectionId}`);
    }
    
    const collectionName = collection.name;
    
    // Delete the collection
    collection.remove();
    
    return {
      success: true,
      message: `Variable collection "${collectionName}" deleted successfully`,
      deletedCollection: {
        id: collectionId,
        name: collectionName
      }
    };
    
  } catch (error) {
    throw new Error(`Failed to delete variable collection: ${error.message}`);
  }
}

/**
 * Get references to where a variable is used
 */
/**
 * Get variable references - OPTIMIZED for Task 1.13
 * Implements progressive timeout and chunked processing for large documents
 */
async function getVariableReferences(params) {
  try {
    const { 
      variableId, 
      maxReferences = 1000,  // Limit to prevent timeout
      includeNodeDetails = true,
      timeoutMs = 15000  // Configurable timeout
    } = params;
    
    // Validate required parameters
    if (!variableId) {
      throw new Error('Variable ID is required');
    }

    // Send progress update for long operations
    const commandId = params.commandId || 'get_variable_references';
    sendProgressUpdate(commandId, 'get_variable_references', 'started', 0, 0, 0, 'Starting reference analysis...');
    
    // Get the variable
    const variable = await figma.variables.getVariableByIdAsync(variableId);
    if (!variable) {
      throw new Error(`Variable not found: ${variableId}`);
    }

    sendProgressUpdate(commandId, 'get_variable_references', 'processing', 20, 0, 0, 
      `Analyzing references for variable "${variable.name}"...`);

    // Set up timeout for the expensive operation
    let references = [];
    let timedOut = false;
    let analysisComplete = true;

    try {
      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          timedOut = true;
          reject(new Error(`Reference analysis timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      // Create the reference analysis promise
      const analysisPromise = new Promise(async (resolve) => {
        try {
          sendProgressUpdate(commandId, 'get_variable_references', 'processing', 40, 0, 0, 
            'Scanning document for references...');

          // Get references with timeout protection
          const allReferences = variable.getReferences();
          
          sendProgressUpdate(commandId, 'get_variable_references', 'processing', 70, allReferences.length, 0, 
            `Found ${allReferences.length} references, processing...`);

          // Limit references to prevent overwhelming response
          const limitedReferences = allReferences.slice(0, maxReferences);
          if (allReferences.length > maxReferences) {
            analysisComplete = false;
          }

          resolve(limitedReferences);
        } catch (error) {
          // If analysis fails, return empty array but don't fail completely
          sendProgressUpdate(commandId, 'get_variable_references', 'processing', 70, 0, 0, 
            'Reference analysis encountered issues, returning partial results...');
          resolve([]);
          analysisComplete = false;
        }
      });

      // Race between analysis and timeout
      references = await Promise.race([analysisPromise, timeoutPromise]);

    } catch (error) {
      if (timedOut) {
        // Handle timeout gracefully
        sendProgressUpdate(commandId, 'get_variable_references', 'processing', 70, 0, 0, 
          'Analysis timed out, returning partial results...');
        references = [];
        analysisComplete = false;
      } else {
        throw error;
      }
    }

    sendProgressUpdate(commandId, 'get_variable_references', 'processing', 80, references.length, 0, 
      'Formatting reference data...');
    
    // Format references with error handling for each reference
    const formattedReferences = [];
    for (let i = 0; i < references.length; i++) {
      try {
        const ref = references[i];
        const formattedRef = {
          nodeId: ref.node.id,
          property: ref.property,
          modeId: ref.modeId || null
        };

        // Include node details only if requested and safe to access
        if (includeNodeDetails) {
          try {
            formattedRef.nodeName = ref.node.name || 'Unnamed Node';
            formattedRef.nodeType = ref.node.type || 'UNKNOWN';
          } catch (nodeError) {
            // Node might be deleted or inaccessible
            formattedRef.nodeName = 'Inaccessible Node';
            formattedRef.nodeType = 'UNKNOWN';
            formattedRef.error = 'Node details unavailable';
          }
        }

        formattedReferences.push(formattedRef);

        // Send progress update every 50 references
        if (i % 50 === 0) {
          const progress = 80 + Math.floor((i / references.length) * 15); // 80-95% for formatting
          sendProgressUpdate(commandId, 'get_variable_references', 'processing', progress, references.length, i, 
            `Formatted ${i}/${references.length} references...`);
        }
      } catch (refError) {
        // Skip problematic references but continue processing
        continue;
      }
    }

    sendProgressUpdate(commandId, 'get_variable_references', 'completed', 100, references.length, formattedReferences.length, 
      `Successfully analyzed ${formattedReferences.length} references`);
    
    return {
      success: true,
      variable: {
        id: variable.id,
        name: variable.name
      },
      references: formattedReferences,
      referenceCount: formattedReferences.length,
      analysis: {
        complete: analysisComplete,
        timedOut: timedOut,
        maxReferencesReached: references.length >= maxReferences,
        timeoutMs: timeoutMs,
        totalFound: references.length,
        totalFormatted: formattedReferences.length
      }
    };
    
  } catch (error) {
    const commandId = params.commandId || 'get_variable_references';
    sendProgressUpdate(commandId, 'get_variable_references', 'error', 0, 0, 0, `Error: ${error.message}`);
    throw new Error(`Failed to get variable references: ${error.message}`);
  }
}

/**
 * Set a variable's value for a specific mode
 */
async function setVariableModeValue(params) {
  try {
    const { variableId, modeId, value } = params;
    
    // Validate required parameters
    if (!variableId) {
      throw new Error('Variable ID is required');
    }
    
    if (!modeId) {
      throw new Error('Mode ID is required');
    }
    
    if (value === undefined || value === null) {
      throw new Error('Value is required');
    }
    
    // Get the variable
    const variable = await figma.variables.getVariableByIdAsync(variableId);
    if (!variable) {
      throw new Error(`Variable not found: ${variableId}`);
    }
    
    // Set the value for the specific mode
    variable.setValueForMode(modeId, value);
    
    return {
      success: true,
      message: `Variable "${variable.name}" value set for mode "${modeId}"`,
      variable: {
        id: variable.id,
        name: variable.name,
        modeId: modeId,
        value: value
      }
    };
    
  } catch (error) {
    throw new Error(`Failed to set variable mode value: ${error.message}`);
  }
}

/**
 * Create a new mode in a variable collection
 */
async function createVariableMode(params) {
  try {
    const { collectionId, modeName } = params;
    
    // Validate required parameters
    if (!collectionId) {
      throw new Error('Collection ID is required');
    }
    
    if (!modeName || typeof modeName !== 'string' || modeName.trim().length === 0) {
      throw new Error('Mode name is required and cannot be empty');
    }
    
    // Get the collection
    const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
    if (!collection) {
      throw new Error(`Variable collection not found: ${collectionId}`);
    }
    
    // Create the new mode
    const newMode = collection.addMode(modeName.trim());
    
    return {
      success: true,
      message: `Mode "${modeName}" created in collection "${collection.name}"`,
      mode: {
        modeId: newMode.modeId,
        name: newMode.name
      },
      collection: {
        id: collection.id,
        name: collection.name,
        totalModes: collection.modes.length
      }
    };
    
  } catch (error) {
    throw new Error(`Failed to create variable mode: ${error.message}`);
  }
}

/**
 * Delete a mode from a variable collection
 */
async function deleteVariableMode(params) {
  try {
    const { collectionId, modeId } = params;
    
    // Validate required parameters
    if (!collectionId) {
      throw new Error('Collection ID is required');
    }
    
    if (!modeId) {
      throw new Error('Mode ID is required');
    }
    
    // Get the collection
    const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
    if (!collection) {
      throw new Error(`Variable collection not found: ${collectionId}`);
    }
    
    // Find the mode to delete
    const modeToDelete = collection.modes.find(mode => mode.modeId === modeId);
    if (!modeToDelete) {
      throw new Error(`Mode not found: ${modeId}`);
    }
    
    // Cannot delete the last mode
    if (collection.modes.length === 1) {
      throw new Error('Cannot delete the last mode in a collection');
    }
    
    const modeName = modeToDelete.name;
    
    // Delete the mode
    collection.removeMode(modeId);
    
    return {
      success: true,
      message: `Mode "${modeName}" deleted from collection "${collection.name}"`,
      deletedMode: {
        modeId: modeId,
        name: modeName
      },
      collection: {
        id: collection.id,
        name: collection.name,
        remainingModes: collection.modes.length
      }
    };
    
  } catch (error) {
    throw new Error(`Failed to delete variable mode: ${error.message}`);
  }
}

/**
 * Reorder modes in a variable collection
 */
async function reorderVariableModes(params) {
  try {
    const { collectionId, modeIds } = params;
    
    // Validate required parameters
    if (!collectionId) {
      throw new Error('Collection ID is required');
    }
    
    if (!modeIds || !Array.isArray(modeIds) || modeIds.length === 0) {
      throw new Error('Mode IDs array is required and cannot be empty');
    }
    
    // Get the collection
    const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
    if (!collection) {
      throw new Error(`Variable collection not found: ${collectionId}`);
    }
    
    // Validate that all mode IDs exist in the collection
    const existingModeIds = collection.modes.map(mode => mode.modeId);
    const invalidModeIds = modeIds.filter(id => !existingModeIds.includes(id));
    
    if (invalidModeIds.length > 0) {
      throw new Error(`Invalid mode IDs: ${invalidModeIds.join(', ')}`);
    }
    
    if (modeIds.length !== existingModeIds.length) {
      throw new Error('All modes must be included in the reorder operation');
    }
    
    // Reorder the modes
    collection.reorderModes(modeIds);
    
    return {
      success: true,
      message: `Modes reordered in collection "${collection.name}"`,
      collection: {
        id: collection.id,
        name: collection.name,
        reorderedModes: collection.modes.map(mode => ({
          modeId: mode.modeId,
          name: mode.name
        }))
      }
    };
    
  } catch (error) {
    throw new Error(`Failed to reorder variable modes: ${error.message}`);
  }
}

/**
 * Publish a variable collection to make it available to other files
 */
async function publishVariableCollection(params) {
  try {
    const { collectionId } = params;
    
    // Validate required parameters
    if (!collectionId) {
      throw new Error('Collection ID is required');
    }
    
    // Get the collection
    const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);
    if (!collection) {
      throw new Error(`Variable collection not found: ${collectionId}`);
    }
    
    // Publish the collection
    await collection.publishAsync();
    
    return {
      success: true,
      message: `Variable collection "${collection.name}" published successfully`,
      collection: {
        id: collection.id,
        name: collection.name,
        remote: collection.remote
      }
    };
    
  } catch (error) {
    throw new Error(`Failed to publish variable collection: ${error.message}`);
  }
}

/**
 * Get published variables from team library
 */
async function getPublishedVariables(params = {}) {
  try {
    const { collectionId, type, limit = 100 } = params;
    
    // Get published variables
    let publishedVariables = figma.variables.getPublishedVariables();
    
    // Apply filters
    if (collectionId) {
      publishedVariables = publishedVariables.filter(variable => 
        variable.variableCollectionId === collectionId
      );
    }
    
    if (type) {
      publishedVariables = publishedVariables.filter(variable => 
        variable.resolvedType === type
      );
    }
    
    // Apply limit
    publishedVariables = publishedVariables.slice(0, limit);
    
    // Format response
    const formattedVariables = publishedVariables.map(variable => ({
      id: variable.id,
      name: variable.name,
      resolvedType: variable.resolvedType,
      description: variable.description,
      variableCollectionId: variable.variableCollectionId,
      remote: variable.remote
    }));
    
    return {
      success: true,
      publishedVariables: formattedVariables,
      total: formattedVariables.length
    };
    
  } catch (error) {
    throw new Error(`Failed to get published variables: ${error.message}`);
  }
}
