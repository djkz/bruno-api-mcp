import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import axios from "axios";
import {
  executeRequestWithAuth,
  BrunoResponse,
} from "../src/request-executor.js";
import { BrunoParser, ParsedRequest } from "../src/bruno-parser.js";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Request Executor", () => {
  let mockParser: BrunoParser;
  let mockRequest: ParsedRequest;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock response
    const mockResponse = {
      status: 200,
      headers: { "content-type": "application/json" },
      data: { success: true },
    };

    // Setup axios mock
    mockedAxios.mockResolvedValue(mockResponse);

    // Create mock parser
    mockParser = {
      processTemplateVariables: jest.fn((str) =>
        str.replace(/{{baseUrl}}/g, "https://api.example.com")
      ),
      processJsonTemplateVariables: jest.fn((json) => json),
      getCollection: jest.fn(() => ({})),
      getCurrentVariables: jest.fn(() => ({})),
      getCollectionPath: jest.fn(() => "/path/to/collection"),
      getCurrentEnvironmentName: jest.fn(() => "development"),
    } as unknown as BrunoParser;

    // Create mock request
    mockRequest = {
      name: "test-request",
      method: "GET",
      url: "{{baseUrl}}/api/test",
      headers: {},
      queryParams: {},
      rawRequest: {
        meta: { name: "test-request" },
        http: { method: "GET", url: "{{baseUrl}}/api/test" },
      },
    };
  });

  test("should replace template variables in URLs", async () => {
    const response = await executeRequestWithAuth(mockRequest, mockParser);

    expect(mockParser.processTemplateVariables).toHaveBeenCalledWith(
      "{{baseUrl}}/api/test"
    );
    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://api.example.com/api/test",
        method: "GET",
      })
    );
    expect(response.status).toBe(200);
  });

  test("should handle query parameters correctly", async () => {
    mockRequest.queryParams = { param1: "value1", param2: "value2" };

    await executeRequestWithAuth(mockRequest, mockParser);

    // The URL should contain the query parameters
    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining("param1=value1"),
      })
    );
    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining("param2=value2"),
      })
    );
  });

  test("should process JSON body correctly", async () => {
    mockRequest.body = {
      type: "json",
      content: { key: "value", nested: { test: true } },
    };

    await executeRequestWithAuth(mockRequest, mockParser);

    expect(mockParser.processJsonTemplateVariables).toHaveBeenCalledWith({
      key: "value",
      nested: { test: true },
    });

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { key: "value", nested: { test: true } },
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  test("should handle text body correctly", async () => {
    mockRequest.body = {
      type: "text",
      content: "Hello {{baseUrl}}",
    };

    await executeRequestWithAuth(mockRequest, mockParser);

    expect(mockParser.processTemplateVariables).toHaveBeenCalledWith(
      "Hello {{baseUrl}}"
    );
    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        data: "Hello {{baseUrl}}",
        headers: { "Content-Type": "text/plain" },
      })
    );
  });

  test("should handle form data correctly", async () => {
    mockRequest.body = {
      type: "form",
      content: { field1: "value1", field2: "{{baseUrl}}" },
    };

    await executeRequestWithAuth(mockRequest, mockParser);

    // Should have created a URLSearchParams object
    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })
    );
  });

  test("should handle request errors properly", async () => {
    // Mock an error response from axios
    const errorResponse = {
      response: {
        status: 404,
        headers: { "content-type": "application/json" },
        data: { error: "Not found" },
      },
    };

    mockedAxios.mockRejectedValueOnce(errorResponse);

    const response = await executeRequestWithAuth(mockRequest, mockParser);

    expect(response.status).toBe(404);
    expect(response.error).toBe(true);
    expect(response.data).toEqual({ error: "Not found" });
  });

  test("should handle network errors properly", async () => {
    // Mock a network error
    mockedAxios.mockRejectedValueOnce(new Error("Network error"));

    const response = await executeRequestWithAuth(mockRequest, mockParser);

    expect(response.status).toBe(0);
    expect(response.error).toBe(true);
    expect(response.data).toBe("Network error");
  });
});
