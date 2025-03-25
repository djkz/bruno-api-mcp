/**
 * Example of using the OAuth2 authentication with Bruno Parser
 *
 * This example shows how to:
 * 1. Parse a collection with OAuth2 configuration
 * 2. Execute a request using inherited OAuth2 authentication
 * 3. Use tokens set by post-response scripts
 */

import { BrunoParser } from "../src/bruno-parser.js";
import path from "path";

async function main() {
  try {
    // Initialize parser with collection path and environment
    const collectionPath = path.resolve("./path/to/your/collection2.bru");
    const parser = new BrunoParser(collectionPath, "dev");

    // Initialize the parser (loads environments, collection, etc.)
    await parser.init();

    console.log("Collection loaded successfully");
    console.log("Available environments:", parser.getAvailableEnvironments());
    console.log("Available requests:", parser.getAvailableRequests());

    // Execute a request that uses OAuth2 authentication
    // The parser will:
    // 1. Parse the OAuth2 configuration from the collection
    // 2. Request a token using client credentials if needed
    // 3. Apply the token to the request
    // 4. Process any post-response scripts that set token variables
    const response = await parser.executeRequest("V2-deals-show", {
      variables: {
        deal_id: "12345",
      },
    });

    console.log(`Response status: ${response.status}`);

    // The token is now cached for subsequent requests
    // Let's execute another request using the same token
    const response2 = await parser.executeRequest("V2-deals-list");

    console.log(`Second response status: ${response2.status}`);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
