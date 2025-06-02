import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "../utils/websocket";

// Design context analysis types
interface DesignContext {
  theme: string;
  industry: string;
  designType: string;
  imageOpportunities: ImageOpportunity[];
  colorScheme?: string;
  style?: string;
}

interface ImageOpportunity {
  type: 'hero' | 'product' | 'avatar' | 'icon' | 'background' | 'gallery' | 'banner';
  description: string;
  searchQuery: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  priority: number; // 1-10, higher = more important
}

// Design templates for different use cases
const DESIGN_TEMPLATES = {
  'e-commerce': {
    imageOpportunities: [
      { type: 'hero', description: 'Main product hero image', searchQuery: 'product showcase', priority: 10 },
      { type: 'product', description: 'Product gallery images', searchQuery: 'product photos', priority: 9 },
      { type: 'avatar', description: 'Customer review avatars', searchQuery: 'customer portraits', priority: 6 }
    ]
  },
  'food-delivery': {
    imageOpportunities: [
      { type: 'hero', description: 'Food hero banner', searchQuery: 'delicious food', priority: 10 },
      { type: 'product', description: 'Menu item photos', searchQuery: 'food dishes', priority: 9 },
      { type: 'icon', description: 'Category icons', searchQuery: 'food category icons', priority: 7 }
    ]
  },
  'mobile-app': {
    imageOpportunities: [
      { type: 'hero', description: 'App showcase image', searchQuery: 'mobile app interface', priority: 9 },
      { type: 'avatar', description: 'User profile images', searchQuery: 'user avatars', priority: 7 },
      { type: 'icon', description: 'Feature icons', searchQuery: 'app icons', priority: 8 }
    ]
  },
  'saas-platform': {
    imageOpportunities: [
      { type: 'hero', description: 'Platform dashboard preview', searchQuery: 'dashboard interface', priority: 9 },
      { type: 'icon', description: 'Feature icons', searchQuery: 'tech icons', priority: 8 },
      { type: 'avatar', description: 'Team member photos', searchQuery: 'professional portraits', priority: 6 }
    ]
  }
};

/**
 * Analyze a design prompt to extract context and identify image opportunities
 */
function analyzeDesignPrompt(prompt: string): DesignContext {
  const lowerPrompt = prompt.toLowerCase();
  
  // Detect industry/theme
  let theme = 'general';
  let industry = 'general';
  
  if (lowerPrompt.includes('food') || lowerPrompt.includes('restaurant') || lowerPrompt.includes('delivery')) {
    theme = 'food-delivery';
    industry = 'food';
  } else if (lowerPrompt.includes('ecommerce') || lowerPrompt.includes('e-commerce') || lowerPrompt.includes('shop') || lowerPrompt.includes('store')) {
    theme = 'e-commerce';
    industry = 'retail';
  } else if (lowerPrompt.includes('mobile app') || lowerPrompt.includes('app interface')) {
    theme = 'mobile-app';
    industry = 'technology';
  } else if (lowerPrompt.includes('saas') || lowerPrompt.includes('dashboard') || lowerPrompt.includes('platform')) {
    theme = 'saas-platform';
    industry = 'technology';
  }
  
  // Detect design type
  let designType = 'general';
  if (lowerPrompt.includes('landing page') || lowerPrompt.includes('homepage')) {
    designType = 'landing-page';
  } else if (lowerPrompt.includes('product page')) {
    designType = 'product-page';
  } else if (lowerPrompt.includes('mobile') || lowerPrompt.includes('app')) {
    designType = 'mobile-interface';
  }
  
  // Get template-based image opportunities
  const template = DESIGN_TEMPLATES[theme as keyof typeof DESIGN_TEMPLATES] || DESIGN_TEMPLATES['mobile-app'];
  const imageOpportunities = template.imageOpportunities.map(opp => ({
    ...opp,
    position: { x: 100, y: 100 }, // Will be calculated based on layout
    size: { width: 200, height: 150 } // Default size, will be adjusted
  }));
  
  return {
    theme,
    industry,
    designType,
    imageOpportunities
  };
}

/**
 * Create a complete design with automatic image integration
 */
