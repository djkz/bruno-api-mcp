/**
 * Type declaration for bruToJson parser
 */
import { BrunoRequestResult } from "./brulang";

/**
 * Parses a Bruno request file content
 * @param input - The Bruno request file content to parse
 * @returns The parsed request object
 */
declare const parser: (input: string) => BrunoRequestResult;

export default parser;
