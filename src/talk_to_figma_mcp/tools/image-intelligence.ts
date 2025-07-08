import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "../utils/websocket";

// Enhanced image context analysis
interface ImageContext {
  designTheme: string;
  suggestedImages: SuggestedImage[];
  placementStrategy: PlacementStrategy;
}

interface SuggestedImage {
  type: 'hero' | 'product' | 'avatar' | 'icon' | 'background' | 'gallery' | 'banner' | 'logo';
  searchQuery: string;
  description: string;
  priority: number;
  placement: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  style: string;
  context: string;
}

interface PlacementStrategy {
  layout: 'grid' | 'hero-focused' | 'sidebar' | 'masonry';
  spacing: number;
  alignment: 'left' | 'center' | 'right';
}

// Industry-specific image mappings
const INDUSTRY_IMAGE_MAPPING = {
  'food': {
    hero: ['delicious food photography', 'restaurant ambiance', 'chef cooking'],
    product: ['food dishes', 'menu items', 'ingredients'],
    background: ['kitchen background', 'restaurant interior', 'food texture'],
    icon: ['food icons', 'utensil icons', 'cooking icons']
  },
  'ecommerce': {
    hero: ['product showcase', 'shopping experience', 'lifestyle photography'],
    product: ['product photography', 'item details', 'product variants'],
    background: ['clean backgrounds', 'shopping patterns', 'minimal textures'],
    icon: ['shopping icons', 'ecommerce icons', 'payment icons']
  },
  'technology': {
    hero: ['tech innovation', 'digital interfaces', 'modern technology'],
    product: ['software screenshots', 'device mockups', 'app interfaces'],
    background: ['tech patterns', 'circuit backgrounds', 'gradient backgrounds'],
    icon: ['tech icons', 'software icons', 'digital icons']
  },
  'healthcare': {
    hero: ['medical professionals', 'healthcare technology', 'patient care'],
    product: ['medical devices', 'health apps', 'treatment options'],
    background: ['medical backgrounds', 'clean environments', 'health patterns'],
    icon: ['medical icons', 'health icons', 'care icons']
  },
  'finance': {
    hero: ['financial growth', 'business success', 'investment concepts'],
    product: ['financial charts', 'banking interfaces', 'investment tools'],
    background: ['business backgrounds', 'financial patterns', 'professional textures'],
    icon: ['finance icons', 'money icons', 'business icons']
  }
};

/**
 * Analyze design content and suggest intelligent image placements
 */
