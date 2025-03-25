import { TokenContextKey, TokenInfo } from "./types.js";
import debug from "debug";

const log = debug("bruno:auth:token-manager");
const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000; // 60 seconds buffer before expiry

/**
 * Manages OAuth2 tokens for different collections and environments
 */
export class TokenManager {
  private static instance: TokenManager;
  private tokenCache: Map<string, TokenInfo>;

  private constructor() {
    this.tokenCache = new Map<string, TokenInfo>();
  }

  /**
   * Get singleton instance of TokenManager
   */
  public static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * Create a unique key for token storage based on collection and environment
   */
  private createCacheKey(context: TokenContextKey): string {
    return `${context.collectionPath}:${context.environment || "default"}`;
  }

  /**
   * Store a token for a specific collection and environment
   */
  public storeToken(context: TokenContextKey, tokenInfo: TokenInfo): void {
    const key = this.createCacheKey(context);

    // Calculate expiration time if expires_in is provided
    if (tokenInfo.expiresAt === undefined && tokenInfo.token) {
      // Store without expiration if not provided
      log(`Storing token for ${key} without expiration`);
    } else {
      log(
        `Storing token for ${key} with expiration at ${new Date(
          tokenInfo.expiresAt!
        ).toISOString()}`
      );
    }

    this.tokenCache.set(key, tokenInfo);
  }

  /**
   * Get a token for a specific collection and environment
   * Returns undefined if no token exists or the token has expired
   */
  public getToken(context: TokenContextKey): TokenInfo | undefined {
    const key = this.createCacheKey(context);
    const tokenInfo = this.tokenCache.get(key);

    if (!tokenInfo) {
      log(`No token found for ${key}`);
      return undefined;
    }

    // Check if token has expired
    if (
      tokenInfo.expiresAt &&
      tokenInfo.expiresAt <= Date.now() + TOKEN_EXPIRY_BUFFER_MS
    ) {
      log(`Token for ${key} has expired or will expire soon`);
      return undefined;
    }

    log(`Retrieved valid token for ${key}`);
    return tokenInfo;
  }

  /**
   * Clear token for a specific collection and environment
   */
  public clearToken(context: TokenContextKey): void {
    const key = this.createCacheKey(context);
    this.tokenCache.delete(key);
    log(`Cleared token for ${key}`);
  }

  /**
   * Clear all tokens in the cache
   */
  public clearAllTokens(): void {
    this.tokenCache.clear();
    log("Cleared all tokens from cache");
  }
}
