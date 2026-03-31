/**
 * n8n HttpRequest Node Schema (v4 / v4.2)
 * Source: n8n/packages/nodes-base/nodes/HttpRequest/V3/HttpRequestV3.node.ts
 *
 * The HttpRequest node allows making HTTP requests to external APIs.
 * We use v4 for adapters and v4.2 for wait node registration.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface HttpRequestHeaderParameter {
  name: string;
  value: string;
}

export interface HttpRequestBodyParameter {
  name: string;
  value: string;
}

export interface HttpRequestParameters {
  method: HttpMethod;
  url: string;
  authentication?: 'none' | 'genericCredentialType' | 'predefinedCredentialType';
  genericAuthType?: 'httpBasicAuth' | 'httpDigestAuth' | 'httpHeaderAuth' | 'httpQueryAuth' | 'httpCustomAuth' | 'oAuth1Api' | 'oAuth2Api';

  // Headers
  sendHeaders?: boolean;
  specifyHeaders?: 'json' | 'keypair';
  jsonHeaders?: string; // JSON string when using 'json' mode
  headerParameters?: {
    parameters: HttpRequestHeaderParameter[];
  };

  // Body
  sendBody?: boolean;
  contentType?: 'json' | 'form-urlencoded' | 'multipart-form-data' | 'raw' | 'binaryData';
  specifyBody?: 'json' | 'keypair';
  jsonBody?: string; // n8n expression or JSON string
  bodyParameters?: {
    parameters: HttpRequestBodyParameter[];
  };

  // Response
  responseFormat?: 'json' | 'text' | 'file' | 'autodetect';

  // Options
  options?: {
    timeout?: number;
    response?: {
      response?: {
        neverError?: boolean; // Continue workflow even on HTTP errors
        responseFormat?: string;
        outputPropertyName?: string;
      };
    };
    redirect?: {
      redirect?: {
        followRedirects?: boolean;
        maxRedirects?: number;
      };
    };
  };
}

export interface HttpRequestNodeConfig {
  id: string;
  name: string;
  type: 'n8n-nodes-base.httpRequest';
  typeVersion: 4 | 4.1 | 4.2 | 4.3;
  position: [number, number];
  parameters: HttpRequestParameters;
  continueOnFail?: boolean; // Workflow-level error handling
}

/**
 * Constants for common HttpRequest node configurations
 */
export const HTTP_REQUEST_DEFAULTS = {
  type: 'n8n-nodes-base.httpRequest' as const,
  typeVersion: 4.2 as const,
  authentication: 'none' as const,
  responseFormat: 'json' as const,
};

/**
 * Helper to create header parameters
 */
export function createHeaderParameter(name: string, value: string): HttpRequestHeaderParameter {
  return { name, value };
}

/**
 * Helper to create body parameters
 */
export function createBodyParameter(name: string, value: string): HttpRequestBodyParameter {
  return { name, value };
}
