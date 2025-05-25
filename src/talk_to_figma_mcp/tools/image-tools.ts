import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sendCommandToFigma } from "../utils/websocket";

// Define a type for tool responses
type CallToolResult = {
  content: Array<{
    type: "text";
    text: string;
  }>;
  structuredContent: Record<string, any>;
  isError?: boolean;
};

// Define common types for image operations
const RGBAColorSchema = z.object({
  r: z.number().min(0).max(1).describe("Red component (0-1)"),
  g: z.number().min(0).max(1).describe("Green component (0-1)"),
  b: z.number().min(0).max(1).describe("Blue component (0-1)"),
  a: z.number().min(0).max(1).optional().describe("Alpha component (0-1)")
});

/**
 * Create a properly typed success response
 * @param message - Success message to display
 * @param data - Data to include in the structured content
 * @returns Properly typed success response
 */
function createSuccessResponse(message: string | string[], data: any): CallToolResult {
  const messages = Array.isArray(message) ? message : [message];
  return {
    content: messages.map(msg => ({
      type: "text" as const,
      text: msg
    })),
    structuredContent: data
  };
}

/**
 * Format error responses consistently
 * @param operation - The operation that failed
 * @param error - The error that occurred
 * @returns Formatted error response
 */
function formatErrorResponse(operation: string, error: unknown): CallToolResult {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`Error in ${operation}:`, error);
  return {
    content: [
      {
        type: "text" as const,
        text: `Error ${operation}: ${errorMessage}`
      }
    ],
    structuredContent: {
      error: {
        message: errorMessage,
        operation
      }
    },
    isError: true
  };
}

/**
 * Register image-related tools to the MCP server
 * This module contains tools for working with images in Figma
 * @param server - The MCP server instance
 */
/**
 * Register a simplified tool for AI agents to easily find and insert images
 * This is a higher-level tool that combines multiple image operations
 * @param server - The MCP server instance
 */
