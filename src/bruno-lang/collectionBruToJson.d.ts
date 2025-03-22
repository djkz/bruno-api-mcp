/**
 * Type declaration for collectionBruToJson parser
 */
import { BrunoCollectionResult } from "./brulang";

/**
 * Parses a Bruno collection file content
 * @param input - The Bruno collection file content to parse
 * @returns The parsed collection object
 */
declare const parser: (input: string) => BrunoCollectionResult;

export default parser;
