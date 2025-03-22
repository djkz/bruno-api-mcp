import * as path from "path";
import {
  BrunoParser,
  ParsedRequest,
  EnvironmentData,
} from "../src/bruno-parser.js";
import { describe, beforeEach, test, expect } from "@jest/globals";

// ES Modules replacement for __dirname
const projectRoot = process.cwd(); // This is the directory where npm test was run from
const fixturesPath = path.join(projectRoot, "test", "fixtures");

describe("BrunoParser", () => {
  const collectionPath = path.join(fixturesPath, "collection.bru");

  describe("Environment Management", () => {
    let parser: BrunoParser;

    beforeEach(async () => {
      parser = new BrunoParser(collectionPath);
      await parser.init();
    });

    test("should load all available environments", () => {
      const environments = parser.getAvailableEnvironments();
      expect(environments).toContain("local");
      expect(environments).toContain("remote");
      expect(environments.length).toBeGreaterThanOrEqual(2);
    });

    test("should set environment and apply its variables", () => {
      // Set to local environment
      const result = parser.setEnvironment("local");
      expect(result).toBe(true);
      expect(parser.environment).toBe("local");
      expect(parser.envVars.baseUrl).toBe("http://localhost:3000");

      // Set to remote environment
      parser.setEnvironment("remote");
      expect(parser.environment).toBe("remote");
      expect(parser.envVars.baseUrl).toBe("https://example.com");
    });

    test("should get environment details by name", () => {
      const localEnv = parser.getEnvironment("local");
      expect(localEnv).toBeDefined();
      expect(localEnv?.name).toBe("local");
      expect(localEnv?.variables.baseUrl).toBe("http://localhost:3000");

      const remoteEnv = parser.getEnvironment("remote");
      expect(remoteEnv).toBeDefined();
      expect(remoteEnv?.name).toBe("remote");
      expect(remoteEnv?.variables.baseUrl).toBe("https://example.com");
    });

    test("should get current environment details", () => {
      // By default it should be initialized with an environment
      const currentEnv = parser.getCurrentEnvironment();
      expect(currentEnv).toBeDefined();
      expect(currentEnv?.name).toBe(parser.environment);

      // Change environment and verify
      parser.setEnvironment("remote");
      const updatedEnv = parser.getCurrentEnvironment();
      expect(updatedEnv).toBeDefined();
      expect(updatedEnv?.name).toBe("remote");
    });
  });

  describe("Request Management", () => {
    let parser: BrunoParser;

    beforeEach(async () => {
      parser = new BrunoParser(collectionPath);
      await parser.init();
    });

    test("should load all available requests", () => {
      const requests = parser.getAvailableRequests();
      expect(requests).toContain("self-company");
      // Should also find other request files in the fixtures directory
      expect(requests.length).toBeGreaterThanOrEqual(1);
    });

    test("should get raw request by name", () => {
      const request = parser.getRawRequest("self-company");
      expect(request).toBeDefined();
      expect(request.meta.name).toBe("self-company");
      expect(request.http.url).toBe("{{baseUrl}}/api");
    });

    test("should parse request with current environment variables", async () => {
      // Set to local environment first
      parser.setEnvironment("local");

      // Parse request - should store the raw URL with template variables
      const request = await parser.parseRequest("self-company");
      expect(request).toBeDefined();
      expect(request.method).toBe("GET");
      expect(request.url).toBe("{{baseUrl}}/api");

      // Process the URL using processTemplateVariables to verify it works correctly
      const processedUrl = parser.processTemplateVariables(request.url);
      expect(processedUrl).toBe("http://localhost:3000/api");

      // Change environment and verify the same request still has template variables
      parser.setEnvironment("remote");
      const remoteRequest = await parser.parseRequest("self-company");
      expect(remoteRequest.url).toBe("{{baseUrl}}/api");

      // But when processed with the current environment, should use different variables
      const processedRemoteUrl = parser.processTemplateVariables(
        remoteRequest.url
      );
      expect(processedRemoteUrl).toBe("https://example.com/api");
    });

    test("Should support the original user request", async () => {
      const request = await parser.parseRequest("user");
      expect(request).toBeDefined();
      expect(request.method).toBe("POST");
      expect(request.url).toBe("{{baseUrl}}/api/v1/user");

      // Process the URL to verify it resolves correctly
      const processedUrl = parser.processTemplateVariables(request.url);
      expect(processedUrl).toBe("http://localhost:3000/api/v1/user");

      expect(request.body).toBeDefined();
      expect(request.body?.type).toBe("json");

      // Check the raw request to verify we loaded it correctly
      expect(request.rawRequest).toBeDefined();
      expect(request.rawRequest.body).toBeDefined();

      // Check the raw JSON string that should be in the raw request
      const rawJsonBody = request.rawRequest.body.json;
      expect(rawJsonBody).toBeDefined();
      expect(rawJsonBody).toContain("asdasf@example.com");
    });

    test("should accept request name or file path", async () => {
      // Using request name
      const request1 = await parser.parseRequest("self-company");
      expect(request1).toBeDefined();
      expect(request1.method).toBe("GET");

      // Using file path
      const filePath = path.join(fixturesPath, "self-company.bru");
      const request2 = await parser.parseRequest(filePath);
      expect(request2).toBeDefined();
      expect(request2.method).toBe("GET");

      // Both should produce the same result
      expect(request1.rawRequest).toEqual(request2.rawRequest);
    });
  });

  describe("Collection Management", () => {
    let parser: BrunoParser;

    beforeEach(async () => {
      parser = new BrunoParser(collectionPath);
      await parser.init();
    });

    test("should load and parse collection", () => {
      const collection = parser.getCollection();
      expect(collection).toBeDefined();
      expect(collection.auth).toBeDefined();
      expect(collection.auth.mode).toBe("apikey");
    });
  });

  describe("Environment Replacement", () => {
    let parser: BrunoParser;

    beforeEach(async () => {
      parser = new BrunoParser(collectionPath);
      await parser.init();
    });

    test("should process template variables in strings", () => {
      parser.setEnvironment("local");

      const processed = parser.processTemplateVariables(
        "{{baseUrl}}/api/{{dealId}}"
      );
      expect(processed).toBe(
        "http://localhost:3000/api/fc0238a1-bd71-43b5-9e25-a7d3283eeb1c"
      );

      parser.setEnvironment("remote");
      const processed2 = parser.processTemplateVariables(
        "{{baseUrl}}/api/{{dealId}}"
      );
      expect(processed2).toBe(
        "https://example.com/api/aef1e0e5-1674-43bc-aca1-7e6237a8021a"
      );
    });

    test("should keep unknown variables as-is", () => {
      const processed = parser.processTemplateVariables(
        "{{baseUrl}}/api/{{unknownVar}}"
      );
      expect(processed).toContain("{{unknownVar}}");
    });
  });
});
