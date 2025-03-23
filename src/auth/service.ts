import { AuthHandlerFactory } from "./factory.js";
import {
  AuthResult,
  CollectionAuthConfig,
  EnvVariableProvider,
  RequestAuthConfig,
} from "./types.js";
import debug from "debug";

const log = debug("bruno:auth:service");

/**
 * Service to handle authentication for requests
 */
export class AuthService {
  /**
   * Apply authentication to a request based on the auth configuration
   *
   * @param requestAuth Request-level auth configuration
   * @param inheritFromCollection Whether to inherit auth from collection
   * @param collectionAuth Collection-level auth configuration (if inheriting)
   * @param envProvider Environment variable provider for template processing
   * @returns Authentication result with headers and/or query parameters
   */
  static applyAuth(
    requestAuth: RequestAuthConfig | undefined,
    inheritFromCollection: boolean,
    collectionAuth: CollectionAuthConfig | undefined,
    envProvider: EnvVariableProvider
  ): AuthResult {
    const result: AuthResult = {
      headers: {},
      queryParams: {},
    };

    try {
      let authHandler = null;

      // Determine which auth configuration to use
      if (inheritFromCollection && collectionAuth) {
        log("Using inherited auth from collection");
        authHandler =
          AuthHandlerFactory.createFromCollectionAuth(collectionAuth);
      } else if (requestAuth) {
        log("Using request-specific auth");
        authHandler = AuthHandlerFactory.createFromRequestAuth(requestAuth);
      }

      // If we have a handler, apply the auth
      if (authHandler) {
        const authResult = authHandler.applyAuth(envProvider);

        // Merge auth result headers with result
        if (authResult.headers) {
          result.headers = {
            ...result.headers,
            ...authResult.headers,
          };
        }

        // Merge auth result query params with result
        if (authResult.queryParams) {
          result.queryParams = {
            ...result.queryParams,
            ...authResult.queryParams,
          };
        }
      } else {
        log("No auth handler found, skipping auth");
      }
    } catch (error) {
      log("Error applying auth:", error);
    }

    return result;
  }
}
