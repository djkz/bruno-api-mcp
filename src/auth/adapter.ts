import { EnvVariableProvider } from "./types.js";

/**
 * Adapter for BrunoParser to implement EnvVariableProvider
 * Allows us to use the auth module with the existing BrunoParser
 */
export class BrunoEnvAdapter implements EnvVariableProvider {
  private envVars: Record<string, string>;
  private templateVarRegex: RegExp;

  /**
   * Create a new adapter
   * @param envVars Environment variables map
   * @param templateVarRegex Regex to match template variables
   */
  constructor(envVars: Record<string, string>, templateVarRegex: RegExp) {
    this.envVars = envVars;
    this.templateVarRegex = templateVarRegex;
  }

  /**
   * Get an environment variable value
   * @param name Variable name
   * @returns Variable value or undefined if not found
   */
  getVariable(name: string): string | undefined {
    return this.envVars[name];
  }

  /**
   * Process template variables in a string
   * @param input String with template variables
   * @returns Processed string with variables replaced by their values
   */
  processTemplateVariables(input: string): string {
    if (!input || typeof input !== "string") {
      return input;
    }

    return input.replace(
      this.templateVarRegex,
      (match: string, varName: string) => {
        const trimmedVarName = varName.trim();
        return this.envVars[trimmedVarName] !== undefined
          ? this.envVars[trimmedVarName]
          : match;
      }
    );
  }
}
