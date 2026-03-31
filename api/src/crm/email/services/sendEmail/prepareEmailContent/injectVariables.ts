export interface InjectVariablesRequest {
  content: string;
  isHtml: boolean;
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
   */
  inject(request: InjectVariablesRequest): InjectVariablesResponse {
    console.log(`=💉 Injecting ${Object.keys(request.resolvedVariables).length} variable(s) into ${request.isHtml ? 'HTML' : 'TEXT'} content`);

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
      const finalValue = request.isHtml ? this.escapeHtml(stringValue) : stringValue;

      console.log(`=💉 Replacing ${match} with "${finalValue}"`);
      return finalValue;
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
      const finalValue = request.isHtml ? this.escapeHtml(stringValue) : stringValue;

      console.log(`=💉 Replacing n8n expression (${fieldName} from ${adapterNodeId}) with "${finalValue}"`);
      return finalValue;
    });

    console.log(`✅ Variable injection complete`);

    return {
      injectedContent
    };
  }

  /**
   * Escapes HTML special characters to prevent XSS
   * Used when injecting variables into HTML content
   */
  private escapeHtml(text: string): string {
    const htmlEscapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };

    return text.replace(/[&<>"']/g, (char) => htmlEscapeMap[char] || char);
  }
}

export const injectVariables = new InjectVariables();