function registerAIImageTools(server: McpServer): void {
  server.tool(
    "find_and_insert_image",
    "Find and insert an appropriate image based on the design context or a specific query",
    {
      context: z.string().optional().describe("Design context or specific query for the image"),
      nodeId: z.string().optional().describe("ID of a node to analyze for context (if context not provided)"),
      position: z.object({
        x: z.number().describe("X position"),
        y: z.number().describe("Y position"),
      }).describe("Position for the image"),
      size: z.object({
        width: z.number().optional().describe("Width of the image"),
        height: z.number().optional().describe("Height of the image"),
      }).optional().describe("Size of the image"),
      parentId: z.string().optional().describe("Parent node ID to append the image to"),
      imageType: z.enum(["PHOTO", "ILLUSTRATION", "ICON", "VECTOR"]).optional().describe("Type of image to search for"),
    },
    async ({ context, nodeId, position, size, parentId, imageType }) => {
      try {
        console.log("Starting find_and_insert_image");

        let searchQuery = context;

        // If no context provided but nodeId is, analyze the node for context
        if (!searchQuery && nodeId) {
          console.log("No context provided, analyzing node:", nodeId);

          const analysisResult = await sendCommandToFigma("analyze_node_context", {
            nodeId
          });

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
        const searchResults = await sendCommandToFigma("search_images", {
          query: searchQuery,
          imageType,
          maxResults: 1
        });

        // If no results found, return an error
        if (!searchResults.images || searchResults.images.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No images found for query: ${searchQuery}`
              }
            ],
            structuredContent: {
              error: {
                message: `No images found for query: ${searchQuery}`,
                operation: "searching for images"
              }
            },
            isError: true
          };
        }

        // Get the first result
        const selectedImage = searchResults.images[0];

        // Insert the image
        const insertResult = await sendCommandToFigma("insert_image_from_url", {
          imageUrl: selectedImage.url,
          x: position.x,
          y: position.y,
          width: size?.width,
          height: size?.height,
          name: `${searchQuery} image`,
          parentId,
          scaleMode: "FIT"
        });

        return {
          content: [
            {
              type: "text",
              text: `Successfully found and inserted image for "${searchQuery}"`
            },
            {
              type: "text",
              text: `Image source: ${selectedImage.source || "Unknown"}`
            },
            {
              type: "text",
              text: `Node ID: ${insertResult.id || "Unknown"}`
            }
          ],
          structuredContent: {
            query: searchQuery,
            insertResult,
            selectedImage
          }
        };
      } catch (error) {
        console.error("Error in find_and_insert_image:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error finding and inserting image: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          structuredContent: {
            error: {
              message: error instanceof Error ? error.message : String(error),
              operation: "finding and inserting image"
            }
          },
          isError: true
        };
      }
    }
  );
}

export function registerImageTools(server: McpServer): void {
  // Register the AI-focused image tools
  registerAIImageTools(server);

  // Insert Image from URL Tool - Essential base tool
  server.tool(
    "insert_image_from_url",
    "Insert an image from a URL into the Figma document or create a placeholder if the image cannot be loaded",
    {
      imageUrl: z.string().describe("URL of the image to insert"),
      x: z.number().describe("X position"),
      y: z.number().describe("Y position"),
      width: z.number().optional().describe("Optional width of the image"),
      height: z.number().optional().describe("Optional height of the image"),
      name: z.string().optional().describe("Optional name for the image node"),
      parentId: z.string().optional().describe("Optional parent node ID to append the image to"),
      scaleMode: z.enum(["FILL", "FIT", "CROP", "TILE"]).optional().describe("How to scale the image within its frame"),
      previewBeforeInsert: z.boolean().optional().describe("Whether to show a preview before inserting the image"),
      fallbackColor: RGBAColorSchema.optional().describe("Fallback color to use if image loading fails"),
    },
    async ({ imageUrl, x, y, width, height, name, parentId, scaleMode, previewBeforeInsert, fallbackColor }) => {
      try {
        // Add preview functionality if requested
        if (previewBeforeInsert) {
          await sendCommandToFigma("preview_image", {
            imageUrl,
            operation: "insert"
          });
        }

        const result = await sendCommandToFigma("insert_image_from_url", {
          imageUrl,
          x,
          y,
          width,
          height,
          name,
          parentId,
          scaleMode,
          fallbackColor: fallbackColor || { r: 0.9, g: 0.9, b: 0.9 }
        });

        return createSuccessResponse([
          `Successfully inserted image from ${imageUrl}`,
          `Node ID: ${result.id}`
        ], { result });
      } catch (error) {
        return formatErrorResponse("inserting image", error);
      }
    }
  );

  // Replace Image Tool - Essential for updating images
  server.tool(
    "replace_image",
    "Replace an existing image with a new one from a URL",
    {
      nodeId: z.string().describe("The ID of the image node to replace"),
      imageUrl: z.string().describe("URL of the new image"),
    },
    async ({ nodeId, imageUrl }) => {
      try {
        const result = await sendCommandToFigma("replace_image", {
          nodeId,
          imageUrl
        });
        return createSuccessResponse(
          `Successfully replaced image`,
          { result }
        );
      } catch (error) {
        return formatErrorResponse("replacing image", error);
      }
    }
  );

  // Get Image Metadata Tool - Useful for understanding existing images
  server.tool(
    "get_image_metadata",
    "Get metadata about an image (dimensions, format, etc.)",
    {
      nodeId: z.string().describe("The ID of the image node"),
    },
    async ({ nodeId }) => {
      try {
        const result = await sendCommandToFigma("get_image_metadata", {
          nodeId
        });
        return createSuccessResponse(
          `Image metadata retrieved successfully`,
          { metadata: result }
        );
      } catch (error) {
        return formatErrorResponse("getting image metadata", error);
      }
    }
  );

  // Search and Insert Image Tool
  server.tool(
    "search_and_insert_image",
    "Search for and automatically insert relevant images based on a query",
    {
      query: z.string().describe("Search query for the image"),
      x: z.number().describe("X position"),
      y: z.number().describe("Y position"),
      width: z.number().optional().describe("Optional width of the image"),
      height: z.number().optional().describe("Optional height of the image"),
      parentId: z.string().optional().describe("Optional parent node ID to append the image to"),
      imageType: z.enum(["PHOTO", "ILLUSTRATION", "ICON", "VECTOR"]).optional().describe("Type of image to search for"),
      style: z.string().optional().describe("Style description for the image (e.g., 'minimalist', 'colorful')"),
      orientation: z.enum(["LANDSCAPE", "PORTRAIT", "SQUARE"]).optional().describe("Preferred orientation of the image"),
      maxResults: z.number().min(1).max(10).optional().describe("Maximum number of results to return for selection"),
      autoSelect: z.boolean().optional().describe("Whether to automatically select the best match or present options"),
      licenseType: z.enum(["FREE", "COMMERCIAL", "EDITORIAL"]).optional().describe("License type for the image")
    },
    async ({ query, x, y, width, height, parentId, imageType, style, orientation, maxResults, autoSelect, licenseType }) => {
      try {
        console.log("Starting search_and_insert_image with query:", query);

        // First, search for images based on the query and parameters
        const searchResults = await sendCommandToFigma("search_images", {
          query,
          imageType,
          style,
          orientation,
          maxResults: maxResults || 5,
          licenseType: licenseType || "FREE"
        });

        console.log("Search results:", searchResults);

        // If no results found, return an error
        if (!searchResults.images || searchResults.images.length === 0) {
          console.error(`No images found for query: ${query}`);
          return {
            content: [
              {
                type: "text",
                text: `Error: No images found for query: ${query}`
              }
            ],
            structuredContent: {
              error: {
                message: `No images found for query: ${query}`,
                operation: "searching for images"
              }
            },
            isError: true
          };
        }

        let selectedImage;

        // If autoSelect is true or not specified, use the first result
        if (autoSelect !== false) {
          selectedImage = searchResults.images[0];
        } else {
          // Otherwise, let the user select from the results
          // This would typically involve showing a UI for selection
          // For now, we'll just use the first result as a fallback
          selectedImage = searchResults.images[0];
        }

        console.log("Selected image:", selectedImage);

        // Insert the selected image
        const insertResult = await sendCommandToFigma("insert_image_from_url", {
          imageUrl: selectedImage.url,
          x,
          y,
          width,
          height,
          name: `${query} image`,
          parentId,
          scaleMode: "FIT"
        });

        console.log("Insert result:", insertResult);

        return {
          content: [
            {
              type: "text",
              text: `Successfully found and inserted image for "${query}"`
            },
            {
              type: "text",
              text: `Image source: ${selectedImage.source || "Unknown"}`
            },
            {
              type: "text",
              text: `Node ID: ${insertResult.id || "Unknown"}`
            }
          ],
          structuredContent: {
            insertResult,
            searchResults: searchResults.images,
            selectedImage
          }
        };
      } catch (error) {
        console.error("Error in search_and_insert_image:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error searching and inserting image: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          structuredContent: {
            error: {
              message: error instanceof Error ? error.message : String(error),
              operation: "searching and inserting image"
            }
          },
          isError: true
        };
      }
    }
  );

  // Context-Aware Image Insertion Tool
  server.tool(
    "context_aware_image_insertion",
    "Analyze design context and automatically insert relevant images",
    {
      nodeId: z.string().describe("ID of the node to analyze for context (usually a frame or page)"),
      x: z.number().describe("X position for the image"),
      y: z.number().describe("Y position for the image"),
      width: z.number().optional().describe("Optional width of the image"),
      height: z.number().optional().describe("Optional height of the image"),
      parentId: z.string().optional().describe("Optional parent node ID to append the image to"),
      imageType: z.enum(["PHOTO", "ILLUSTRATION", "ICON", "VECTOR"]).optional().describe("Type of image to search for"),
      maxResults: z.number().min(1).max(5).optional().describe("Maximum number of images to insert"),
      autoInsert: z.boolean().optional().describe("Whether to automatically insert the images without confirmation")
    },
    async ({ nodeId, x, y, width, height, parentId, imageType, maxResults = 1, autoInsert = true }) => {
      try {
        console.log("Starting context-aware image insertion for node:", nodeId);

        // First, analyze the node to determine context
        const analysisResult = await sendCommandToFigma("analyze_node_context", {
          nodeId
        });

        console.log("Context analysis result:", analysisResult);

        if (!analysisResult.keywords || analysisResult.keywords.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "Could not determine context from the selected node. Please provide more text content in your design or use the search_and_insert_image tool directly."
              }
            ],
            structuredContent: {
              error: {
                message: "No context keywords found",
                operation: "analyzing design context"
              }
            },
            isError: true
          };
        }

        // Use the top keywords for image search
        const query = analysisResult.keywords.slice(0, 3).join(" ");
        console.log("Generated search query from context:", query);

        // Search for images based on the context
        const searchResults = await sendCommandToFigma("search_images", {
          query,
          imageType,
          maxResults: maxResults || 1
        });

        console.log("Search results:", searchResults);

        // If no results found, return an error
        if (!searchResults.images || searchResults.images.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No images found for context query: ${query}`
              }
            ],
            structuredContent: {
              error: {
                message: `No images found for context query: ${query}`,
                operation: "searching for images"
              }
            },
            isError: true
          };
        }

        // If autoInsert is true, insert the images
        const insertedImages = [];
        if (autoInsert) {
          for (let i = 0; i < Math.min(searchResults.images.length, maxResults); i++) {
            const image = searchResults.images[i];
            const insertX = x + (i * (width || 200) * 1.1); // Offset each image slightly

            const insertResult = await sendCommandToFigma("insert_image_from_url", {
              imageUrl: image.url,
              x: insertX,
              y,
              width,
              height,
              name: `Context image: ${image.title || query}`,
              parentId,
              scaleMode: "FIT"
            });

            insertedImages.push({
              id: insertResult.id,
              url: image.url,
              title: image.title
            });
          }
        }

        return {
          content: [
            {
              type: "text",
              text: `Successfully analyzed design context and found relevant images for "${query}"`
            },
            {
              type: "text",
              text: `Inserted ${insertedImages.length} images based on your design context`
            }
          ],
          structuredContent: {
            contextQuery: query,
            keywords: analysisResult.keywords,
            searchResults: searchResults.images,
            insertedImages
          }
        };
      } catch (error) {
        console.error("Error in context_aware_image_insertion:", error);
        return {
          content: [
            {
              type: "text",
              text: `Error analyzing context and inserting images: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          structuredContent: {
            error: {
              message: error instanceof Error ? error.message : String(error),
              operation: "context-aware image insertion"
            }
          },
          isError: true
        };
      }
    }
  );


}