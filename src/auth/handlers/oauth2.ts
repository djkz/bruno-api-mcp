import axios from "axios";
import {
  AuthHandler,
  AuthResult,
  EnvVariableProvider,
  OAuth2AuthConfig,
  OAuth2TokenResponse,
} from "../types.js";
import { TokenManager } from "../token-manager.js";
import debug from "debug";

const log = debug("bruno:auth:oauth2");

/**
 * Handler for OAuth2 authentication
 */
export class OAuth2AuthHandler implements AuthHandler {
  private config: OAuth2AuthConfig;
  private tokenManager: TokenManager;
  private collectionPath?: string;
  private environment?: string;

  constructor(
    config: OAuth2AuthConfig,
    collectionPath?: string,
    environment?: string
  ) {
    this.config = config;
    this.tokenManager = TokenManager.getInstance();
    this.collectionPath = collectionPath;
    this.environment = environment;
  }

  /**
   * Apply OAuth2 authentication to a request
   * Note: OAuth2 requires async operations but our interface doesn't support async.
   * We handle this by returning empty auth initially and updating later if needed.
   */
  public applyAuth(envProvider: EnvVariableProvider): AuthResult {
    log("Applying OAuth2 auth");
    const result: AuthResult = {
      headers: {},
    };

    // Check if we have a token from environment variables
    const accessTokenFromEnv = envProvider.getVariable(
      "access_token_set_by_collection_script"
    );
    if (accessTokenFromEnv) {
      log("Using access token from environment variable");
      result.headers!["Authorization"] = `Bearer ${accessTokenFromEnv}`;
      return result;
    }

    // Try to get token from cache if we have collection path
    if (this.collectionPath) {
      const tokenInfo = this.tokenManager.getToken({
        collectionPath: this.collectionPath,
        environment: this.environment,
      });

      if (tokenInfo) {
        log("Using cached token");
        result.headers![
          "Authorization"
        ] = `${tokenInfo.type} ${tokenInfo.token}`;
        return result;
      }
    }

    // We need to request a token, but can't do async in this interface
    // Start token acquisition in background
    this.acquireTokenAsync(envProvider);

    return result;
  }

  /**
   * Asynchronously acquire token
   * This runs in the background and updates environment variables when complete
   */
  private acquireTokenAsync(envProvider: EnvVariableProvider): void {
    // Process template variables in config
    const accessTokenUrl = envProvider.processTemplateVariables(
      this.config.access_token_url
    );
    const clientId = envProvider.processTemplateVariables(
      this.config.client_id
    );
    const clientSecret = envProvider.processTemplateVariables(
      this.config.client_secret
    );
    const scope = this.config.scope
      ? envProvider.processTemplateVariables(this.config.scope)
      : undefined;

    // Request token and process asynchronously
    this.requestToken(accessTokenUrl, clientId, clientSecret, scope)
      .then((tokenResponse) => {
        // Cache the token if we have collection path
        if (this.collectionPath) {
          this.storeToken(tokenResponse);
        }

        // Update environment with token for script access if provider supports it
        if (envProvider.setVariable) {
          envProvider.setVariable(
            "access_token_set_by_collection_script",
            tokenResponse.access_token
          );
        }

        log("Token acquired and stored successfully");
      })
      .catch((error) => {
        log("Error during async token acquisition:", error);
      });
  }

  /**
   * Request a new OAuth2 token
   */
  private async requestToken(
    accessTokenUrl: string,
    clientId: string,
    clientSecret: string,
    scope?: string
  ): Promise<OAuth2TokenResponse> {
    try {
      const params = new URLSearchParams();
      params.append("grant_type", this.config.grant_type);
      params.append("client_id", clientId);
      params.append("client_secret", clientSecret);

      if (scope) {
        params.append("scope", scope);
      }

      // Add any additional parameters
      if (this.config.additional_params) {
        Object.entries(this.config.additional_params).forEach(
          ([key, value]) => {
            params.append(key, value);
          }
        );
      }

      const response = await axios.post<OAuth2TokenResponse>(
        accessTokenUrl,
        params.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      log("Token request successful");
      return response.data;
    } catch (error) {
      log("Error requesting OAuth2 token:", error);
      throw new Error(`OAuth2 token request failed: ${error}`);
    }
  }

  /**
   * Store token in the token manager
   */
  private storeToken(tokenResponse: OAuth2TokenResponse): void {
    if (!this.collectionPath) {
      return;
    }

    const expiresAt = tokenResponse.expires_in
      ? Date.now() + tokenResponse.expires_in * 1000
      : undefined;

    this.tokenManager.storeToken(
      {
        collectionPath: this.collectionPath,
        environment: this.environment,
      },
      {
        token: tokenResponse.access_token,
        type: tokenResponse.token_type || "Bearer",
        expiresAt,
        refreshToken: tokenResponse.refresh_token,
      }
    );
  }
}
