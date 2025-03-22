/**
 * Type declaration for envToJson parser
 */
import { BrunoEnvironmentResult } from "./brulang";

/**
 * Parses a Bruno environment file content
 * @param input - The Bruno environment file content to parse
 * @returns The parsed environment variables
 */
declare const parser: (input: string) => BrunoEnvironmentResult;

export default parser;
