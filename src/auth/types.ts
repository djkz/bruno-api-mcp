// Authentication types and interfaces

// Interface for environment variable provider
export interface EnvVariableProvider {
  getVariable(name: string): string | undefined;
  processTemplateVariables(input: string): string;
}

// Interface for authentication result
export interface AuthResult {
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
}

// Base interface for all authentication handlers
export interface AuthHandler {
  // Apply authentication to headers and query params
  applyAuth(envProvider: EnvVariableProvider): AuthResult;
}

// Basic auth configuration
export interface BasicAuthConfig {
  username: string;
  password?: string;
}

// Bearer auth configuration
export interface BearerAuthConfig {
  token: string;
  inQuery?: boolean;
  queryParamName?: string;
}

// API Key auth configuration
export interface ApiKeyAuthConfig {
  key: string;
  value: string;
  addTo?: "header" | "queryParams";
}

// Collection-level auth configuration
export interface CollectionAuthConfig {
  mode: string;
  apikey?: ApiKeyAuthConfig;
  bearer?: BearerAuthConfig;
  basic?: BasicAuthConfig;
  [key: string]: any; // For other auth types
}

// Request-level auth configuration
export interface RequestAuthConfig {
  apikey?: ApiKeyAuthConfig;
  bearer?: BearerAuthConfig;
  basic?: BasicAuthConfig;
  [key: string]: any; // For other auth types
}
