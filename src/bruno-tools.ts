import { BrunoParser } from "./bruno-parser.js";
import debug from "debug";
import { z } from "zod";

const log = debug("bruno:tools");

// Define our standard schema interface
export interface BrunoToolSchema {
  environment?: string;
  variables?: Record<string, string>;
  body?: Record<string, any>;
  query?: Record<string, string>;
}

// Tool interface for MCP protocol
export interface BrunoTool {
  name: string;
  description: string;
  schema: any;
  handler: (params: BrunoToolSchema) => Promise<any>;
}

/**
 * Options for creating Bruno tools
 */
export interface BrunoToolsOptions {
  collectionPath: string;
  environment?: string;
  filterRequests?: (name: string) => boolean;
}

/**
 * Create tools from Bruno API requests
 * @param options - Options for creating tools
 * @returns Array of tools for use with MCP
 */
export async function createBrunoTools(
  options: BrunoToolsOptions
): Promise<BrunoTool[]> {
  const { collectionPath, environment, filterRequests } = options;

  if (!collectionPath) {
    throw new Error("Collection path is required");
  }

  log(`Creating tools from Bruno collection at ${collectionPath}`);
  log(`Using environment: ${environment || "default"}`);

  // Initialize the Bruno parser
  const parser = new BrunoParser(collectionPath, environment);
  await parser.init();

  const tools: BrunoTool[] = [];

  // Get available requests
  let availableRequests = parser.getAvailableRequests();
  log(`Found ${availableRequests.length} available requests`);

  // Apply filter if provided
  if (filterRequests) {
    log("Applying filter to requests");
    availableRequests = availableRequests.filter(filterRequests);
    log(`${availableRequests.length} requests after filtering`);
  }

  // Create a tool for each request
  for (const requestName of availableRequests) {
    try {
      log(`Creating tool for request: ${requestName}`);

      // Parse the request
      const parsedRequest = await parser.parseRequest(requestName);

      // Generate a unique tool name
      const toolName = createToolName(parsedRequest.name);

      // Create our standardized schema
      const schema = {
        environment: {
          type: "string",
          description: "Optional environment to use for this request",
        },
        variables: {
          type: "object",
          additionalProperties: {
            type: "string",
          },
          description: "Optional variables to override for this request",
        },
        query: {
          type: "object",
          additionalProperties: {
            type: "string",
          },
          description: "Optional query parameters to add to the request URL",
        },
        body: {
          type: "object",
          description: "Request body parameters",
          additionalProperties: true,
        },
      };

      // Build tool description
      let description = `Execute ${parsedRequest.method} request to ${
        parsedRequest.rawRequest?.http?.url || parsedRequest.url
      }`;

      // Add documentation if available
      if (parsedRequest.rawRequest?.docs) {
        description += "\n\n" + parsedRequest.rawRequest.docs;
      }

      // Create the tool handler
      const handler = async (params: BrunoToolSchema) => {
        try {
          const { environment } = params;
          log(
            `Executing request "${requestName}" with params: ${JSON.stringify(
              params,
              null,
              2
            )}`
          );

          // Set environment if provided
          if (environment && typeof environment === "string") {
            log(`Using environment from params: ${environment}`);
            parser.setEnvironment(environment);
          }

          const response = await parser.executeRequest(parsedRequest, params);

          if (response.error) {
            log(`Error executing request "${requestName}":`, response.data);
            return {
              success: false,
              message: `Error: ${response.data}`,
            };
          }

          // Format the response
          return {
            success: true,
            message: "Request executed successfully.",
            status: response.status,
            headers: response.headers,
            data: response.data,
          };
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          log(`Error in handler for request "${requestName}":`, errorMessage);
          return {
            success: false,
            message: `Error: ${errorMessage}`,
          };
        }
      };

      // Add the tool to the list
      tools.push({
        name: toolName,
        description,
        schema,
        handler,
      });

      log(`Created tool: ${toolName}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log(`Error creating tool for request "${requestName}":`, errorMessage);
    }
  }

  log(`Created ${tools.length} tools from Bruno collection`);
  return tools;
}

/**
 * Create a valid tool name from a request name
 * @param requestName - The name of the request
 * @returns A valid tool name
 */
function createToolName(requestName: string): string {
  // Replace spaces and special characters with underscores
  let name = requestName
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_");

  // Ensure the name starts with a valid character
  if (!/^[a-z]/.test(name)) {
    name = "mcp_api_" + name;
  }
  return name;
}
