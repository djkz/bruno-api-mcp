import fs from "fs-extra";
import * as path from "path";
import axios from "axios";
import debug from "debug";
import {
  bruToJson,
  envToJson,
  collectionBruToJson,
} from "./bruno-lang/brulang.js";

const log = debug("bruno-parser");
const debugReq = debug("bruno-request");

// Match {{baseUrl}} or any other template variable {{varName}}
const TEMPLATE_VAR_REGEX = /{{([^}]+)}}/g;

interface BrunoResponse {
  status: number;
  headers: any;
  data: any;
  isJson?: boolean;
  error?: boolean;
}

export interface ParsedRequest {
  name: string;
  method: string;
  url: string;
  rawRequest: any;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body?: {
    type: string;
    content: any;
  };
  filePath?: string;
}

export interface EnvironmentData {
  name: string;
  variables: Record<string, string>;
  rawData: any;
}

export class BrunoParser {
  collectionPath: string;
  basePath: string;
  envVars: Record<string, string> = {};
  environment?: string;
  availableEnvironments: Map<string, EnvironmentData> = new Map();
  parsedRequests: Map<string, any> = new Map();
  parsedCollection: any = null;

  constructor(collectionPath: string, environment?: string) {
    this.collectionPath = collectionPath;
    this.basePath = path.dirname(collectionPath);
    this.environment = environment;
  }

  async init() {
    // Check if the collection path exists
    try {
      await fs.access(this.collectionPath);
    } catch (error: unknown) {
      throw new Error(`Collection path does not exist: ${this.collectionPath}`);
    }

    try {
      // Load all available environments
      await this.loadAllEnvironments();

      // Load the collection
      try {
        this.parsedCollection = await this.parseCollection();
      } catch (error) {
        log(`Error parsing collection: ${error}`);
        this.parsedCollection = {
          meta: { name: "collection", type: "collection" },
        };
      }

      // Load all request files
      await this.loadAllRequests();

      // Set the active environment if specified
      if (this.environment) {
        this.setEnvironment(this.environment);
      }
    } catch (error: unknown) {
      log(`Error during parser initialization: ${error}`);
      throw error;
    }
  }

