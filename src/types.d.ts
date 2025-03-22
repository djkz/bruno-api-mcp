declare module "./bruno-lang/brulang.js" {
  export function bruToJson(content: string): any;
  export function envToJson(content: string): {
    vars: Record<string, string>;
  };
}
