/**
 * JSON Validation and Repair Utility for AI Assistant Communication
 * Handles malformed JSON responses from AI models with robust parsing and repair mechanisms
 */

export interface AiJsonValidationResult {
  success: boolean;
  data?: any;
  error?: string;
  repaired?: boolean;
  originalLength?: number;
  repairedLength?: number;
}

export class AiJsonValidator {
  /**
   * Safely parse JSON with automatic repair mechanisms
   */
  static validateAndParse(jsonString: string, context?: string): AiJsonValidationResult {
    const originalLength = jsonString.length;
    
    try {
      // Log for debugging
      if (context) {
        console.log(`🔍 AI JSON Validation - Context: ${context}`);
        console.log(`📏 Original JSON length: ${originalLength}`);
        console.log(`📝 JSON preview: ${jsonString.substring(0, 200)}${jsonString.length > 200 ? '...' : ''}`);
      }

      // Step 1: Try direct parsing first
      try {
        const result = JSON.parse(jsonString);
        console.log(`✅ AI JSON parsed successfully without repair`);
        return {
          success: true,
          data: result,
          originalLength,
          repaired: false
        };
      } catch (directError) {
        console.log(`⚠️ Direct AI JSON parsing failed: ${directError instanceof Error ? directError.message : 'Unknown error'}`);
      }

      // Step 2: Apply repair mechanisms
      const repairedJson = this.repairJson(jsonString);
      const repairedLength = repairedJson.length;
      
      try {
        const result = JSON.parse(repairedJson);
        console.log(`🔧 AI JSON successfully repaired and parsed`);
        console.log(`📏 Repaired JSON length: ${repairedLength}`);
        
        return {
          success: true,
          data: result,
          originalLength,
          repairedLength,
          repaired: true
        };
      } catch (repairedError) {
        console.log(`❌ AI JSON repair failed: ${repairedError instanceof Error ? repairedError.message : 'Unknown error'}`);
        
        // Step 3: Try extracting JSON from larger response
        const extractedJson = this.extractJsonFromResponse(jsonString);
        if (extractedJson) {
          try {
            const result = JSON.parse(extractedJson);
            console.log(`🎯 AI JSON successfully extracted and parsed`);
            
            return {
              success: true,
              data: result,
              originalLength,
              repairedLength: extractedJson.length,
              repaired: true
            };
          } catch (extractError) {
            console.log(`❌ Extracted AI JSON parsing failed: ${extractError instanceof Error ? extractError.message : 'Unknown error'}`);
          }
        }

        return {
          success: false,
          error: `AI JSON parsing failed after all repair attempts: ${repairedError instanceof Error ? repairedError.message : 'Unknown error'}`,
          originalLength
        };
      }

    } catch (error) {
      return {
        success: false,
        error: `AI JSON validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        originalLength
      };
    }
  }

  /**
   * Apply various JSON repair mechanisms
   */
  private static repairJson(jsonString: string): string {
    let repaired = jsonString.trim();
    console.log(`🔧 Starting AI JSON repair on: ${JSON.stringify(repaired.substring(0, 100))}`);

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
    
    // Fix common newline and escape character issues within string values
    repaired = repaired.replace(/"([^"]*(?:\\.[^"]*)*)"(?=\s*[,\]\}:])/g, (match, content) => {
      const fixedContent = content
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')  
        .replace(/\t/g, '\\t')
        .replace(/"/g, '\\"');
      return `"${fixedContent}"`;
    });

    // 5. Remove trailing commas
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

    // 6. Fix unescaped quotes in string values
    repaired = this.fixUnescapedQuotes(repaired);

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
        console.log('🔍 Found AI JSON pattern in response');
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
            console.log(`🔍 Found AI JSON after prefix "${prefix}"`);
            return jsonMatch[0];
          }
        }
      }

      console.log('❌ No AI JSON structure found in response');
      return null;
    } catch (error) {
      console.log('❌ Error extracting AI JSON from response:', error);
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
      
      if (char === '"' && !escape) {
        if (!inString) {
          inString = true;
          fixed += char;
        } else {
          // Check if this is the end of a string value
          const nextChar = i < jsonString.length - 1 ? jsonString[i + 1] : '';
          if (nextChar === ',' || nextChar === '}' || nextChar === ']' || /\s/.test(nextChar) || nextChar === ':') {
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
   * Validate specific JSON schema for prompt analysis
   */
  static validatePromptAnalysis(data: any): AiJsonValidationResult {
    try {
      // Check required fields for prompt analysis
      const requiredFields = ['toolsNeeded', 'response'];
      
      if (typeof data !== 'object' || data === null) {
        return {
          success: false,
          error: 'Prompt analysis must be an object'
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

      // Validate toolsNeeded is boolean
      if (typeof data.toolsNeeded !== 'boolean') {
        return {
          success: false,
          error: 'toolsNeeded must be a boolean'
        };
      }

      // Validate response is string
      if (typeof data.response !== 'string') {
        return {
          success: false,
          error: 'response must be a string'
        };
      }

      console.log('✅ Prompt analysis JSON schema validation passed');
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
   * Validate specific JSON schema for stage generation
   */
  static validateStageGeneration(data: any): AiJsonValidationResult {
    try {
      // Check required fields for stage generation
      const requiredFields = ['stages', 'explanation'];
      
      if (typeof data !== 'object' || data === null) {
        return {
          success: false,
          error: 'Stage generation must be an object'
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

      // Validate stages is array
      if (!Array.isArray(data.stages)) {
        return {
          success: false,
          error: 'stages must be an array'
        };
      }

      // Validate each stage
      for (let i = 0; i < data.stages.length; i++) {
        const stage = data.stages[i];
        if (typeof stage !== 'object' || stage === null) {
          return {
            success: false,
            error: `Stage ${i} must be an object`
          };
        }
        if (typeof stage.name !== 'string') {
          return {
            success: false,
            error: `Stage ${i} name must be a string`
          };
        }
        if (typeof stage.order !== 'number') {
          return {
            success: false,
            error: `Stage ${i} order must be a number`
          };
        }
      }

      // Validate explanation is string
      if (typeof data.explanation !== 'string') {
        return {
          success: false,
          error: 'explanation must be a string'
        };
      }

      console.log('✅ Stage generation JSON schema validation passed');
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
   * Create fallback data for prompt analysis when JSON parsing completely fails
   */
  static createPromptAnalysisFallback(originalResponse?: string): any {
    console.log('🔄 Creating fallback data for prompt analysis');
    
    // Analyze the original response to make educated guesses
    const response = originalResponse?.toLowerCase() || '';
    
    // Look for keywords that might indicate tools are needed
    const toolKeywords = ['create', 'generate', 'build', 'make'];
    const stageKeywords = ['stage', 'pipeline', 'step', 'phase'];
    const questionKeywords = ['what', 'how', 'clarify', 'need', 'tell me', '?'];
    
    // Tools are likely needed if we see creation words + stage words, but NOT question words
    const hasToolKeywords = toolKeywords.some(keyword => response.includes(keyword));
    const hasStageKeywords = stageKeywords.some(keyword => response.includes(keyword));
    const hasQuestionKeywords = questionKeywords.some(keyword => response.includes(keyword));
    
    const toolsNeeded = hasToolKeywords && hasStageKeywords && !hasQuestionKeywords;
    
    const fallbackData = {
      toolsNeeded,
      response: originalResponse || 'I encountered an issue parsing the response. Could you please rephrase your request?'
    };

    console.log('📋 Prompt analysis fallback data created:', { toolsNeeded });
    return fallbackData;
  }

  /**
   * Create fallback data for stage generation when JSON parsing completely fails
   */
  static createStageGenerationFallback(originalResponse?: string): any {
    console.log('🔄 Creating fallback data for stage generation');
    
    const fallbackData = {
      stages: [
        { name: 'Initial Contact', order: 0 },
        { name: 'Qualification', order: 1 },
        { name: 'Proposal', order: 2 },
        { name: 'Negotiation', order: 3 },
        { name: 'Closed Won', order: 4 }
      ],
      explanation: 'Generated fallback stages due to JSON parsing failure. These are generic stages that may not match your specific business process.'
    };

    console.log('📋 Stage generation fallback data created');
    return fallbackData;
  }
}

export default AiJsonValidator;