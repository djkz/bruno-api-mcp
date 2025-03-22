import * as path from "path";
import bruToJsonParser from "../src/bruno-lang/bruToJson.js";
import { describe, it, expect } from "@jest/globals";

// Set test environment
process.env.NODE_ENV = "test";

describe("bruno parser defaults", () => {
  it("should parse default type and sequence", () => {
    const input = `
meta {
  name: Test API
  type: http
}
get {
  url: http://localhost:3000/api
}`;

    const result = bruToJsonParser(input);

    expect(result).toBeDefined();
    expect(result.meta).toBeDefined();
    expect(result.meta.name).toBe("Test API");

    // The parser returns HTTP info in the http property
    expect(result.http).toBeDefined();
    expect(result.http.method).toBe("get");
    expect(result.http.url).toBe("http://localhost:3000/api");
  });

  it("should default body mode to json when body is present", () => {
    const input = `
meta {
  name: Test POST
  type: http
}
post {
  url: http://localhost:3000/api
}
body {
  {
    "test": "value",
    "number": 123
  }
}`;

    const result = bruToJsonParser(input);

    expect(result).toBeDefined();
    expect(result.meta).toBeDefined();
    expect(result.meta.name).toBe("Test POST");

    // The parser returns method info in the http property
    expect(result.http).toBeDefined();
    expect(result.http.method).toBe("post");
    expect(result.http.url).toBe("http://localhost:3000/api");

    // Body should be defined with a json property
    expect(result.body).toBeDefined();
    expect(result.http.body).toBe("json");
    expect(result.body?.json).toBeDefined();
  });
});
