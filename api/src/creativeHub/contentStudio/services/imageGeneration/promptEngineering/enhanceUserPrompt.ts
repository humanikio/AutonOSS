/**
 * AI-Powered Prompt Enhancement Service
 * Uses Claude 4 to enhance user prompts for optimal image generation
 * Also suggests complementary background colors
 */

import { claude4 } from '../../../../../llmModels/claude4';
import { ImageGenerationJsonValidator, EnhancedPromptData } from '../utils/jsonValidator';

const SYSTEM_PROMPT = `You are an expert AI image generation prompt engineer. Your role is to enhance user prompts for optimal image generation results while preserving the user's original intent.

## Best Practices for Image Generation Prompts:

1. **Specificity**: Add concrete details about subject, setting, composition, lighting, and mood
2. **Visual Description**: Focus on visual elements rather than abstract concepts
3. **Technical Details**: Include camera angles, lighting conditions, art style when relevant
4. **Atmosphere**: Describe mood, time of day, weather conditions
5. **Quality Indicators**: Mention resolution, detail level, professional quality
6. **Composition**: Suggest framing, perspective, focal points

## Enhancement Guidelines:

- PRESERVE the user's core intent and subject matter
- ADD specific visual details that enhance clarity
- AVOID changing the fundamental concept
- KEEP enhancements subtle and relevant
- MAINTAIN the original tone (realistic, artistic, etc.)
- DO NOT add unnecessary complexity

## Background Color Selection:

Choose a complementary background color that:
- Enhances the subject's visibility
- Creates visual harmony
- Matches the mood and style
- Provides appropriate contrast
- Considers color theory principles

## Response Format:

You MUST respond with ONLY a valid JSON object (no markdown, no explanations) with exactly this structure:

{
  "revisedPrompt": "The enhanced prompt with added visual details",
  "originalPrompt": "The exact user prompt as provided",
  "complimentaryColor": "#RRGGBB"
}

The complimentaryColor MUST be a valid 6-digit hex color code (e.g., #3b82f6, #f59e0b, #6b7280).

Examples:

User: "a cat"
Response: {"revisedPrompt":"A photorealistic domestic cat with detailed fur texture, sitting in natural daylight with soft shadows, clear focus on facial features and whiskers, professional photography quality","originalPrompt":"a cat","complimentaryColor":"#e0f2fe"}

User: "sunset over mountains"
Response: {"revisedPrompt":"A breathtaking sunset over mountain peaks, golden hour lighting with vibrant orange and purple hues in the sky, dramatic clouds, silhouetted mountain ridges, professional landscape photography, high detail and clarity","originalPrompt":"sunset over mountains","complimentaryColor":"#1e3a8a"}

User: "futuristic city at night"
Response: {"revisedPrompt":"A futuristic metropolis at night with neon lights, towering skyscrapers with illuminated windows, holographic advertisements, flying vehicles, cyberpunk aesthetic, cinematic composition with strong vertical lines, highly detailed urban environment","originalPrompt":"futuristic city at night","complimentaryColor":"#0f172a"}`;

export interface PromptEnhancementResult {
  success: boolean;
  revisedPrompt: string;
  originalPrompt: string;
  complimentaryColor: string;
  error?: string;
}

/**
 * Enhance a user's image generation prompt using AI
 */
export async function enhanceUserPrompt(userPrompt: string): Promise<PromptEnhancementResult> {
  try {
    console.log(`<¨ Enhancing user prompt: "${userPrompt}"`);

    // Call Claude 4 with the system prompt and user prompt
    const response = await claude4.processTextWithSystemPrompt(SYSTEM_PROMPT, userPrompt);

    console.log(`=Ý Claude 4 raw response length: ${response.length}`);

    // Parse and validate the JSON response
    const parseResult = ImageGenerationJsonValidator.validateAndParse(response, 'Prompt Enhancement');

    if (!parseResult.success) {
      console.error('L Failed to parse Claude 4 response:', parseResult.error);
      // Return fallback
      const fallback = ImageGenerationJsonValidator.createFallbackData(userPrompt);
      return {
        success: false,
        ...fallback,
        error: parseResult.error
      };
    }

    // Validate schema
    const schemaResult = ImageGenerationJsonValidator.validateEnhancedPrompt(parseResult.data);

    if (!schemaResult.success) {
      console.error('L Schema validation failed:', schemaResult.error);
      // Return fallback
      const fallback = ImageGenerationJsonValidator.createFallbackData(userPrompt);
      return {
        success: false,
        ...fallback,
        error: schemaResult.error
      };
    }

    const enhancedData = schemaResult.data as EnhancedPromptData;

    console.log(` Prompt enhanced successfully`);
    console.log(`   Original: "${enhancedData.originalPrompt}"`);
    console.log(`   Revised: "${enhancedData.revisedPrompt.substring(0, 100)}..."`);
    console.log(`   Color: ${enhancedData.complimentaryColor}`);

    return {
      success: true,
      revisedPrompt: enhancedData.revisedPrompt,
      originalPrompt: enhancedData.originalPrompt,
      complimentaryColor: enhancedData.complimentaryColor
    };

  } catch (error) {
    console.error('L Error enhancing prompt:', error);

    // Return fallback
    const fallback = ImageGenerationJsonValidator.createFallbackData(userPrompt);
    return {
      success: false,
      ...fallback,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
