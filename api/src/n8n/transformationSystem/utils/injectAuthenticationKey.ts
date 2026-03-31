/**
 * Authentication Key Injection Utility
 *
 * Injects API authentication keys into compiled n8n nodes.
 * Replaces placeholder values with actual tenant API keys.
 */

/**
 * Injects authentication keys into all compiled nodes
 *
 * This function:
 * 1. Finds all HTTP Request nodes with authentication headers
 * 2. Replaces placeholder API keys with actual tenant API key
 * 3. Adds base URL parameters for Pulseline API nodes
 *
 * @param nodes - Array of compiled n8n nodes
 * @param apiKey - Tenant API key (format: accessKeyId.apiSecret)
 * @returns Modified nodes array with injected authentication
 */
export function injectAuthenticationKey(nodes: any[], apiKey?: string): any[] {
  if (!apiKey) {
    console.warn('⚠️  No API key provided - nodes will use placeholders');
    return nodes;
  }

  console.log('🔐 Injecting authentication keys into nodes...');

  let injectionCount = 0;

  const processedNodes = nodes.map((node) => {
    // Only process HTTP Request nodes
    if (node.type !== 'n8n-nodes-base.httpRequest') {
      return node;
    }

    // Check if node has headers with Authorization placeholder
    const params = node.parameters;

    // Handle JSON headers format (used by transformation system)
    if (params?.jsonHeaders) {
      try {
        const headers = JSON.parse(params.jsonHeaders);
        let modified = false;

        // Replace placeholder in Authorization header
        if (headers.Authorization) {
          if (headers.Authorization.includes('TENANT_API_KEY_PLACEHOLDER') ||
              headers.Authorization.includes('pulseline_api_key')) {
            headers.Authorization = `Bearer ${apiKey}`;
            modified = true;
          }
        }

        // Replace placeholder in X-API-Key header
        if (headers['X-API-Key']) {
          if (headers['X-API-Key'].includes('TENANT_API_KEY_PLACEHOLDER') ||
              headers['X-API-Key'].includes('pulseline_api_key')) {
            headers['X-API-Key'] = apiKey;
            modified = true;
          }
        }

        if (modified) {
          params.jsonHeaders = JSON.stringify(headers);
          injectionCount++;
          console.log(`   🔑 Injected API key into node: ${node.name || node.id}`);
        }
      } catch (error) {
        console.error(`⚠️  Failed to parse jsonHeaders for node ${node.id}:`, error);
      }
    }

    // Handle parameter-based header format
    if (params?.headerParameters?.parameters) {
      params.headerParameters.parameters.forEach((header: any) => {
        if (header.name === 'Authorization' &&
            (header.value.includes('TENANT_API_KEY_PLACEHOLDER') ||
             header.value.includes('pulseline_api_key'))) {
          header.value = `Bearer ${apiKey}`;
          injectionCount++;
          console.log(`   🔑 Injected API key into node: ${node.name || node.id}`);
        }
      });
    }

    // Inject base URL parameter for Pulseline API calls
    // This allows nodes to reference {{$parameter["pulseline_api_base_url"]}}
    if (params?.url && params.url.includes('pulseline_api_base_url')) {
      // The base URL is injected as a node parameter
      // n8n will resolve {{$parameter["pulseline_api_base_url"]}} at runtime
      if (!node.parameters.pulseline_api_base_url) {
        node.parameters.pulseline_api_base_url = process.env.BACKEND_API_URL || 'https://api.myzylo.app';
      }
    }

    return node;
  });

  if (injectionCount > 0) {
    console.log(`✅ Injected authentication into ${injectionCount} node(s)`);
  } else {
    console.log('ℹ️  No nodes required authentication injection');
  }

  return processedNodes;
}

/**
 * Checks if a node requires API key injection
 *
 * @param node - n8n node to check
 * @returns true if node needs API key injection
 */
export function nodeRequiresAuth(node: any): boolean {
  if (node.type !== 'n8n-nodes-base.httpRequest') {
    return false;
  }

  const params = node.parameters;

  // Check JSON headers
  if (params?.jsonHeaders) {
    try {
      const headers = JSON.parse(params.jsonHeaders);
      if (headers.Authorization?.includes('TENANT_API_KEY_PLACEHOLDER') ||
          headers.Authorization?.includes('pulseline_api_key')) {
        return true;
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Check parameter headers
  if (params?.headerParameters?.parameters) {
    return params.headerParameters.parameters.some((header: any) =>
      header.name === 'Authorization' &&
      (header.value.includes('TENANT_API_KEY_PLACEHOLDER') ||
       header.value.includes('pulseline_api_key'))
    );
  }

  return false;
}
