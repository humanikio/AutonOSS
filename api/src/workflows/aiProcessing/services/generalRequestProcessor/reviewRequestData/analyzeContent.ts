export interface AnalyzeContentRequest {
  content: string;
}

export interface AnalyzeContentResponse {
  variables: string[];  // Unique variable names found in template
}

class AnalyzeContent {
  /**
   * Extracts custom variables from content template
   * Supports three variable syntax patterns:
   * 1. {{variableName}} - Simple template variable
   * 2. {{$contact.variableName}} - Contact field placeholder
   * 3. ={{ $("contactAdapter-XXXX").item.json.variableName }} - n8n workflow expression
   */
  analyze(request: AnalyzeContentRequest): AnalyzeContentResponse {
    console.log(`=🔍 Analyzing content for variables`);

    const variables = new Set<string>();

    // Pattern 1 & 2: Template variables - {{$contact.fieldName}} and {{fieldName}}
    const templatePattern = /\{\{\$contact\.([a-zA-Z0-9_]+)\}\}|\{\{([a-zA-Z0-9_]+)\}\}/g;
    let match;
    while ((match = templatePattern.exec(request.content)) !== null) {
      const variableName = match[1] || match[2];
      if (variableName) {
        variables.add(variableName);
        console.log(`   🔹 Found template variable: ${variableName}`);
      }
    }

    // Pattern 3: n8n workflow adapter expressions - ={{ $("contactAdapter-X").item.json.fieldName }}
    const n8nAdapterPattern = /=\{\{\s*\$\(['"](contactAdapter-[^'"]+)['"]\)\.item\.json\.([a-zA-Z0-9_]+)\s*\}\}/g;
    while ((match = n8nAdapterPattern.exec(request.content)) !== null) {
      const fieldName = match[2];
      if (fieldName) {
        variables.add(fieldName);
        console.log(`   🔹 Found n8n adapter variable: ${fieldName} (from ${match[1]})`);
      }
    }

    const uniqueVariables = Array.from(variables);

    console.log(`=🔍 Found ${uniqueVariables.length} unique variable(s): ${uniqueVariables.join(', ') || 'none'}`);

    return {
      variables: uniqueVariables
    };
  }
}

export const analyzeContent = new AnalyzeContent();