  async loadAllEnvironments() {
    const envPath = path.join(this.basePath, "environments");

    try {
      // Check if the environments directory exists
      if (await fs.pathExists(envPath)) {
        const files = await fs.readdir(envPath);
        const envFiles = files.filter(
          (file) => file.endsWith(".env") || file.endsWith(".bru")
        );

        // Load all environment files
        for (const envFile of envFiles) {
          const envName = path.basename(
            envFile,
            envFile.endsWith(".bru") ? ".bru" : ".env"
          );
          const envFilePath = path.join(envPath, envFile);
          const envContent = await fs.readFile(envFilePath, "utf-8");

          try {
            const envData = envToJson(envContent);
            const variables: Record<string, string> = {};

            // Extract variables to our simplified format
            if (envData) {
              if (envData.vars) {
                // Legacy .env format
                Object.entries(envData.vars).forEach(([name, value]) => {
                  variables[name] = String(value);
                });
              } else if (envData.variables) {
                // New .bru format
                envData.variables.forEach((variable: any) => {
                  if (variable.enabled && variable.name) {
                    variables[variable.name] = variable.value || "";
                  }
                });
              }
            }

            // Store the environment data
            this.availableEnvironments.set(envName, {
              name: envName,
              variables,
              rawData: envData,
            });
            log(`Environment loaded: ${envName}`);

            // If this is the first environment and no specific one was requested,
            // set it as the default
            if (!this.environment && this.availableEnvironments.size === 1) {
              this.environment = envName;
              this.envVars = { ...variables };
              log(`Set default environment: ${envName}`);
            }
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            log(
              `Error parsing environment file ${envFilePath}: ${errorMessage}`
            );
          }
        }

        log(
          "Available environments:",
          Array.from(this.availableEnvironments.keys())
        );
        log("Current environment variables:", this.envVars);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log(`Error loading environments: ${errorMessage}`);
    }
  }

  setEnvironment(envName: string): boolean {
    const env = this.availableEnvironments.get(envName);
    if (env) {
      this.environment = envName;
      this.envVars = { ...env.variables };
      log(`Environment set to: ${envName}`);
      return true;
    }
    log(`Environment not found: ${envName}`);
    return false;
  }

  getAvailableEnvironments(): string[] {
    return Array.from(this.availableEnvironments.keys());
  }

  getEnvironment(envName: string): EnvironmentData | undefined {
    return this.availableEnvironments.get(envName);
  }

  getCurrentEnvironment(): EnvironmentData | undefined {
    return this.environment
      ? this.availableEnvironments.get(this.environment)
      : undefined;
  }

  async loadAllRequests() {
    try {
      log(`Loading request files from ${this.basePath}`);
      const files = await fs.readdir(this.basePath);
      log(`Found ${files.length} files in directory:`, files);

      const requestFiles = files.filter(
        (file) =>
          file.endsWith(".bru") &&
          file !== path.basename(this.collectionPath) &&
          !file.includes("env")
      );

      log(`Filtered request files: ${requestFiles.length}`, requestFiles);

      for (const file of requestFiles) {
        const requestPath = path.join(this.basePath, file);
        try {
          log(`Loading request from ${requestPath}`);
          const content = await fs.readFile(requestPath, "utf-8");
          const parsed = bruToJson(content);
          const requestName = path.basename(file, ".bru");
          this.parsedRequests.set(requestName, parsed);
          log(`Request loaded: ${requestName}`);
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          log(`Error parsing request file ${file}: ${errorMessage}`);
        }
      }
      log(`Loaded ${this.parsedRequests.size} requests`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log(`Error loading request files: ${errorMessage}`);
    }
  }

  getAvailableRequests(): string[] {
    return Array.from(this.parsedRequests.keys());
  }

  getRawRequest(requestName: string): any | undefined {
    return this.parsedRequests.get(requestName);
  }

  async parseCollection(): Promise<any> {
    try {
      const content = await fs.readFile(this.collectionPath, "utf-8");
      return collectionBruToJson(content);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log(`Error parsing collection file: ${errorMessage}`);
      throw error;
    }
  }

  getCollection(): any {
    return this.parsedCollection;
  }

  async parseRequest(requestInput: string): Promise<ParsedRequest> {
    let rawRequest;
    let requestName;
    let filePath = requestInput;

    // If the input is a name and not a path, get the request from loaded requests
    if (!requestInput.includes(path.sep) && !requestInput.endsWith(".bru")) {
      requestName = requestInput;
      rawRequest = this.getRawRequest(requestName);
      if (!rawRequest) {
        throw new Error(`Request not found: ${requestName}`);
      }
    } else {
      // Input is a file path
      requestName = path.basename(requestInput, ".bru");
      try {
        const content = await fs.readFile(filePath, "utf-8");
        rawRequest = bruToJson(content);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(
          `Error parsing request file ${filePath}: ${errorMessage}`
        );
      }
    }

    // Extract HTTP method and URL
    let method = "GET";
    let url = "";

    if (rawRequest.http && rawRequest.http.method) {
      method = rawRequest.http.method.toUpperCase();
    }

    if (rawRequest.http && rawRequest.http.url) {
      // Store the original URL without processing variables
      url = rawRequest.http.url;
    }

    // Parse headers
    const headers: Record<string, string> = {};

    // Handle auth inheritance
    if (
      rawRequest.http &&
      rawRequest.http.auth === "inherit" &&
      this.parsedCollection
    ) {
      const collectionAuth = this.parsedCollection.auth;
      if (collectionAuth && collectionAuth.mode === "apikey") {
        const apiKeyAuth = collectionAuth.apikey;
        if (
          apiKeyAuth &&
          (!apiKeyAuth.addTo || apiKeyAuth.addTo === "header")
        ) {
          headers[apiKeyAuth.key] = this.processTemplateVariables(
            apiKeyAuth.value || ""
          );
        }
      }
    }

    // Parse request-specific headers from headers section
    if (rawRequest.headers) {
      for (const header of rawRequest.headers) {
        if (header.enabled !== false && header.name) {
          headers[header.name] = this.processTemplateVariables(
            header.value || ""
          );
        }
      }
    }

    // Parse request-specific headers from http.headers (for backward compatibility)
    if (rawRequest.http && rawRequest.http.headers) {
      for (const header of rawRequest.http.headers) {
        if (header.enabled !== false && header.name) {
          headers[header.name] = this.processTemplateVariables(
            header.value || ""
          );
        }
      }
    }

    // Parse query parameters
    const queryParams: Record<string, string> = {};
    if (rawRequest.http && rawRequest.http.query) {
      for (const param of rawRequest.http.query) {
        if (param.enabled !== false && param.name) {
          queryParams[param.name] = this.processTemplateVariables(
            param.value || ""
          );
        }
      }
    }

    // Handle query parameter auth
    if (
      rawRequest.http &&
      rawRequest.http.auth === "inherit" &&
      this.parsedCollection
    ) {
      const collectionAuth = this.parsedCollection.auth;
      if (collectionAuth && collectionAuth.mode === "apikey") {
        const apiKeyAuth = collectionAuth.apikey;
        if (apiKeyAuth && apiKeyAuth.addTo === "queryParams") {
          queryParams[apiKeyAuth.key] = this.processTemplateVariables(
            apiKeyAuth.value || ""
          );
          log(
            `Added auth query param: ${apiKeyAuth.key}=${
              queryParams[apiKeyAuth.key]
            }`
          );
        }
      }
    }

    // Parse body content
    let body;
    if (rawRequest.http && rawRequest.http.body) {
      const bodyContent = rawRequest.http.body;
      const bodyMode = bodyContent.mode || "json";

      // Process body content based on mode
      if (bodyMode === "json" && bodyContent.json) {
        try {
          // If it's a string, try to parse it as JSON
          let processedContent = this.processTemplateVariables(
            bodyContent.json
          );
          let jsonContent;

          try {
            jsonContent = JSON.parse(processedContent);
          } catch (e) {
            // If not valid JSON, use as is
            jsonContent = processedContent;
          }

          body = {
            type: "json",
            content: jsonContent,
          };
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          log(`Error processing JSON body: ${errorMessage}`);
          body = {
            type: "json",
            content: bodyContent.json,
          };
        }
      } else if (bodyMode === "text" && bodyContent.text) {
        body = {
          type: "text",
          content: this.processTemplateVariables(bodyContent.text),
        };
      } else if (bodyMode === "form-urlencoded" && bodyContent.formUrlEncoded) {
        const formData: Record<string, string> = {};
        for (const param of bodyContent.formUrlEncoded) {
          if (param.enabled !== false && param.name) {
            formData[param.name] = this.processTemplateVariables(
              param.value || ""
            );
          }
        }
        body = {
          type: "form-urlencoded",
          content: formData,
        };
      } else {
        // For other body types, store as is
        body = {
          type: bodyMode,
          content: bodyContent[bodyMode],
        };
      }
    }

    return {
      name: requestName,
      method,
      url,
      rawRequest,
      headers,
      queryParams,
      body,
      filePath,
    };
  }

  processTemplateVariables(input: string): string {
    if (!input || typeof input !== "string") {
      return input;
    }

    return input.replace(
      TEMPLATE_VAR_REGEX,
      (match: string, varName: string) => {
        const trimmedVarName = varName.trim();
        return this.envVars[trimmedVarName] !== undefined
          ? this.envVars[trimmedVarName]
          : match;
      }
    );
  }

  extractTemplateVariables(input: string): string[] {
    if (!input || typeof input !== "string") {
      return [];
    }

    const variables: string[] = [];
    let match;
    while ((match = TEMPLATE_VAR_REGEX.exec(input)) !== null) {
      variables.push(match[1].trim());
    }
    return variables;
  }

  async executeRequest(
    parsedRequest: ParsedRequest,
    params: {
      variables?: Record<string, any>;
      body?: any;
    } = {}
  ): Promise<BrunoResponse> {
    // Create a temporary copy of environment variables
    const originalEnvVars = { ...this.envVars };
    console.log("originalEnvVars", originalEnvVars);

    try {
      const { method, headers, body, queryParams, rawRequest } = parsedRequest;
      const { variables, ...requestParams } = params;

      // Apply any custom variables if provided
      if (variables && typeof variables === "object") {
        debugReq(`Applying temporary variables: ${JSON.stringify(variables)}`);
        // Temporarily override environment variables
        Object.entries(variables).forEach(([key, value]) => {
          this.envVars[key] = String(value);
        });
      }

      // Get the original URL from rawRequest instead of using the pre-processed URL
      const originalUrl = rawRequest?.http?.url || parsedRequest.url;

      // Process template variables in the URL with current environment variables
      let finalUrl = this.processTemplateVariables(originalUrl);
      debugReq(`Final URL: ${finalUrl}`);

      // Add query parameters that are not already in the URL
      const urlObj = new URL(finalUrl);

      // Apply parameters to query parameters
      if (queryParams) {
        Object.entries(requestParams).forEach(([key, value]) => {
          if (Object.prototype.hasOwnProperty.call(queryParams, key)) {
            queryParams[key] = String(value);
          }
        });
      }

      finalUrl = urlObj.toString();

      // Process body content with parameters if it's JSON
      let requestData = body?.content;

      if (body?.type === "json" && typeof body.content === "object") {
        try {
          // Merge params into body content if it's an object
          requestData = {
            ...body.content,
            ...requestParams,
          };
        } catch (error) {
          debugReq("Error applying parameters to request body:", error);
        }
      }

      debugReq(`Executing ${method} request to ${finalUrl}`);
      debugReq(`Headers: ${JSON.stringify(headers)}`);
      if (requestData) {
        debugReq(
          `Body: ${
            typeof requestData === "object"
              ? JSON.stringify(requestData)
              : requestData
          }`
        );
      }

      // Send the request
      const response = await axios({
        method,
        url: finalUrl,
        headers,
        data: requestData,
        validateStatus: () => true, // Don't throw on any status code
      });

      // Log response status
      debugReq(`Response status: ${response.status}`);

      // Check if the response is JSON by examining the content-type header
      const contentType = response.headers["content-type"] || "";
      const isJson = contentType.includes("application/json");

      if (!isJson) {
        debugReq(
          `Warning: Response is not JSON (content-type: ${contentType})`
        );
      }
      console.log("response.data", response.data);

      // Return structured response
      return {
        status: response.status,
        headers: response.headers,
        data: response.data,
        isJson,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      debugReq(`Error executing request: ${errorMessage}`);
      return {
        status: 0,
        headers: {},
        data: errorMessage,
        error: true,
      };
    } finally {
      // Restore original environment variables
      this.envVars = originalEnvVars;
    }
  }

  hasTemplateVariable(url: string, varName: string): boolean {
    const templateVars = this.extractTemplateVariables(url);
    return templateVars.includes(varName);
  }
}