export function registerDesignOrchestrator(server: McpServer): void {
  server.tool(
    "create_smart_design",
    "Create a complete design with automatic image integration based on the design prompt",
    {
      prompt: z.string().describe("Design prompt describing what to create"),
      canvasWidth: z.number().optional().describe("Canvas width (default: 1200)"),
      canvasHeight: z.number().optional().describe("Canvas height (default: 800)"),
      autoInsertImages: z.boolean().optional().describe("Whether to automatically insert relevant images (default: true)"),
      imageQuality: z.enum(["low", "medium", "high"]).optional().describe("Quality of images to search for"),
      maxImages: z.number().min(1).max(10).optional().describe("Maximum number of images to insert (default: 5)")
    },
    async ({ prompt, canvasWidth = 1200, canvasHeight = 800, autoInsertImages = true, imageQuality = "medium", maxImages = 5 }) => {
      try {
        console.log("Starting smart design creation with prompt:", prompt);
        
        // Step 1: Analyze the design prompt
        const context = analyzeDesignPrompt(prompt);
        console.log("Design context analyzed:", context);
        
        // Step 2: Create the main frame
        const frameResult = await sendCommandToFigma("create_frame", {
          x: 0,
          y: 0,
          width: canvasWidth,
          height: canvasHeight,
          name: `${context.theme} Design`,
          fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }]
        });
        
        const frameId = frameResult.id;
        console.log("Main frame created:", frameId);
        
        // Step 3: Create basic layout structure
        const layoutElements = await createLayoutStructure(frameId, context, canvasWidth, canvasHeight);
        console.log("Layout structure created:", layoutElements);
        
        // Step 4: Insert images automatically if enabled
        const insertedImages = [];
        if (autoInsertImages) {
          const imagesToInsert = context.imageOpportunities
            .sort((a, b) => b.priority - a.priority)
            .slice(0, maxImages);
          
          for (const imageOpp of imagesToInsert) {
            try {
              // Calculate position based on layout
              const position = calculateImagePosition(imageOpp, layoutElements, canvasWidth, canvasHeight);
              
              // Search and insert image
              const searchResult = await sendCommandToFigma("search_images", {
                query: `${imageOpp.searchQuery} ${context.industry}`,
                imageType: imageOpp.type === 'icon' ? 'ICON' : 'PHOTO',
                maxResults: 1
              });
              
              if (searchResult.images && searchResult.images.length > 0) {
                const insertResult = await sendCommandToFigma("insert_image_from_url", {
                  imageUrl: searchResult.images[0].url,
                  x: position.x,
                  y: position.y,
                  width: position.width,
                  height: position.height,
                  name: `${imageOpp.type}: ${imageOpp.description}`,
                  parentId: frameId,
                  scaleMode: "FIT"
                });
                
                insertedImages.push({
                  type: imageOpp.type,
                  description: imageOpp.description,
                  nodeId: insertResult.id,
                  position
                });
              }
            } catch (error) {
              console.warn(`Failed to insert image for ${imageOpp.type}:`, error);
            }
          }
        }
        
        // Step 5: Add contextual text elements
        await addContextualText(frameId, context, layoutElements);
        
        return {
          content: [
            {
              type: "text",
              text: `Successfully created ${context.theme} design with ${insertedImages.length} automatically inserted images`
            },
            {
              type: "text", 
              text: `Design theme: ${context.theme}, Industry: ${context.industry}`
            },
            {
              type: "text",
              text: `Frame ID: ${frameId}`
            }
          ],
          structuredContent: {
            frameId,
            context,
            layoutElements,
            insertedImages,
            prompt
          }
        };
        
      } catch (error) {
        console.error("Error in create_smart_design:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error creating smart design: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          structuredContent: {
            error: {
              message: error instanceof Error ? error.message : String(error),
              operation: "creating smart design"
            }
          },
          isError: true
        };
      }
    }
  );
}

/**
 * Create basic layout structure based on design context
 */
async function createLayoutStructure(frameId: string, context: DesignContext, width: number, height: number) {
  const elements = [];
  
  // Create header section
  const headerResult = await sendCommandToFigma("create_frame", {
    x: 0,
    y: 0,
    width: width,
    height: 80,
    name: "Header",
    parentId: frameId,
    fills: [{ type: "SOLID", color: { r: 0.95, g: 0.95, b: 0.95 } }]
  });
  elements.push({ type: 'header', id: headerResult.id, bounds: { x: 0, y: 0, width, height: 80 } });
  
  // Create main content area
  const contentResult = await sendCommandToFigma("create_frame", {
    x: 0,
    y: 80,
    width: width,
    height: height - 160,
    name: "Content",
    parentId: frameId,
    fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }]
  });
  elements.push({ type: 'content', id: contentResult.id, bounds: { x: 0, y: 80, width, height: height - 160 } });
  
  return elements;
}

/**
 * Calculate optimal position for images based on layout and image type
 */
function calculateImagePosition(imageOpp: ImageOpportunity, layoutElements: any[], canvasWidth: number, canvasHeight: number) {
  const contentArea = layoutElements.find(el => el.type === 'content');
  
  switch (imageOpp.type) {
    case 'hero':
      return {
        x: contentArea.bounds.x + 50,
        y: contentArea.bounds.y + 50,
        width: Math.min(400, contentArea.bounds.width - 100),
        height: 250
      };
    case 'product':
      return {
        x: contentArea.bounds.x + 50,
        y: contentArea.bounds.y + 320,
        width: 180,
        height: 180
      };
    case 'avatar':
      return {
        x: contentArea.bounds.x + contentArea.bounds.width - 100,
        y: contentArea.bounds.y + 50,
        width: 60,
        height: 60
      };
    default:
      return {
        x: contentArea.bounds.x + 50,
        y: contentArea.bounds.y + 50,
        width: 200,
        height: 150
      };
  }
}

/**
 * Add contextual text elements to the design
 */
async function addContextualText(frameId: string, context: DesignContext, layoutElements: any[]) {
  const headerArea = layoutElements.find(el => el.type === 'header');
  
  // Add title text
  await sendCommandToFigma("create_text", {
    x: headerArea.bounds.x + 20,
    y: headerArea.bounds.y + 20,
    text: `${context.theme.replace('-', ' ').toUpperCase()} DESIGN`,
    fontSize: 24,
    fontWeight: "BOLD",
    parentId: frameId
  });
}
