import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import {
  AuthService,
  BrunoEnvAdapter,
  CollectionAuthConfig,
  OAuth2AuthHandler,
  TokenManager,
} from "../src/auth/index.js";
import axios, { AxiosResponse } from "axios";

// Mock axios
jest.mock("axios");

// Match {{baseUrl}} or any other template variable {{varName}}
const TEMPLATE_VAR_REGEX = /{{([^}]+)}}/g;

describe("OAuth2 Authentication", () => {
  // Reset token manager before each test
  beforeEach(() => {
    // @ts-ignore - Access private static instance for testing
    TokenManager.instance = undefined;
    jest.clearAllMocks();

    // Setup axios mock for post method
    const mockResponse: Partial<AxiosResponse> = {
      data: {
        access_token: "new-oauth-token",
        token_type: "Bearer",
        expires_in: 3600,
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    };

    (axios.post as jest.Mock).mockResolvedValue(mockResponse);
  });

  test("should create OAuth2 auth handler from collection", () => {
    // Collection auth config with OAuth2
    const collectionAuth: CollectionAuthConfig = {
      mode: "oauth2",
      oauth2: {
        grant_type: "client_credentials",
        access_token_url: "{{base_url}}/oauth/token",
        client_id: "{{client_id}}",
        client_secret: "{{client_secret}}",
        scope: "read write",
      },
    };

    // Environment variables
    const envVars = {
      base_url: "https://api.example.com",
      client_id: "test-client",
      client_secret: "test-secret",
    };

    // Create environment adapter
    const envAdapter = new BrunoEnvAdapter(envVars, TEMPLATE_VAR_REGEX);

    // Apply auth using collection auth
    const authResult = AuthService.applyAuth(
      undefined, // No request-level auth
      true, // Inherit from collection
      collectionAuth,
      envAdapter,
      "/path/to/collection.bru", // Collection path
      "development" // Environment name
    );

    // Initial auth result should be empty (since OAuth2 token request is async)
    expect(authResult.headers).toBeDefined();
    expect(Object.keys(authResult.headers || {})).toHaveLength(0);
  });

  test("should use access_token_set_by_collection_script", () => {
    // Collection auth config with OAuth2
    const collectionAuth: CollectionAuthConfig = {
      mode: "oauth2",
      oauth2: {
        grant_type: "client_credentials",
        access_token_url: "{{base_url}}/oauth/token",
        client_id: "{{client_id}}",
        client_secret: "{{client_secret}}",
      },
    };

    // Environment variables with token already set by script
    const envVars = {
      base_url: "https://api.example.com",
      client_id: "test-client",
      client_secret: "test-secret",
      access_token_set_by_collection_script: "script-provided-token",
    };

    // Create environment adapter
    const envAdapter = new BrunoEnvAdapter(envVars, TEMPLATE_VAR_REGEX);

    // Apply auth using collection auth
    const authResult = AuthService.applyAuth(
      undefined, // No request-level auth
      true, // Inherit from collection
      collectionAuth,
      envAdapter
    );

    // Auth result should contain the Bearer token from the environment variable
    expect(authResult.headers).toBeDefined();
    expect(authResult.headers?.["Authorization"]).toBe(
      "Bearer script-provided-token"
    );
  });

  test("should request new token when none is cached", async () => {
    // Setup OAuth2 config
    const oauth2Config = {
      grant_type: "client_credentials",
      access_token_url: "https://api.example.com/oauth/token",
      client_id: "test-client",
      client_secret: "test-secret",
      scope: "read write",
    };

    // Create environment adapter with setVariable support
    const envAdapter = new BrunoEnvAdapter({}, TEMPLATE_VAR_REGEX);

    // Create OAuth2 handler directly for testing
    const handler = new OAuth2AuthHandler(
      oauth2Config,
      "/path/to/collection.bru",
      "development"
    );

    // Apply auth
    const authResult = handler.applyAuth(envAdapter);

    // Initial result should be empty
    expect(Object.keys(authResult.headers || {})).toHaveLength(0);

    // Wait for token request to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Verify axios.post was called with correct params
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledWith(
      "https://api.example.com/oauth/token",
      expect.stringContaining("grant_type=client_credentials"),
      expect.objectContaining({
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      })
    );
  });

  test("should handle request inheritance with OAuth2", () => {
    // Collection auth config with OAuth2
    const collectionAuth: CollectionAuthConfig = {
      mode: "oauth2",
      oauth2: {
        grant_type: "client_credentials",
        access_token_url: "{{base_url}}/oauth/token",
        client_id: "{{client_id}}",
        client_secret: "{{client_secret}}",
      },
    };

    // Environment variables with token already set by script
    const envVars = {
      base_url: "https://api.example.com",
      client_id: "test-client",
      client_secret: "test-secret",
      access_token_set_by_collection_script: "inherit-token-test",
    };

    // Create environment adapter
    const envAdapter = new BrunoEnvAdapter(envVars, TEMPLATE_VAR_REGEX);

    // Request auth config with inherit flag (similar to V2-deals-show.bru)
    const requestAuth = {
      mode: "inherit",
    };

    // Apply auth using request auth that inherits from collection
    const authResult = AuthService.applyAuth(
      requestAuth,
      true, // Inherit from collection
      collectionAuth,
      envAdapter
    );

    // Auth result should contain the Bearer token from the environment variable
    expect(authResult.headers).toBeDefined();
    expect(authResult.headers?.["Authorization"]).toBe(
      "Bearer inherit-token-test"
    );
  });
});
