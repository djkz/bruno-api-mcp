import {
  AuthHandler,
  AuthResult,
  BearerAuthConfig,
  EnvVariableProvider,
} from "../types.js";
import debug from "debug";

const log = debug("bruno:auth:bearer");

/**
 * Handler for Bearer token authentication
 */
export class BearerAuthHandler implements AuthHandler {
  private config: BearerAuthConfig;

  constructor(config: BearerAuthConfig) {
    this.config = config;
  }

  /**
   * Apply Bearer token authentication to request
   * @param envProvider Environment variable provider
   * @returns Authentication result with headers or query parameters
   */
  applyAuth(envProvider: EnvVariableProvider): AuthResult {
    const result: AuthResult = {};

    // Process token with environment variables
    const token = envProvider.processTemplateVariables(this.config.token || "");

    log("Applying Bearer token auth");

    // Determine if token should be in header or query parameter
    if (this.config.inQuery) {
      const queryKey = this.config.queryParamName || "access_token";
      result.queryParams = { [queryKey]: token };
      log(`Added Bearer token to query parameter: ${queryKey}`);
    } else {
      // Default is to add as Authorization header
      result.headers = { Authorization: `Bearer ${token}` };
      log("Added Bearer token to Authorization header");
    }

    return result;
  }
}
