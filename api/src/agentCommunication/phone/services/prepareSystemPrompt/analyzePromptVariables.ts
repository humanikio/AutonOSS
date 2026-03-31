/**
 * Analyzes system prompts to extract custom field variable expressions
 *
 * Supports the same expression patterns used across the platform:
 * - {{$contact.fieldName}} - Explicit contact field reference
 * - {{fieldName}} - Simple variable reference
 * - ={{ $("contactAdapter-X").item.json.fieldName }} - n8n workflow expression
 */

export interface AnalyzePromptVariablesRequest {
  content: string;
}

export interface AnalyzePromptVariablesResponse {
  variables: string[];  // Unique variable names found in prompt
}

class AnalyzePromptVariables {
  /**
   * Extracts custom variables from agent system prompt
   * Uses same patterns as SMS/Email/Workflow variable extraction
   */
  analyze(request: AnalyzePromptVariablesRequest): AnalyzePromptVariablesResponse {
    console.log('🔍 Analyzing system prompt for custom variables');

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

    console.log(`🔍 Found ${uniqueVariables.length} unique variable(s): ${uniqueVariables.join(', ') || 'none'}`);

    return {
      variables: uniqueVariables
    };
  }
}

export const analyzePromptVariables = new AnalyzePromptVariables();
