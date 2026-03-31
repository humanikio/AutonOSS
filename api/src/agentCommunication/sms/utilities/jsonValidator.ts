/**
 * JSON Validation and Repair Utility for SMS Agent Communication
 * Handles malformed JSON responses from AI models with robust parsing and repair mechanisms
 */

export interface JsonValidationResult {
  success: boolean;
  data?: any;
  error?: string;
  repaired?: boolean;
  originalLength?: number;
  repairedLength?: number;
}

export class JsonValidator {
  /**
   * Safely parse JSON with automatic repair mechanisms
   */
  static validateAndParse(jsonString: string, context?: string): JsonValidationResult {
    const originalLength = jsonString.length;
    
    try {
      // Log for debugging
      if (context) {
        console.log(`🔍 JSON Validation - Context: ${context}`);
        console.log(`📏 Original JSON length: ${originalLength}`);
        console.log(`📝 JSON preview: ${jsonString.substring(0, 200)}${jsonString.length > 200 ? '...' : ''}`);
        
        // Enhanced debugging for problematic characters
        console.log(`🔍 First 10 characters (raw):`, JSON.stringify(jsonString.substring(0, 10)));
        console.log(`🔍 Characters around position 223:`, JSON.stringify(jsonString.substring(220, 230)));
        console.log(`🔍 Full JSON string (for debugging):`, JSON.stringify(jsonString));
      }

      // Step 1: Try direct parsing first
      try {
        const result = JSON.parse(jsonString);
        console.log(`✅ JSON parsed successfully without repair`);
        return {
          success: true,
          data: result,
          originalLength,
          repaired: false
        };
      } catch (directError) {
        console.log(`⚠️ Direct JSON parsing failed: ${directError instanceof Error ? directError.message : 'Unknown error'}`);
      }

      // Step 2: Apply repair mechanisms
      const repairedJson = this.repairJson(jsonString);
      const repairedLength = repairedJson.length;
      
      try {
        const result = JSON.parse(repairedJson);
        console.log(`🔧 JSON successfully repaired and parsed`);
        console.log(`📏 Repaired JSON length: ${repairedLength}`);
        
        return {
          success: true,
          data: result,
          originalLength,
          repairedLength,
          repaired: true
        };
      } catch (repairedError) {
        console.log(`❌ JSON repair failed: ${repairedError instanceof Error ? repairedError.message : 'Unknown error'}`);
        
        // Step 3: Try extracting JSON from larger response
        const extractedJson = this.extractJsonFromResponse(jsonString);
        if (extractedJson) {
          try {
            const result = JSON.parse(extractedJson);
            console.log(`🎯 JSON successfully extracted and parsed`);
            
            return {
              success: true,
              data: result,
              originalLength,
              repairedLength: extractedJson.length,
              repaired: true
            };
          } catch (extractError) {
            console.log(`❌ Extracted JSON parsing failed: ${extractError instanceof Error ? extractError.message : 'Unknown error'}`);
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
    console.log(`🔧 Starting JSON repair on: ${JSON.stringify(repaired.substring(0, 100))}`);

    // 1. Remove markdown code blocks
    repaired = repaired.replace(/^```json\n?/gm, '');
    repaired = repaired.replace(/^```\n?/gm, '');
    repaired = repaired.replace(/\n?```$/gm, '');

    // 2. Remove any text before the first {
    const firstBraceIndex = repaired.indexOf('{');
    if (firstBraceIndex > 0) {
      console.log(`🔧 Removing text before first brace: ${JSON.stringify(repaired.substring(0, firstBraceIndex))}`);
      repaired = repaired.substring(firstBraceIndex);
    }

    // 3. Remove any text after the last }
    const lastBraceIndex = repaired.lastIndexOf('}');
    if (lastBraceIndex > 0 && lastBraceIndex < repaired.length - 1) {
      console.log(`🔧 Removing text after last brace: ${JSON.stringify(repaired.substring(lastBraceIndex + 1))}`);
      repaired = repaired.substring(0, lastBraceIndex + 1);
    }

    // 4. Fix problematic escape sequences and characters
    console.log(`🔧 Before escape fixes: ${JSON.stringify(repaired.substring(0, 50))}`);
    
    // Handle literal backslashes at the start
    if (repaired.startsWith('\\')) {
      console.log('🔧 Removing leading backslash');
      repaired = repaired.substring(1);
    }
    
    // Fix common newline and escape character issues
    // First, fix literal newlines within string values
    repaired = repaired.replace(/\n(?=\s*")/g, '\\n');
    repaired = repaired.replace(/\r\n/g, '\\n');
    repaired = repaired.replace(/\r/g, '\\n');
    
    // Fix unescaped backslashes (but preserve already escaped ones)
    repaired = repaired.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
    
    // Fix literal newlines and tabs within quoted strings
    repaired = repaired.replace(/"([^"]*(?:\\.[^"]*)*)"(?=\s*[,\]\}])/g, (match, content) => {
      const fixedContent = content
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')  
        .replace(/\t/g, '\\t');
      return `"${fixedContent}"`;
    });

    // 5. Remove trailing commas
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

    // 6. Fix unescaped quotes in string values
    repaired = this.fixUnescapedQuotes(repaired);

    // 7. Ensure proper spacing around colons and commas
    repaired = repaired.replace(/:\s*([^",{\[\s])/g, ': "$1"');
    repaired = repaired.replace(/([^"}\],\s])\s*,/g, '$1",');

    console.log(`🔧 After repair: ${JSON.stringify(repaired.substring(0, 100))}`);
    return repaired;
  }

  /**
   * Extract JSON from response that may contain additional text
   */
  private static extractJsonFromResponse(responseText: string): string | null {
    try {
      // Method 1: Look for JSON between braces
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('🔍 Found JSON pattern in response');
        return jsonMatch[0];
      }

      // Method 2: Look for JSON after common prefixes
      const prefixes = [
        'json:', 'JSON:', 'Result:', 'Response:', 'Analysis:', '```json', '```'
      ];
      
      for (const prefix of prefixes) {
        const prefixIndex = responseText.indexOf(prefix);
        if (prefixIndex !== -1) {
          const afterPrefix = responseText.substring(prefixIndex + prefix.length).trim();
          const jsonMatch = afterPrefix.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            console.log(`🔍 Found JSON after prefix "${prefix}"`);
            return jsonMatch[0];
          }
        }
      }

      // Method 3: Look for the largest valid JSON-like structure
      const braceMatches = [...responseText.matchAll(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g)];
      if (braceMatches.length > 0) {
        // Return the longest match (likely the most complete JSON)
        const longestMatch = braceMatches.reduce((prev, current) => 
          current[0].length > prev[0].length ? current : prev
        );
        console.log('🔍 Using longest JSON-like structure found');
        return longestMatch[0];
      }

      console.log('❌ No JSON structure found in response');
      return null;
    } catch (error) {
      console.log('❌ Error extracting JSON from response:', error);
      return null;
    }
  }

  /**
   * Fix unescaped quotes within string values
   */
  private static fixUnescapedQuotes(jsonString: string): string {
    let fixed = '';
    let inString = false;
    let escape = false;
    
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];
      const prevChar = i > 0 ? jsonString[i - 1] : '';
      
      if (char === '"' && !escape) {
        if (!inString) {
          inString = true;
          fixed += char;
        } else {
          // Check if this is the end of a string value
          const nextChar = i < jsonString.length - 1 ? jsonString[i + 1] : '';
          if (nextChar === ',' || nextChar === '}' || nextChar === ']' || /\s/.test(nextChar)) {
            inString = false;
            fixed += char;
          } else {
            // This is likely an unescaped quote within the string
            fixed += '\\"';
          }
        }
      } else {
        fixed += char;
      }
      
      escape = char === '\\' && !escape;
    }
    
    return fixed;
  }


  /**
   * Validate specific JSON schema for agent prompt analysis
   */
  static validateAgentPromptAnalysis(data: any): JsonValidationResult {
    try {
      // Check required fields for agent prompt analysis
      const requiredFields = ['ragNeeded'];
      const optionalFields = ['documentCount', 'reasoning', 'confidence'];
      
      if (typeof data !== 'object' || data === null) {
        return {
          success: false,
          error: 'Agent prompt analysis must be an object'
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

      // Validate ragNeeded is boolean
      if (typeof data.ragNeeded !== 'boolean') {
        return {
          success: false,
          error: 'ragNeeded must be a boolean'
        };
      }

      // Validate documentCount if present
      if ('documentCount' in data && typeof data.documentCount !== 'number') {
        return {
          success: false,
          error: 'documentCount must be a number'
        };
      }

      console.log('✅ Agent prompt analysis JSON schema validation passed');
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
   * Create fallback data for agent prompt analysis when JSON parsing completely fails
   */
  static createAgentPromptAnalysisFallback(originalResponse?: string): any {
    console.log('🔄 Creating fallback data for agent prompt analysis');
    
    // Analyze the original response to make educated guesses
    const response = originalResponse?.toLowerCase() || '';
    
    // Look for keywords that might indicate RAG is needed
    const ragKeywords = ['document', 'knowledge', 'information', 'lookup', 'search', 'find'];
    const ragNeeded = ragKeywords.some(keyword => response.includes(keyword));
    
    const fallbackData = {
      ragNeeded,
      documentCount: ragNeeded ? 1 : 0,
      reasoning: 'Fallback analysis due to JSON parsing failure',
      confidence: 0.3 // Low confidence since this is a fallback
    };

    console.log('📋 Fallback data created:', fallbackData);
    return fallbackData;
  }
}

export default JsonValidator;