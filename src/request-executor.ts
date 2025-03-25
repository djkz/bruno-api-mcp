import axios from "axios";
import debug from "debug";
import { BrunoParser, ParsedRequest } from "./bruno-parser.js";
import { applyAuthToParsedRequest } from "./auth/integration.js";

const log = debug("bruno:request-executor");
const debugReq = debug("bruno:request-executor:req");
const debugRes = debug("bruno:request-executor:res");

export interface BrunoResponse {
  status: number;
  headers: any;
  data: any;
  isJson?: boolean;
  error?: boolean;
}

/**
 * Executes a parsed request with authentication
 *
 * @param parsedRequest The parsed request to execute
 * @param parser The BrunoParser instance
 * @param params Optional parameters (variables, timeout, etc.)
 * @returns Response object with status, headers, and data
 */
export async function executeRequestWithAuth(
  parsedRequest: ParsedRequest,
  parser: BrunoParser,
  params: Record<string, any> = {}
): Promise<BrunoResponse> {
  const { method, rawRequest } = parsedRequest;
  const { timeout = 30000 } = params;

  try {
    // Process the URL and query parameters
    let finalUrl = parser.processTemplateVariables(parsedRequest.url);

    // Create URL object for manipulation
    const urlObj = new URL(finalUrl);

    // Apply authentication using our auth module
    const authResult = applyAuthToParsedRequest(
      rawRequest,
      parser.getCollection(),
      parser.getCurrentVariables(),
      parser.getCollectionPath(),
      parser.getCurrentEnvironmentName()
    );

    // Process headers
    const headers: Record<string, string> = {};
    Object.entries(parsedRequest.headers).forEach(([key, value]) => {
      headers[key] = parser.processTemplateVariables(value);
    });

    // Merge auth headers
    if (authResult.headers) {
      Object.entries(authResult.headers).forEach(([key, value]) => {
        headers[key] = value;
      });
    }

    // Add query parameters
    Object.entries(parsedRequest.queryParams).forEach(([key, value]) => {
      urlObj.searchParams.set(
        key,
        parser.processTemplateVariables(value.toString())
      );
    });

    // Add auth query parameters
    if (authResult.queryParams) {
      Object.entries(authResult.queryParams).forEach(([key, value]) => {
        urlObj.searchParams.set(key, value);
      });
    }

    // Add additional query parameters from params
    if (params.queryParams) {
      Object.entries(params.queryParams).forEach(([key, value]) => {
        urlObj.searchParams.set(
          key,
          parser.processTemplateVariables(String(value))
        );
      });
    }

    finalUrl = urlObj.toString();

    // Set up request configuration
    const requestConfig: Record<string, any> = {
      url: finalUrl,
      method: method.toUpperCase(),
      headers,
      timeout,
    };

    // Handle request body
    if (parsedRequest.body) {
      const { type, content } = parsedRequest.body;

      if (type === "json" && content) {
        try {
          // Process template variables in JSON body
          const processedContent = parser.processJsonTemplateVariables(content);
          requestConfig.data = processedContent;
          if (!headers["Content-Type"]) {
            headers["Content-Type"] = "application/json";
          }
        } catch (error) {
          log(`Error processing JSON body: ${error}`);
          requestConfig.data = content;
        }
      } else if (type === "text" && content) {
        // Process template variables in text body
        requestConfig.data = parser.processTemplateVariables(content);
        if (!headers["Content-Type"]) {
          headers["Content-Type"] = "text/plain";
        }
      } else if (type === "form" && content && typeof content === "object") {
        // Handle form data
        const formData = new URLSearchParams();
        Object.entries(content).forEach(([key, value]) => {
          formData.append(key, parser.processTemplateVariables(String(value)));
        });
        requestConfig.data = formData;
        if (!headers["Content-Type"]) {
          headers["Content-Type"] = "application/x-www-form-urlencoded";
        }
      }
    }

    // Log the request details
    debugReq(`Request URL: ${finalUrl}`);
    debugReq(`Request method: ${method.toUpperCase()}`);
    debugReq(`Request headers:`, headers);
    if (requestConfig.data) {
      debugReq(`Request body:`, requestConfig.data);
    }

    // Execute the request
    const axiosResponse = await axios(requestConfig);

    // Convert response to Bruno response format
    const response: BrunoResponse = {
      status: axiosResponse.status,
      headers: axiosResponse.headers,
      data: axiosResponse.data,
      isJson: typeof axiosResponse.data === "object",
    };

    // Log the response details
    debugRes(`Response status: ${response.status}`);
    debugRes(`Response headers:`, response.headers);
    if (response.data) {
      debugRes(`Response body:`, response.data);
    }

    return response;
  } catch (error: any) {
    log(`Error executing request: ${error.message}`);

    // Handle axios errors
    if (error.response) {
      // Server responded with a status code outside of 2xx range
      const response: BrunoResponse = {
        status: error.response.status,
        headers: error.response.headers,
        data: error.response.data,
        isJson: typeof error.response.data === "object",
        error: true,
      };
      return response;
    }

    // Network error, timeout, or other issues
    return {
      status: 0,
      headers: {},
      data: error.message || String(error),
      error: true,
    };
  }
}
