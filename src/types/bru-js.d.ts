declare module "bru-js" {
  /**
   * Parse a Bruno (.bru) file content into a JavaScript object
   * @param content The Bruno file content as a string
   * @returns The parsed Bruno data as a JavaScript object
   */
  export function parse(content: string): any;

  /**
   * Convert a JavaScript object to a Bruno (.bru) file format
   * @param data The JavaScript object to convert
   * @returns The Bruno file content as a string
   */
  export function stringify(data: any): string;
}
