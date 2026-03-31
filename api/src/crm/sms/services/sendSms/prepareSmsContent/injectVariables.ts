export interface InjectVariablesRequest {
  content: string;
  resolvedVariables: Record<string, any>;
}

export interface InjectVariablesResponse {
  injectedContent: string;
}

class InjectVariables {
  /**
   * Replaces variable placeholders with resolved values
   * Supports three patterns:
   * 1. {{variableName}} → actual value
   * 2. {{$contact.variableName}} → actual value
   * 3. ={{ $("contactAdapter-X").item.json.variableName }} → actual value
   * Note: No HTML escaping needed for SMS (plain text only)
   */
  inject(request: InjectVariablesRequest): InjectVariablesResponse {
    console.log(`=💉 Injecting ${Object.keys(request.resolvedVariables).length} variable(s) into SMS content`);

    let injectedContent = request.content;

    // Pattern 1 & 2: Replace {{$contact.fieldName}} or {{fieldName}} with resolved value
    const templatePattern = /\{\{\$contact\.([a-zA-Z0-9_]+)\}\}|\{\{([a-zA-Z0-9_]+)\}\}/g;
    injectedContent = injectedContent.replace(templatePattern, (match, contactVar, simpleVar) => {
      const variableName = contactVar || simpleVar;
      const value = request.resolvedVariables[variableName];

      if (value === null || value === undefined) {
        console.log(`=💉 Replacing ${match} with "" (not found)`);
        return '';
      }

      const stringValue = String(value);
      console.log(`=💉 Replacing ${match} with "${stringValue}"`);
      return stringValue;
    });

    // Pattern 3: Replace n8n adapter expressions ={{ $("contactAdapter-X").item.json.fieldName }}
    const n8nAdapterPattern = /=\{\{\s*\$\(['"](contactAdapter-[^'"]+)['"]\)\.item\.json\.([a-zA-Z0-9_]+)\s*\}\}/g;
    injectedContent = injectedContent.replace(n8nAdapterPattern, (match, adapterNodeId, fieldName) => {
      const value = request.resolvedVariables[fieldName];

      if (value === null || value === undefined) {
        console.log(`=💉 Replacing n8n expression (${fieldName}) with "" (not found)`);
        return '';
      }

      const stringValue = String(value);
      console.log(`=💉 Replacing n8n expression (${fieldName} from ${adapterNodeId}) with "${stringValue}"`);
      return stringValue;
    });

    console.log(`✅ Variable injection complete`);

    return {
      injectedContent
    };
  }
}

export const injectVariables = new InjectVariables();
