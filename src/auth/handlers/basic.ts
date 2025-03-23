import {
  AuthHandler,
  AuthResult,
  BasicAuthConfig,
  EnvVariableProvider,
} from "../types.js";
import debug from "debug";

const log = debug("bruno:auth:basic");

/**
 * Handler for Basic authentication
 */
export class BasicAuthHandler implements AuthHandler {
  private config: BasicAuthConfig;

  constructor(config: BasicAuthConfig) {
    this.config = config;
  }

  /**
   * Apply Basic authentication to request
   * @param envProvider Environment variable provider
   * @returns Authentication result with Authorization header
   */
  applyAuth(envProvider: EnvVariableProvider): AuthResult {
    const result: AuthResult = {
      headers: {},
    };

    // Process username and password with environment variables
    const username = envProvider.processTemplateVariables(this.config.username);
    const password = envProvider.processTemplateVariables(
      this.config.password || ""
    );

    log("Applying Basic auth");

    // Create base64 encoded credentials
    const encoded = Buffer.from(`${username}:${password}`).toString("base64");
    result.headers!["Authorization"] = `Basic ${encoded}`;

    log("Added Basic auth to Authorization header");

    return result;
  }
}
