import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { bruToJson } from "../src/bruno-lang/brulang.js";
import { describe, test, expect } from "@jest/globals";

// ES Modules replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Bruno Request Parser", () => {
  const fixturesPath = path.join(__dirname, "fixtures");

  /**
   * This test focuses on validating that the bruToJson function correctly
   * parses a Bruno request file, including metadata and HTTP details.
   */
  test("should parse a request directly with bruToJson", async () => {
    // Read the request file
    const requestPath = path.join(fixturesPath, "self-company.bru");
    const content = await fs.promises.readFile(requestPath, "utf-8");

    // Parse the request with bruToJson
    const request = bruToJson(content);

    // Verify request data
    expect(request).toBeDefined();
    expect(request.meta).toBeDefined();
    expect(request.meta.name).toBe("self-company");
    expect(request.meta.type).toBe("http");
    expect(request.meta.seq).toBe("1");

    // Check HTTP request properties
    expect(request.http).toBeDefined();
    expect(request.http.method).toBe("get");
    expect(request.http.url).toBe("{{baseUrl}}/api");
    expect(request.http.body).toBe("none");
    expect(request.http.auth).toBe("inherit");
  });

  /**
   * This test specifically verifies that template variables are kept as is
   * when using bruToJson directly, without any variable substitution.
   */
  test("should verify that template variables remain unparsed in the URL", async () => {
    // Read the request file
    const requestPath = path.join(fixturesPath, "self-company.bru");
    const content = await fs.promises.readFile(requestPath, "utf-8");

    // Parse the request with bruToJson
    const request = bruToJson(content);

    // The URL should contain the template variable exactly as in the file
    expect(request.http.url).toBe("{{baseUrl}}/api");
    expect(request.http.url).toContain("{{baseUrl}}");

    // Ensure the URL is not modified or processed
    expect(request.http.url).not.toBe("http://localhost:3000/api");
  });

  /**
   * This test ensures that HTTP method is parsed in lowercase as expected.
   */
  test("should correctly handle HTTP method in lowercase", async () => {
    // Read the request file
    const requestPath = path.join(fixturesPath, "self-company.bru");
    const content = await fs.promises.readFile(requestPath, "utf-8");

    // Parse the request with bruToJson
    const request = bruToJson(content);

    // The HTTP method should be 'get' in lowercase as per the actual parser output
    expect(request.http.method).toBe("get");

    // Additional check to ensure it's a case-sensitive check
    expect(request.http.method).not.toBe("GET");
  });

  /**
   * This test validates the complete structure of the parsed request object.
   */
  test("should produce the exact expected object structure", async () => {
    // Read the request file
    const requestPath = path.join(fixturesPath, "self-company.bru");
    const content = await fs.promises.readFile(requestPath, "utf-8");

    // Parse the request with bruToJson
    const request = bruToJson(content);

    // Verify the exact structure matches what we expect
    expect(request).toEqual({
      meta: {
        name: "self-company",
        type: "http",
        seq: "1",
      },
      http: {
        method: "get",
        url: "{{baseUrl}}/api",
        body: "none",
        auth: "inherit",
      },
    });

    // Explicit check that the URL contains the template variable unchanged
    // This is critical for the test requirement
    expect(request.http.url).toBe("{{baseUrl}}/api");
  });
});
