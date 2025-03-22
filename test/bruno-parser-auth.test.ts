import * as path from "path";
import { fileURLToPath } from "url";
import { BrunoParser } from "../src/bruno-parser.js";
import { describe, test, expect, beforeEach } from "@jest/globals";

// ES Modules replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("BrunoParser Auth Handling", () => {
  const fixturesPath = path.join(__dirname, "fixtures");
  const collectionPath = path.join(fixturesPath, "collection.bru");
  let parser: BrunoParser;

  beforeEach(async () => {
    parser = new BrunoParser(collectionPath);
    await parser.init();
  });

  test("should inherit auth from collection when parsing request", async () => {
    // Parse the self-company request which has auth: inherit
    const request = await parser.parseRequest("self-company");

    // Verify request was parsed correctly
    expect(request).toBeDefined();
    expect(request.method).toBe("GET");
    expect(request.url).toBe("{{baseUrl}}/api");

    // Process the URL to verify it resolves correctly with the current environment
    const processedUrl = parser.processTemplateVariables(request.url);
    expect(processedUrl).toBe("http://localhost:3000/api");

    // Verify auth headers were inherited from collection
    expect(request.headers).toHaveProperty("x-cfi-token", "abcde");
  });

  test("should use direct auth settings when not inheriting", async () => {
    // Parse the direct auth request
    const request = await parser.parseRequest(
      path.join(fixturesPath, "direct-auth.bru")
    );

    // Verify request was parsed correctly
    expect(request).toBeDefined();
    expect(request.method).toBe("GET");
    expect(request.url).toBe("{{baseUrl}}/api/test");

    // Process the URL to verify it resolves correctly with the current environment
    const processedUrl = parser.processTemplateVariables(request.url);
    expect(processedUrl).toBe("http://localhost:3000/api/test");

    // Verify auth headers were not inherited from collection
    expect(request.headers).toHaveProperty(
      "Authorization",
      "Bearer direct-token"
    );
    expect(request.headers).not.toHaveProperty("x-cfi-token");
  });
});
