/**
 * Type declarations for Bruno language parsers
 */

/**
 * Interface for parsed Bruno request result
 */
export interface BrunoRequestResult {
  meta: {
    name: string;
    type: string;
    seq?: number;
    [key: string]: any;
  };
  http: {
    method: string;
    url: string;
    body?: string;
    [key: string]: any;
  };
  body?: {
    json?: any;
    text?: string;
    [key: string]: any;
  };
  headers?: Record<string, string>;
  query?: Record<string, string>;
  [key: string]: any;
}

/**
 * Interface representing an environment variable
 */
export interface BrunoEnvVariable {
  name: string;
  value: string | null;
  enabled: boolean;
  secret: boolean;
}

/**
 * Interface for parsed Bruno environment result
 */
export interface BrunoEnvironmentResult {
  variables: BrunoEnvVariable[];
  vars?: Record<string, string>;
}

/**
 * Interface for parsed Bruno collection result
 */
export interface BrunoCollectionResult {
  meta: {
    name: string;
    [key: string]: any;
  };
  auth?: {
    mode: string;
    apikey?: any;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Parses a Bruno request file content
 * @param input - The Bruno request file content to parse
 * @returns The parsed request object
 */
export function bruToJson(input: string): BrunoRequestResult;

/**
 * Parses a Bruno environment file content
 * @param input - The Bruno environment file content to parse
 * @returns The parsed environment variables
 */
export function envToJson(input: string): BrunoEnvironmentResult;

/**
 * Parses a Bruno collection file content
 * @param input - The Bruno collection file content to parse
 * @returns The parsed collection object
 */
export function collectionBruToJson(input: string): BrunoCollectionResult;
