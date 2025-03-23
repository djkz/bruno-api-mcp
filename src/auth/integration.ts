/**
 * Example of integrating the auth module with BrunoParser
 *
 * This file shows how the auth module can be integrated with the existing BrunoParser
 * without modifying the parser itself.
 */

import { AuthService } from "./service.js";
import { BrunoEnvAdapter } from "./adapter.js";
import {
  RequestAuthConfig,
  CollectionAuthConfig,
  AuthResult,
} from "./types.js";
import debug from "debug";

const log = debug("bruno:auth:integration");

/**
 * TEMPLATE_VAR_REGEX should match the one used in BrunoParser
 * This regex matches {{baseUrl}} or any other template variable {{varName}}
 */
const TEMPLATE_VAR_REGEX = /{{([^}]+)}}/g;

/**
 * Function to apply authentication to a request based on BrunoParser data
 *
 * @param rawRequest The parsed raw request object from BrunoParser
 * @param parsedCollection The parsed collection object from BrunoParser
 * @param envVars Current environment variables map
 * @returns Authentication result with headers and query parameters
 */
export function applyAuthToParsedRequest(
  rawRequest: any,
  parsedCollection: any,
  envVars: Record<string, string>
): AuthResult {
  // Create environment adapter
  const envAdapter = new BrunoEnvAdapter(envVars, TEMPLATE_VAR_REGEX);

  // Get the request and collection auth configurations
  const requestAuth = rawRequest?.auth as RequestAuthConfig | undefined;
  const inheritFromCollection = rawRequest?.http?.auth === "inherit";
  const collectionAuth = parsedCollection?.auth as
    | CollectionAuthConfig
    | undefined;

  log(`Applying auth to request with inherit=${inheritFromCollection}`);

  // Apply authentication using the auth service
  return AuthService.applyAuth(
    requestAuth,
    inheritFromCollection,
    collectionAuth,
    envAdapter
  );
}

/**
 * Example usage in executeRequest method of BrunoParser:
 *
 * ```
 * async executeRequest(parsedRequest: ParsedRequest, params = {}) {
 *   // Create a temporary copy of environment variables
 *   const originalEnvVars = { ...this.envVars };
 *
 *   try {
 *     const { method, rawRequest } = parsedRequest;
 *     const { variables, ...requestParams } = params;
 *
 *     // Apply any custom variables if provided
 *     if (variables && typeof variables === 'object') {
 *       Object.entries(variables).forEach(([key, value]) => {
 *         this.envVars[key] = String(value);
 *       });
 *     }
 *
 *     // Get the original URL from rawRequest
 *     const originalUrl = rawRequest?.http?.url || parsedRequest.url;
 *
 *     // Process template variables in the URL
 *     let finalUrl = this.processTemplateVariables(originalUrl);
 *
 *     // Create URL object for manipulation
 *     const urlObj = new URL(finalUrl);
 *
 *     // Apply authentication using the auth module
 *     const authResult = applyAuthToParsedRequest(
 *       rawRequest,
 *       this.parsedCollection,
 *       this.envVars
 *     );
 *
 *     // Merge any headers from auth with existing headers
 *     const headers = {
 *       ...parsedRequest.headers,
 *       ...authResult.headers
 *     };
 *
 *     // Add query parameters from auth
 *     if (authResult.queryParams) {
 *       Object.entries(authResult.queryParams).forEach(([key, value]) => {
 *         urlObj.searchParams.set(key, value);
 *       });
 *     }
 *
 *     // Add other query parameters from the request
 *     Object.entries(queryParams).forEach(([key, value]) => {
 *       urlObj.searchParams.set(key, value);
 *     });
 *
 *     finalUrl = urlObj.toString();
 *
 *     // Proceed with the request...
 *   } finally {
 *     // Restore original environment variables
 *     this.envVars = originalEnvVars;
 *   }
 * }
 * ```
 */
