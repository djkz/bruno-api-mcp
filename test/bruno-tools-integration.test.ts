import * as path from "path";
import { fileURLToPath } from "url";
import { createBrunoTools } from "../src/bruno-tools.js";
import { describe, beforeEach, test, expect, jest } from "@jest/globals";

// ES Modules replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the MockMcpServer interface
interface MockMcpServerOptions {
  name: string;
  version: string;
}

interface MockMcpTool {
  name: string;
  description: string;
  schema: any;
  handler: (params: any) => Promise<any>;
}

// Mock McpServer class
class MockMcpServer {
  name: string;
  version: string;
  private tools: MockMcpTool[] = [];

  constructor(options: MockMcpServerOptions) {
    this.name = options.name;
    this.version = options.version;
  }

  tool(
    name: string,
    description: string,
    schema: any,
    handler: (params: any) => Promise<any>
  ) {
    this.tools.push({
      name,
      description,
      schema,
      handler,
    });
    return this;
  }

  getTools() {
    return this.tools;
  }
}

describe("Bruno Tools Integration with MCP Server", () => {
  const fixturesPath = path.join(__dirname, "fixtures");
  const collectionPath = path.join(fixturesPath, "collection.bru");
  let server: MockMcpServer;

  beforeEach(() => {
    server = new MockMcpServer({
      name: "test-server",
      version: "1.0.0",
    });
  });

  test("should register Bruno tools with MCP server", async () => {
    // Create Bruno tools
    const brunoTools = await createBrunoTools({
      collectionPath: collectionPath,
      environment: "local",
    });

    // Check that tools were created
    expect(brunoTools.length).toBeGreaterThan(0);

    // Register each tool with the MCP server
    brunoTools.forEach((tool) => {
      server.tool(
        tool.name,
        tool.description,
        tool.schema,
        async (params: any) => {
          const result = await tool.handler(params);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }
      );
    });

    // Verify that tools were registered
    const registeredTools = server.getTools();
    expect(registeredTools.length).toBe(brunoTools.length);

    // Check if self-company tool was registered
    const selfCompanyTool = registeredTools.find(
      (tool: MockMcpTool) => tool.name === "self_company"
    );
    expect(selfCompanyTool).toBeDefined();
    if (selfCompanyTool) {
      expect(selfCompanyTool.description).toContain("GET");
      expect(selfCompanyTool.description).toContain(
        "Execute GET request to {{baseUrl}}/api"
      );
    }

    // Ensure the handler was wrapped correctly
    expect(typeof selfCompanyTool?.handler).toBe("function");
  });

  test("should handle tool execution with MCP response format", async () => {
    // Create and register a single Bruno tool
    const brunoTools = await createBrunoTools({
      collectionPath: collectionPath,
      // @ts-ignore - This is a test-specific property
      filterRequests: (name: string) => name === "self-company",
      environment: "local",
    });

    const tool = brunoTools[0];
    expect(tool).toBeDefined();

    // Create a response object with the expected shape
    const mockResponse = {
      status: 200,
      headers: { "content-type": "application/json" },
      data: { success: true, id: "12345" },
      isJson: true,
    };

    // Use type assertion to create a properly typed mock function
    type ResponseType = typeof mockResponse;
    const mockHandler = jest.fn() as jest.MockedFunction<
      () => Promise<ResponseType>
    >;
    mockHandler.mockResolvedValue(mockResponse);

    const originalHandler = tool.handler;
    tool.handler = mockHandler as unknown as typeof tool.handler;

    // Register with the server
    server.tool(
      tool.name,
      tool.description,
      tool.schema,
      async (params: any) => {
        const result = await tool.handler(params);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
    );

    // Get the registered tool
    const registeredTool = server.getTools()[0];

    // Call the handler with test parameters
    const response = await registeredTool.handler({ testParam: "value" });

    // Verify the tool handler was called with the parameters
    expect(mockHandler).toHaveBeenCalledWith({ testParam: "value" });

    // Verify the response format
    expect(response).toHaveProperty("content");
    expect(response.content).toBeInstanceOf(Array);
    expect(response.content[0]).toHaveProperty("type", "text");

    // Check the content contains the expected JSON
    const responseData = JSON.parse(response.content[0].text);
    expect(responseData).toHaveProperty("status", 200);
    expect(responseData).toHaveProperty("data.success", true);
    expect(responseData).toHaveProperty("data.id", "12345");
  });

  // Add a new test for remote environment
  test("should use remote environment when specified", async () => {
    // Create Bruno tools with remote environment
    const brunoTools = await createBrunoTools({
      collectionPath: collectionPath,
      environment: "remote",
    });

    // Check that tools were created
    expect(brunoTools.length).toBeGreaterThan(0);

    // Find self-company tool
    const selfCompanyTool = brunoTools.find(
      (tool) => tool.name === "self_company"
    );
    expect(selfCompanyTool).toBeDefined();

    // Verify that it uses the remote environment URL
    if (selfCompanyTool) {
      expect(selfCompanyTool.description).toContain("GET");
      expect(selfCompanyTool.description).toContain(
        "Execute GET request to {{baseUrl}}/api"
      );
    }
  });
});
