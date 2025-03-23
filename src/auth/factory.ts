import {
  AuthHandler,
  CollectionAuthConfig,
  RequestAuthConfig,
} from "./types.js";
import { ApiKeyAuthHandler } from "./handlers/apikey.js";
import { BearerAuthHandler } from "./handlers/bearer.js";
import { BasicAuthHandler } from "./handlers/basic.js";
import debug from "debug";

const log = debug("bruno:auth");

/**
 * Factory class to create authentication handlers based on auth type
 */
export class AuthHandlerFactory {
  /**
   * Create auth handler from collection auth configuration
   * @param collectionAuth Collection auth configuration
   * @returns Authentication handler or null if no valid auth found
   */
  static createFromCollectionAuth(
    collectionAuth: CollectionAuthConfig | undefined
  ): AuthHandler | null {
    if (!collectionAuth) {
      return null;
    }

    log(
      `Creating auth handler from collection auth with mode: ${collectionAuth.mode}`
    );

    switch (collectionAuth.mode) {
      case "apikey":
        if (collectionAuth.apikey) {
          return new ApiKeyAuthHandler(collectionAuth.apikey);
        }
        break;
      case "bearer":
        if (collectionAuth.bearer) {
          return new BearerAuthHandler(collectionAuth.bearer);
        }
        break;
      case "basic":
        if (collectionAuth.basic) {
          return new BasicAuthHandler(collectionAuth.basic);
        }
        break;
      default:
        log(`Unsupported auth mode: ${collectionAuth.mode}`);
        break;
    }

    return null;
  }

  /**
   * Create auth handler from request auth configuration
   * @param requestAuth Request auth configuration
   * @returns Authentication handler or null if no valid auth found
   */
  static createFromRequestAuth(
    requestAuth: RequestAuthConfig | undefined
  ): AuthHandler | null {
    if (!requestAuth) {
      return null;
    }

    log("Creating auth handler from request auth");

    // Request auth doesn't have a mode; it directly contains auth configs
    if (requestAuth.apikey) {
      return new ApiKeyAuthHandler(requestAuth.apikey);
    } else if (requestAuth.bearer) {
      return new BearerAuthHandler(requestAuth.bearer);
    } else if (requestAuth.basic) {
      return new BasicAuthHandler(requestAuth.basic);
    }

    return null;
  }
}