export function registerImageIntelligence(server: McpServer): void {
  server.tool(
    "analyze_and_suggest_images",
    "Analyze the current design and intelligently suggest where and what images should be placed",
    {
      nodeId: z.string().describe("ID of the design node to analyze"),
      designPrompt: z.string().optional().describe("Original design prompt for additional context"),
      maxSuggestions: z.number().min(1).max(15).optional().describe("Maximum number of image suggestions"),
      autoPlace: z.boolean().optional().describe("Whether to automatically place the suggested images")
    },
    async ({ nodeId, designPrompt, maxSuggestions = 8, autoPlace = false }) => {
      try {
        console.log("Analyzing design for intelligent image suggestions:", nodeId);
        
        // Step 1: Analyze the design structure
        const designAnalysis = await analyzeDesignStructure(nodeId);
        console.log("Design structure analysis:", designAnalysis);
        
        // Step 2: Extract context from design prompt and existing content
        const context = await extractDesignContext(nodeId, designPrompt);
        console.log("Design context extracted:", context);
        
        // Step 3: Generate intelligent image suggestions
        const suggestions = generateImageSuggestions(designAnalysis, context, maxSuggestions);
        console.log("Generated image suggestions:", suggestions);
        
        // Step 4: Auto-place images if requested
        const placedImages = [];
        if (autoPlace) {
          for (const suggestion of suggestions) {
            try {
              const placementResult = await placeIntelligentImage(suggestion, nodeId);
              if (placementResult) {
                placedImages.push(placementResult);
              }
            } catch (error) {
              console.warn(`Failed to place image: ${suggestion.description}`, error);
            }
          }
        }
        
        return {
          content: [
            {
              type: "text",
              text: `Analyzed design and generated ${suggestions.length} intelligent image suggestions`
            },
            {
              type: "text",
              text: autoPlace ? `Successfully placed ${placedImages.length} images automatically` : "Use auto_place_suggested_images to place these suggestions"
            },
            {
              type: "text",
              text: `Design theme detected: ${context.designTheme}`
            }
          ],
          structuredContent: {
            suggestions,
            placedImages,
            context,
            designAnalysis
          }
        };
        
      } catch (error) {
        console.error("Error in analyze_and_suggest_images:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error analyzing design for image suggestions: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          structuredContent: {
            error: {
              message: error instanceof Error ? error.message : String(error),
              operation: "analyzing design for image suggestions"
            }
          },
          isError: true
        };
      }
    }
  );

  server.tool(
    "auto_place_suggested_images",
    "Automatically place images based on previous suggestions or new analysis",
    {
      nodeId: z.string().describe("ID of the design node"),
      suggestions: z.array(z.any()).optional().describe("Previous suggestions to place, or leave empty for new analysis"),
      imageQuality: z.enum(["low", "medium", "high"]).optional().describe("Quality of images to search for"),
      maxImages: z.number().min(1).max(10).optional().describe("Maximum number of images to place")
    },
    async ({ nodeId, suggestions, imageQuality = "medium", maxImages = 5 }) => {
      try {
        let imageSuggestions = suggestions;
        
        // If no suggestions provided, generate new ones
        if (!imageSuggestions) {
          const analysisResult = await server.callTool("analyze_and_suggest_images", {
            nodeId,
            maxSuggestions: maxImages,
            autoPlace: false
          });
          imageSuggestions = analysisResult.structuredContent?.suggestions || [];
        }
        
        const placedImages = [];
        const limitedSuggestions = imageSuggestions.slice(0, maxImages);
        
        for (const suggestion of limitedSuggestions) {
          try {
            const placementResult = await placeIntelligentImage(suggestion, nodeId, imageQuality);
            if (placementResult) {
              placedImages.push(placementResult);
            }
          } catch (error) {
            console.warn(`Failed to place image: ${suggestion.description}`, error);
          }
        }
        
        return {
          content: [
            {
              type: "text",
              text: `Successfully placed ${placedImages.length} out of ${limitedSuggestions.length} suggested images`
            }
          ],
          structuredContent: {
            placedImages,
            totalSuggestions: limitedSuggestions.length,
            successfulPlacements: placedImages.length
          }
        };
        
      } catch (error) {
        console.error("Error in auto_place_suggested_images:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error placing suggested images: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          structuredContent: {
            error: {
              message: error instanceof Error ? error.message : String(error),
              operation: "placing suggested images"
            }
          },
          isError: true
        };
      }
    }
  );
}

/**
 * Analyze the structure of a design to understand layout and content
 */
async function analyzeDesignStructure(nodeId: string) {
  try {
    const nodeInfo = await sendCommandToFigma("get_node_info", { nodeId });
    
    // Analyze child nodes to understand structure
    const structure = {
      hasHeader: false,
      hasFooter: false,
      hasSidebar: false,
      contentAreas: [],
      textElements: [],
      emptySpaces: [],
      totalWidth: nodeInfo.width || 0,
      totalHeight: nodeInfo.height || 0
    };
    
    // Simple heuristic analysis based on node positions and names
    if (nodeInfo.children) {
      for (const child of nodeInfo.children) {
        const childName = child.name?.toLowerCase() || '';
        
        if (childName.includes('header') || child.y < 100) {
          structure.hasHeader = true;
        }
        
        if (childName.includes('footer') || child.y > structure.totalHeight - 100) {
          structure.hasFooter = true;
        }
        
        if (child.type === 'TEXT') {
          structure.textElements.push(child);
        }
        
        // Identify potential content areas
        if (child.type === 'FRAME' && child.width > 200 && child.height > 200) {
          structure.contentAreas.push(child);
        }
      }
    }
    
    return structure;
  } catch (error) {
    console.error("Error analyzing design structure:", error);
    return {
      hasHeader: false,
      hasFooter: false,
      hasSidebar: false,
      contentAreas: [],
      textElements: [],
      emptySpaces: [],
      totalWidth: 1200,
      totalHeight: 800
    };
  }
}

/**
 * Extract design context from prompt and existing content
 */
