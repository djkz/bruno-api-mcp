import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { createBrunoTools, BrunoToolSchema } from "./bruno-tools.js";
import { BrunoParser } from "./bruno-parser.js";

// Check for environment variables or command-line arguments for Bruno API path
const defaultBrunoApiPath = process.env.BRUNO_API_PATH || "";
const argIndex = process.argv.findIndex(
  (arg) => arg === "--bruno-path" || arg === "-b"
);
const argBrunoApiPath =
  argIndex !== -1 && argIndex < process.argv.length - 1
    ? process.argv[argIndex + 1]
    : null;

// Check for environment name parameter
const envIndex = process.argv.findIndex(
  (arg) => arg === "--environment" || arg === "-e"
);
const environment =
  envIndex !== -1 && envIndex < process.argv.length - 1
    ? process.argv[envIndex + 1]
    : null;

// Check for include-tools parameter
const includeToolsArg = process.argv.find(
  (arg) => arg.startsWith("--include-tools=") || arg === "--include-tools"
);
let includeTools: string[] | null = null;

if (includeToolsArg) {
  if (includeToolsArg.includes("=")) {
    // Format: --include-tools=tool1,tool2
    const toolsString = includeToolsArg.split("=")[1];
    if (toolsString) {
      includeTools = toolsString.split(",");
    }
  } else {
    // Format: --include-tools tool1,tool2
    const idx = process.argv.indexOf(includeToolsArg);
    if (idx !== -1 && idx < process.argv.length - 1) {
      includeTools = process.argv[idx + 1].split(",");
    }
  }
}

// Check for exclude-tools parameter
const excludeToolsArg = process.argv.find(
  (arg) => arg.startsWith("--exclude-tools=") || arg === "--exclude-tools"
);
let excludeTools: string[] | null = null;

if (excludeToolsArg) {
  if (excludeToolsArg.includes("=")) {
    // Format: --exclude-tools=tool1,tool2
    const toolsString = excludeToolsArg.split("=")[1];
    if (toolsString) {
      excludeTools = toolsString.split(",");
    }
  } else {
    // Format: --exclude-tools tool1,tool2
    const idx = process.argv.indexOf(excludeToolsArg);
    if (idx !== -1 && idx < process.argv.length - 1) {
      excludeTools = process.argv[idx + 1].split(",");
    }
  }
}

// For debugging only
if (process.env.DEBUG) {
  console.log("[DEBUG] Command line arguments:", process.argv);
  console.log("[DEBUG] Parsed includeTools:", includeTools);
  console.log("[DEBUG] Parsed excludeTools:", excludeTools);
}

const brunoApiPath = argBrunoApiPath || defaultBrunoApiPath;

// Create server instance
const server = new McpServer({
  name: "bruno-api-mcp-server",
  version: "1.0.0",
});

// Simple echo tool for testing
server.tool(
  "echo",
  "Echo back a message",
  { message: z.string().describe("The message to echo back") },
  async ({ message }) => ({
    content: [{ type: "text" as const, text: `Echo: ${message}` }],
  })
);

// Tool to list available environments
server.tool(
  "list_environments",
  "List all available environments in the Bruno API collection",
  {
    random_string: z
      .string()
      .optional()
      .describe("Dummy parameter for no-parameter tools"),
  },
  async () => {
    if (!brunoApiPath) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: false,
                message: "No Bruno API collection path configured",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    try {
      const parser = new BrunoParser(brunoApiPath + "/collection.bru");
      await parser.init();
      const environments = parser.getAvailableEnvironments();
      const currentEnv = parser.getCurrentEnvironment();

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                environments,
                current: currentEnv?.name,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: false,
                message: `Error listing environments: ${error}`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  }
);

// Create Express app
const app = express();
app.use(cors());

// Store active transports by session ID
const transports = new Map();

// Add SSE endpoint
app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);

  try {
    await server.connect(transport);

    // Save the transport for message routing
    // @ts-ignore - accessing private property
    const sessionId = transport._sessionId;
    transports.set(sessionId, transport);

    // Clean up when connection closes
    res.on("close", () => {
      transports.delete(sessionId);
    });
  } catch (err) {
    console.error("Error connecting server to transport:", err);
    if (!res.headersSent) {
      res.status(500).send("Error initializing connection");
    }
  }
});

