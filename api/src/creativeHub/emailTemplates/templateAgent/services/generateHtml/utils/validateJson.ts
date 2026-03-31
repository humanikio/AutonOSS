/**
 * JSON Validation and Repair Utility for HTML Generation
 * Handles malformed JSON responses from Claude with robust parsing and repair mechanisms
 */

export interface JsonValidationResult {
  success: boolean;
  data?: any;
  error?: string;
  repaired?: boolean;
  originalLength?: number;
  repairedLength?: number;
}

export interface HtmlGenerationData {
  assistantMessage: string;
  html: string;
}

export class HtmlGenerationJsonValidator {
  /**
   * Safely parse JSON with automatic repair mechanisms
   */
  static validateAndParse(jsonString: string, context?: string): JsonValidationResult {
    const originalLength = jsonString.length;

    try {
      // Log for debugging
      if (context) {
        console.log(`[JSON Validation] Context: ${context}`);
        console.log(`[JSON Validation] Original JSON length: ${originalLength}`);
        console.log(`[JSON Validation] JSON preview: ${jsonString.substring(0, 200)}${jsonString.length > 200 ? '...' : ''}`);
      }

      // Step 1: Try direct parsing first
      try {
        const result = JSON.parse(jsonString);
        console.log(`[JSON Validation]  JSON parsed successfully without repair`);
        return {
          success: true,
          data: result,
          originalLength,
          repaired: false
        };
      } catch (directError) {
        console.log(`[JSON Validation]   Direct JSON parsing failed: ${directError instanceof Error ? directError.message : 'Unknown error'}`);
      }

      // Step 2: Apply repair mechanisms
      const repairedJson = this.repairJson(jsonString);
      const repairedLength = repairedJson.length;

      try {
        const result = JSON.parse(repairedJson);
        console.log(`[JSON Validation]  JSON successfully repaired and parsed`);
        console.log(`[JSON Validation] Repaired JSON length: ${repairedLength}`);

        return {
          success: true,
          data: result,
          originalLength,
          repairedLength,
          repaired: true
        };
      } catch (repairedError) {
        console.log(`[JSON Validation] L JSON repair failed: ${repairedError instanceof Error ? repairedError.message : 'Unknown error'}`);

        // Step 3: Try extracting JSON from larger response
        const extractedJson = this.extractJsonFromResponse(jsonString);
        if (extractedJson) {
          try {
            const result = JSON.parse(extractedJson);
            console.log(`[JSON Validation]  JSON successfully extracted and parsed`);

            return {
              success: true,
              data: result,
              originalLength,
              repairedLength: extractedJson.length,
              repaired: true
            };
          } catch (extractError) {
            console.log(`[JSON Validation] L Extracted JSON parsing failed: ${extractError instanceof Error ? extractError.message : 'Unknown error'}`);
          }
        }

        return {
          success: false,
          error: `JSON parsing failed after all repair attempts: ${repairedError instanceof Error ? repairedError.message : 'Unknown error'}`,
          originalLength
        };
      }

    } catch (error) {
      return {
        success: false,
        error: `JSON validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        originalLength
      };
    }
  }

  /**
   * Apply various JSON repair mechanisms
   */
  private static repairJson(jsonString: string): string {
    let repaired = jsonString.trim();

    // 1. Remove markdown code blocks
    repaired = repaired.replace(/^```json\n?/gm, '');
    repaired = repaired.replace(/^```\n?/gm, '');
    repaired = repaired.replace(/\n?```$/gm, '');

    // 2. Remove any text before the first {
    const firstBraceIndex = repaired.indexOf('{');
    if (firstBraceIndex > 0) {
      repaired = repaired.substring(firstBraceIndex);
    }

    // 3. Remove any text after the last }
    const lastBraceIndex = repaired.lastIndexOf('}');
    if (lastBraceIndex > 0 && lastBraceIndex < repaired.length - 1) {
      repaired = repaired.substring(0, lastBraceIndex + 1);
    }

    // 4. Fix problematic escape sequences and characters
    if (repaired.startsWith('\\')) {
      repaired = repaired.substring(1);
    }

    // Fix newlines and escape characters
    repaired = repaired.replace(/\r\n/g, '\\n');
    repaired = repaired.replace(/\r/g, '\\n');
    repaired = repaired.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');

    // 5. Remove trailing commas
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

    return repaired;
  }

  /**
   * Extract JSON from response that may contain additional text
   */
  private static extractJsonFromResponse(responseText: string): string | null {
    try {
      // Look for JSON between braces
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return jsonMatch[0];
      }

      // Look for JSON after common prefixes
      const prefixes = ['json:', 'JSON:', 'Result:', 'Response:'];
      for (const prefix of prefixes) {
        const prefixIndex = responseText.indexOf(prefix);
        if (prefixIndex !== -1) {
          const afterPrefix = responseText.substring(prefixIndex + prefix.length).trim();
          const jsonMatch = afterPrefix.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return jsonMatch[0];
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate specific JSON schema for HTML generation data
   */
  static validateHtmlGeneration(data: any): JsonValidationResult {
    try {
      const requiredFields = ['assistantMessage', 'html'];

      if (typeof data !== 'object' || data === null) {
        return {
          success: false,
          error: 'HTML generation data must be an object'
        };
      }

      // Check required fields
      for (const field of requiredFields) {
        if (!(field in data)) {
          return {
            success: false,
            error: `Missing required field: ${field}`
          };
        }
      }

      // Validate types
      if (typeof data.assistantMessage !== 'string' || data.assistantMessage.trim().length === 0) {
        return {
          success: false,
          error: 'assistantMessage must be a non-empty string'
        };
      }

      if (typeof data.html !== 'string' || data.html.trim().length === 0) {
        return {
          success: false,
          error: 'html must be a non-empty string'
        };
      }

      // Basic HTML validation - should contain some HTML tags
      if (!data.html.includes('<') || !data.html.includes('>')) {
        return {
          success: false,
          error: 'html must contain valid HTML markup'
        };
      }

      console.log('[JSON Validation]  HTML generation JSON schema validation passed');
      return {
        success: true,
        data
      };

    } catch (error) {
      return {
        success: false,
        error: `Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Create fallback data when JSON parsing completely fails
   */
  static createFallbackData(errorMessage: string): HtmlGenerationData {
    console.log('[JSON Validation]   Creating fallback data for HTML generation');

    return {
      assistantMessage: `I apologize, but I encountered an error generating the HTML template: ${errorMessage}`,
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Template - Error</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px;">
    <h1 style="color: #333; margin-bottom: 20px;">Template Generation Error</h1>
    <p style="color: #666; line-height: 1.6;">
      There was an error generating your email template. Please try again or contact support.
    </p>
  </div>
</body>
</html>`
    };
  }
}

export default HtmlGenerationJsonValidator;
