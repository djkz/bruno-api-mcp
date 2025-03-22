import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { collectionBruToJson } from "../src/bruno-lang/brulang.js";
import { describe, test, expect } from "@jest/globals";

// ES Modules replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Bruno Collection Parser", () => {
  const fixturesPath = path.join(__dirname, "fixtures");
  const collectionPath = path.join(fixturesPath, "collection.bru");

  test("should parse the collection file directly with collectionBruToJson", async () => {
    // Read collection file content
    const content = await fs.promises.readFile(collectionPath, "utf-8");

    // Parse the collection with collectionBruToJson
    const collection = collectionBruToJson(content);

    // Verify the collection structure
    expect(collection).toBeDefined();
    expect(collection.auth).toBeDefined();
    expect(collection.auth?.mode).toBe("apikey");
    expect(collection.auth?.apikey).toBeDefined();
  });

  test("should correctly parse collection with API key authentication", async () => {
    // Read collection file content
    const content = await fs.promises.readFile(collectionPath, "utf-8");

    // Parse the collection with collectionBruToJson
    const collection = collectionBruToJson(content);

    // Verify the API key authorization details
    expect(collection.auth?.apikey).toBeDefined();
    expect(collection.auth?.apikey?.key).toBe("x-cfi-token");
    expect(collection.auth?.apikey?.value).toBe("abcde");
    expect(collection.auth?.apikey?.addTo).toBe("header");
    expect(collection.auth?.apikey?.in).toBe("");
  });

  test("should properly parse pre-request script from collection", async () => {
    // Read collection file content
    const content = await fs.promises.readFile(collectionPath, "utf-8");

    // Parse the collection with collectionBruToJson
    const collection = collectionBruToJson(content);

    // Verify the pre-request script exists and contains expected code
    expect(collection.script?.["pre-request"]).toBeDefined();
    expect(collection.script?.["pre-request"]).toContain("let urlAlphabet");
    expect(collection.script?.["pre-request"]).toContain("let nanoid");
  });

  test("should correctly parse variables from collection", async () => {
    // Read collection file content
    const content = await fs.promises.readFile(collectionPath, "utf-8");

    // Parse the collection with collectionBruToJson
    const collection = collectionBruToJson(content);

    // Verify the variables (pre-request) are parsed correctly
    expect(collection.vars?.["pre-request"]).toBeDefined();
    expect(collection.vars?.["pre-request"]).toHaveProperty("baseUrl");
    expect(collection.vars?.["pre-request"]?.baseUrl).toBe(
      "http://localhost:3000"
    );
  });
});