// Add message endpoint
app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;

  if (!sessionId) {
    res.status(400).send("Missing sessionId");
    return;
  }

  const transport = transports.get(sessionId);
  if (!transport) {
    res.status(404).send("Session not found");
    return;
  }

  try {
    await transport.handlePostMessage(req, res);
  } catch (error: unknown) {
    console.error("Error handling message:", error);
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
    }
    if (!res.headersSent) {
      res.status(500).send("Error processing message");
    }
  }
});

// Start the server
const host = "0.0.0.0";
const port = 8000;

// Automatically load Bruno API tools if path is provided
async function loadInitialBrunoApi() {
  if (brunoApiPath) {
    try {
      console.log(`Loading Bruno API tools from ${brunoApiPath}...`);

      const toolOptions = {
        collectionPath: brunoApiPath + "/collection.bru",
        environment: environment || undefined,
        includeTools: includeTools || undefined,
        excludeTools: excludeTools || undefined,
      };

      // Log filter settings
      if (includeTools && includeTools.length > 0) {
        console.log(`Including only these tools: ${includeTools.join(", ")}`);
      }

      if (excludeTools && excludeTools.length > 0) {
        console.log(`Excluding these tools: ${excludeTools.join(", ")}`);
      }

      const tools = await createBrunoTools(toolOptions);

      // Register each tool with the server
      let registeredCount = 0;
      for (const tool of tools) {
        try {
          // Register the tool with MCP server
          server.tool(
            tool.name,
            tool.description,
            {
              environment: z
                .string()
                .optional()
                .describe("Optional environment to use for this request"),
              variables: z
                .record(z.string(), z.string())
                .optional()
                .describe("Optional variables to override for this request"),
              query: z
                .record(z.string(), z.string())
                .optional()
                .describe(
                  "Optional query parameters to add to the request URL"
                ),
              body: z
                .object({})
                .passthrough()
                .describe("Request body parameters"),
            },
            async (params: BrunoToolSchema) => {
              console.log(
                `Tool ${tool.name} called with params:`,
                JSON.stringify(params, null, 2)
              );

              try {
                const result = await tool.handler(params);
                // Format the result for MCP protocol
                return {
                  content: [
                    {
                      type: "text" as const,
                      text: JSON.stringify(result, null, 2),
                    },
                  ],
                };
              } catch (toolError) {
                console.error(
                  `Error in tool handler for ${tool.name}:`,
                  toolError
                );
                throw toolError;
              }
            }
          );
          registeredCount++;
        } catch (error: unknown) {
          console.error(`Failed to register tool ${tool.name}:`, error);
          console.error("Tool schema:", JSON.stringify(tool.schema, null, 2));
          if (error instanceof Error && error.stack) {
            console.error("Error stack:", error.stack);
          }
        }
      }
      console.log(
        `Successfully loaded ${registeredCount} API tools from Bruno collection at ${brunoApiPath}`
      );
    } catch (error: unknown) {
      console.error(
        `Error loading initial Bruno API tools from ${brunoApiPath}:`,
        error
      );
      if (error instanceof Error && error.stack) {
        console.error("Error stack:", error.stack);
      }
    }
  }
}

// Initialize and start server
loadInitialBrunoApi().then(() => {
  app.listen(port, host, () => {
    console.log(`MCP Server running on http://${host}:${port}/sse`);
    console.log(
      `WSL IP for Windows clients: Use 'hostname -I | awk '{print $1}'`
    );
    if (brunoApiPath) {
      console.log(`Loaded Bruno API tools from: ${brunoApiPath}`);
      if (environment) {
        console.log(`Using environment: ${environment}`);
      }
      if (includeTools && includeTools.length > 0) {
        console.log(`Including only these tools: ${includeTools.join(", ")}`);
      }
      if (excludeTools && excludeTools.length > 0) {
        console.log(`Excluding these tools: ${excludeTools.join(", ")}`);
      }
    } else {
      console.log(
        `No Bruno API tools loaded. Please provide a path using --bruno-path or BRUNO_API_PATH env var`
      );
    }
  });
});