async function extractDesignContext(nodeId: string, designPrompt?: string): Promise<ImageContext> {
  let designTheme = 'general';
  
  // Analyze prompt if provided
  if (designPrompt) {
    const prompt = designPrompt.toLowerCase();
    if (prompt.includes('food') || prompt.includes('restaurant')) {
      designTheme = 'food';
    } else if (prompt.includes('ecommerce') || prompt.includes('shop')) {
      designTheme = 'ecommerce';
    } else if (prompt.includes('tech') || prompt.includes('app') || prompt.includes('software')) {
      designTheme = 'technology';
    } else if (prompt.includes('health') || prompt.includes('medical')) {
      designTheme = 'healthcare';
    } else if (prompt.includes('finance') || prompt.includes('bank')) {
      designTheme = 'finance';
    }
  }
  
  // Try to analyze existing text content for additional context
  try {
    const textAnalysis = await sendCommandToFigma("scan_text_nodes", { nodeId });
    if (textAnalysis.textNodes) {
      const allText = textAnalysis.textNodes.map(node => node.characters).join(' ').toLowerCase();
      
      // Refine theme based on text content
      if (allText.includes('food') || allText.includes('menu') || allText.includes('restaurant')) {
        designTheme = 'food';
      } else if (allText.includes('shop') || allText.includes('buy') || allText.includes('cart')) {
        designTheme = 'ecommerce';
      }
    }
  } catch (error) {
    console.warn("Could not analyze text content for context:", error);
  }
  
  return {
    designTheme,
    suggestedImages: [],
    placementStrategy: {
      layout: 'hero-focused',
      spacing: 20,
      alignment: 'center'
    }
  };
}

/**
 * Generate intelligent image suggestions based on design analysis
 */
function generateImageSuggestions(designAnalysis: any, context: ImageContext, maxSuggestions: number): SuggestedImage[] {
  const suggestions: SuggestedImage[] = [];
  const industryMapping = INDUSTRY_IMAGE_MAPPING[context.designTheme as keyof typeof INDUSTRY_IMAGE_MAPPING] || INDUSTRY_IMAGE_MAPPING.technology;
  
  // Hero image suggestion (highest priority)
  if (designAnalysis.contentAreas.length > 0) {
    const mainArea = designAnalysis.contentAreas[0];
    suggestions.push({
      type: 'hero',
      searchQuery: industryMapping.hero[0],
      description: 'Main hero image for visual impact',
      priority: 10,
      placement: {
        x: mainArea.x + 20,
        y: mainArea.y + 20,
        width: Math.min(400, mainArea.width - 40),
        height: 250
      },
      style: 'professional',
      context: context.designTheme
    });
  }
  
  // Product/content images
  if (suggestions.length < maxSuggestions) {
    suggestions.push({
      type: 'product',
      searchQuery: industryMapping.product[0],
      description: 'Product or content showcase image',
      priority: 8,
      placement: {
        x: 50,
        y: 300,
        width: 200,
        height: 200
      },
      style: 'clean',
      context: context.designTheme
    });
  }
  
  // Icon suggestions
  if (suggestions.length < maxSuggestions) {
    suggestions.push({
      type: 'icon',
      searchQuery: industryMapping.icon[0],
      description: 'Contextual icons for features',
      priority: 6,
      placement: {
        x: 300,
        y: 350,
        width: 48,
        height: 48
      },
      style: 'minimal',
      context: context.designTheme
    });
  }
  
  return suggestions.slice(0, maxSuggestions);
}

/**
 * Place an intelligent image based on suggestion
 */
async function placeIntelligentImage(suggestion: SuggestedImage, parentId: string, quality: string = "medium") {
  try {
    // Search for image based on suggestion
    const searchResult = await sendCommandToFigma("search_images", {
      query: suggestion.searchQuery,
      imageType: suggestion.type === 'icon' ? 'ICON' : 'PHOTO',
      maxResults: 1
    });
    
    if (!searchResult.images || searchResult.images.length === 0) {
      console.warn(`No images found for: ${suggestion.searchQuery}`);
      return null;
    }
    
    // Insert the image
    const insertResult = await sendCommandToFigma("insert_image_from_url", {
      imageUrl: searchResult.images[0].url,
      x: suggestion.placement.x,
      y: suggestion.placement.y,
      width: suggestion.placement.width,
      height: suggestion.placement.height,
      name: `${suggestion.type}: ${suggestion.description}`,
      parentId,
      scaleMode: "FIT"
    });
    
    return {
      nodeId: insertResult.id,
      type: suggestion.type,
      description: suggestion.description,
      imageUrl: searchResult.images[0].url,
      placement: suggestion.placement
    };
    
  } catch (error) {
    console.error(`Error placing image for ${suggestion.description}:`, error);
    return null;
  }
}
