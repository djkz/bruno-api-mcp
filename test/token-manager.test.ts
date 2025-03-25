import { describe, test, expect, beforeEach } from "@jest/globals";
import { TokenManager } from "../src/auth/token-manager.js";
import { TokenContextKey, TokenInfo } from "../src/auth/types.js";

describe("TokenManager", () => {
  let tokenManager: TokenManager;

  beforeEach(() => {
    // Reset singleton instance for each test
    // @ts-ignore - Access private static instance for testing
    TokenManager.instance = undefined;
    tokenManager = TokenManager.getInstance();
  });

  test("should store and retrieve tokens", () => {
    // Create token context and info
    const context: TokenContextKey = {
      collectionPath: "/path/to/collection.bru",
      environment: "dev",
    };

    const tokenInfo: TokenInfo = {
      token: "test-token-123",
      type: "Bearer",
      expiresAt: Date.now() + 3600 * 1000, // 1 hour from now
    };

    // Store token
    tokenManager.storeToken(context, tokenInfo);

    // Retrieve token
    const retrievedToken = tokenManager.getToken(context);

    // Verify token was retrieved correctly
    expect(retrievedToken).toBeDefined();
    expect(retrievedToken?.token).toBe("test-token-123");
    expect(retrievedToken?.type).toBe("Bearer");
    expect(retrievedToken?.expiresAt).toBe(tokenInfo.expiresAt);
  });

  test("should handle token expiration", () => {
    // Create token context
    const context: TokenContextKey = {
      collectionPath: "/path/to/collection.bru",
      environment: "dev",
    };

    // Store an expired token
    const expiredToken: TokenInfo = {
      token: "expired-token",
      type: "Bearer",
      expiresAt: Date.now() - 1000, // 1 second ago
    };
    tokenManager.storeToken(context, expiredToken);

    // Try to retrieve the expired token
    const retrievedToken = tokenManager.getToken(context);

    // Should be undefined since token is expired
    expect(retrievedToken).toBeUndefined();
  });

  test("should separate tokens by collection and environment", () => {
    // Create multiple contexts
    const context1: TokenContextKey = {
      collectionPath: "/path/to/collection1.bru",
      environment: "dev",
    };

    const context2: TokenContextKey = {
      collectionPath: "/path/to/collection1.bru",
      environment: "prod",
    };

    const context3: TokenContextKey = {
      collectionPath: "/path/to/collection2.bru",
      environment: "dev",
    };

    // Store tokens for each context
    tokenManager.storeToken(context1, {
      token: "token1-dev",
      type: "Bearer",
    });

    tokenManager.storeToken(context2, {
      token: "token1-prod",
      type: "Bearer",
    });

    tokenManager.storeToken(context3, {
      token: "token2-dev",
      type: "Bearer",
    });

    // Retrieve and verify tokens
    expect(tokenManager.getToken(context1)?.token).toBe("token1-dev");
    expect(tokenManager.getToken(context2)?.token).toBe("token1-prod");
    expect(tokenManager.getToken(context3)?.token).toBe("token2-dev");
  });

  test("should clear specific tokens", () => {
    // Create token context
    const context: TokenContextKey = {
      collectionPath: "/path/to/collection.bru",
      environment: "dev",
    };

    // Store token
    tokenManager.storeToken(context, {
      token: "test-token",
      type: "Bearer",
    });

    // Clear the token
    tokenManager.clearToken(context);

    // Try to retrieve the cleared token
    const retrievedToken = tokenManager.getToken(context);

    // Should be undefined since token was cleared
    expect(retrievedToken).toBeUndefined();
  });

  test("should clear all tokens", () => {
    // Create multiple contexts
    const context1: TokenContextKey = {
      collectionPath: "/path/to/collection1.bru",
      environment: "dev",
    };

    const context2: TokenContextKey = {
      collectionPath: "/path/to/collection2.bru",
      environment: "dev",
    };

    // Store tokens for each context
    tokenManager.storeToken(context1, {
      token: "token1",
      type: "Bearer",
    });

    tokenManager.storeToken(context2, {
      token: "token2",
      type: "Bearer",
    });

    // Clear all tokens
    tokenManager.clearAllTokens();

    // Try to retrieve tokens
    expect(tokenManager.getToken(context1)).toBeUndefined();
    expect(tokenManager.getToken(context2)).toBeUndefined();
  });
});
