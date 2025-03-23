import { describe, test, expect } from "@jest/globals";
import {
  AuthService,
  BrunoEnvAdapter,
  CollectionAuthConfig,
} from "../src/auth/index.js";

// Match {{baseUrl}} or any other template variable {{varName}}
const TEMPLATE_VAR_REGEX = /{{([^}]+)}}/g;

describe("Auth Module", () => {
  test("should apply API Key auth from collection", () => {
    // Setup environment variables
    const envVars = {
      apiToken: "test-token-123",
    };

    // Create environment adapter
    const envAdapter = new BrunoEnvAdapter(envVars, TEMPLATE_VAR_REGEX);

    // Collection auth config (similar to what would be in a collection.bru file)
    const collectionAuth: CollectionAuthConfig = {
      mode: "apikey",
      apikey: {
        key: "x-api-key",
        value: "{{apiToken}}",
        addTo: "header",
      },
    };

    // Apply auth using inherited collection auth
    const authResult = AuthService.applyAuth(
      undefined, // No request-level auth
      true, // Inherit from collection
      collectionAuth,
      envAdapter
    );

    // Validate the auth result
    expect(authResult.headers).toBeDefined();
    expect(authResult.headers?.["x-api-key"]).toBe("test-token-123");
  });

  test("should apply Bearer token auth from request", () => {
    // Setup environment variables
    const envVars = {
      token: "secret-bearer-token",
    };

    // Create environment adapter
    const envAdapter = new BrunoEnvAdapter(envVars, TEMPLATE_VAR_REGEX);

    // Request auth config (similar to what would be in a .bru file)
    const requestAuth = {
      bearer: {
        token: "{{token}}",
      },
    };

    // Apply auth using request-level auth (not inheriting)
    const authResult = AuthService.applyAuth(
      requestAuth, // Request-level auth
      false, // Don't inherit from collection
      undefined, // No collection auth
      envAdapter
    );

    // Validate the auth result
    expect(authResult.headers).toBeDefined();
    expect(authResult.headers?.["Authorization"]).toBe(
      "Bearer secret-bearer-token"
    );
  });

  test("should apply Basic auth with environment variables", () => {
    // Setup environment variables
    const envVars = {
      username: "admin",
      password: "secret123",
    };

    // Create environment adapter
    const envAdapter = new BrunoEnvAdapter(envVars, TEMPLATE_VAR_REGEX);

    // Request auth config
    const requestAuth = {
      basic: {
        username: "{{username}}",
        password: "{{password}}",
      },
    };

    // Apply auth
    const authResult = AuthService.applyAuth(
      requestAuth,
      false,
      undefined,
      envAdapter
    );

    // Validate the auth result - should be "Basic YWRtaW46c2VjcmV0MTIz" (base64 of "admin:secret123")
    expect(authResult.headers).toBeDefined();
    expect(authResult.headers?.["Authorization"]).toBe(
      "Basic YWRtaW46c2VjcmV0MTIz"
    );
  });

  test("should add token to query params for API in query mode", () => {
    // Setup environment variables
    const envVars = {
      apiToken: "api-token-in-query",
    };

    // Create environment adapter
    const envAdapter = new BrunoEnvAdapter(envVars, TEMPLATE_VAR_REGEX);

    // Collection auth config with token in query params
    const collectionAuth: CollectionAuthConfig = {
      mode: "apikey",
      apikey: {
        key: "access_token",
        value: "{{apiToken}}",
        addTo: "queryParams",
      },
    };

    // Apply auth
    const authResult = AuthService.applyAuth(
      undefined,
      true,
      collectionAuth,
      envAdapter
    );

    // Validate the auth result
    expect(authResult.queryParams).toBeDefined();
    expect(authResult.queryParams?.["access_token"]).toBe("api-token-in-query");
  });
});
