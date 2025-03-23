import {
  ApiKeyAuthConfig,
  AuthHandler,
  AuthResult,
  EnvVariableProvider,
} from "../types.js";
import debug from "debug";

const log = debug("bruno:auth:apikey");

/**
 * Handler for API Key authentication
 */
export class ApiKeyAuthHandler implements AuthHandler {
  private config: ApiKeyAuthConfig;

  constructor(config: ApiKeyAuthConfig) {
    this.config = config;
  }

  /**
   * Apply API Key authentication to request
   * @param envProvider Environment variable provider
   * @returns Authentication result with headers or query parameters
   */
  applyAuth(envProvider: EnvVariableProvider): AuthResult {
    const result: AuthResult = {};

    // Process key and value with environment variables
    const key = this.config.key;
    const value = envProvider.processTemplateVariables(this.config.value || "");

    log(`Applying API Key auth with key: ${key}`);

    // Determine if API key should be in header or query params
    const addTo = this.config.addTo || "header";

    if (addTo === "header") {
      result.headers = { [key]: value };
      log(`Added API key to header: ${key}`);
    } else if (addTo === "queryParams") {
      result.queryParams = { [key]: value };
      log(`Added API key to query params: ${key}`);
    }

    return result;
  }
}
