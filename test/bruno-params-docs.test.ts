import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { bruToJson } from "../src/bruno-lang/brulang.js";
import { BrunoParser } from "../src/bruno-parser.js";
import { describe, test, expect, beforeEach } from "@jest/globals";

// ES Modules replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Bruno Params and Docs Parser", () => {
  const fixturesPath = path.join(__dirname, "fixtures");
  const collectionPath = path.join(fixturesPath, "collection.bru");

  /**
   * Test parsing the new params:query section in Bruno files
   */
  test("should parse query parameters from params:query section", async () => {
    // Read the request file
    const requestPath = path.join(fixturesPath, "deals-list.bru");
    const content = await fs.promises.readFile(requestPath, "utf-8");

    // Parse the request with bruToJson
    const request = bruToJson(content);

    // Verify that params section is parsed
    expect(request.params).toBeDefined();
    expect(Array.isArray(request.params)).toBe(true);
    expect(request.params).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "limit",
          value: "10",
          type: "query",
          enabled: true,
        }),
      ])
    );
  });

  /**
   * Test parsing the docs section in Bruno files
   */
  test("should parse documentation from docs section", async () => {
    // Read the request file
    const requestPath = path.join(fixturesPath, "deals-list.bru");
    const content = await fs.promises.readFile(requestPath, "utf-8");

    // Parse the request with bruToJson
    const request = bruToJson(content);

    // Verify that docs section is parsed
    expect(request.docs).toBeDefined();
    expect(typeof request.docs).toBe("string");
    expect(request.docs).toContain("You can use the following query params");
    expect(request.docs).toContain("search:");
    expect(request.docs).toContain("limit:");
  });

  describe("Integration with BrunoParser", () => {
    let parser: BrunoParser;

    beforeEach(async () => {
      parser = new BrunoParser(collectionPath);
      await parser.init();
    });

    /**
     * Test query parameters integration with BrunoParser
     */
    test("should include params:query when executing request", async () => {
      try {
        // First make sure the deals-list.bru file is properly loaded
        expect(parser.getAvailableRequests()).toContain("deals-list");

        // Parse the request
        const parsedRequest = await parser.parseRequest("deals-list");

        // Verify query params are included
        expect(parsedRequest.queryParams).toBeDefined();
        expect(parsedRequest.queryParams.limit).toBe("10");
      } catch (error) {
        console.error("Test failure details:", error);
        throw error;
      }
    });

    /**
     * Test docs integration with tool creation
     */
    test("should include docs content in tool description", async () => {
      // We need to import the createBrunoTools function
      const { createBrunoTools } = await import("../src/bruno-tools.js");

      // Create tools using the parser that's already initialized
      const tools = await createBrunoTools({
        collectionPath: collectionPath,
        filterRequests: (name) => name === "deals-list",
      });

      // Verify that at least one tool was created for deals-list
      expect(tools.length).toBeGreaterThan(0);

      // Find the deals-list tool
      const dealsListTool = tools.find(
        (tool) =>
          tool.name.includes("deals_list") ||
          tool.description.includes("deals-list") ||
          tool.description.includes("/api/deals")
      );

      // Verify the tool exists
      expect(dealsListTool).toBeDefined();

      // Verify docs content is in the description
      expect(dealsListTool?.description).toContain(
        "You can use the following query params"
      );
      expect(dealsListTool?.description).toContain("search:");
      expect(dealsListTool?.description).toContain("limit:");
    });
  });
});
