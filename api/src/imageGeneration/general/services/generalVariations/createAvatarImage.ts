/**
 * Generate avatar-specific prompts for image generation
 * This service provides the specialized prompts used for creating stylized avatars from user selfies
 */

interface AvatarPromptOptions {
  style?: 'professional' | 'artistic' | 'minimalist' | 'illustration' | 'cartoon';
  mood?: 'friendly' | 'professional' | 'creative' | 'modern';
  background?: 'solid' | 'gradient' | 'abstract' | 'minimal';
}

/**
 * Generate the main avatar transformation prompt
 */
export const createAvatarImagePrompt = (options: AvatarPromptOptions = {}): string => {
  const {
    style = 'professional',
    mood = 'friendly',
    background = 'gradient'
  } = options;

  const basePrompt = `Transform the provided selfie into a stylized, professional avatar suitable for business profiles and social media.

AVATAR TRANSFORMATION REQUIREMENTS:
- Create a polished, ${style} avatar based on the person's facial features
- Maintain recognizable facial characteristics and proportions
- ${mood} expression and approachable appearance
- Clean, modern aesthetic suitable for professional use

STYLE SPECIFICATIONS:
${getStyleSpecifications(style)}

BACKGROUND TREATMENT:
${getBackgroundSpecs(background)}

QUALITY REQUIREMENTS:
- High-resolution output suitable for profile pictures
- Clean, crisp details optimized for digital display
- Consistent lighting and professional presentation
- Suitable for use across different platforms (LinkedIn, business cards, etc.)

FACIAL FEATURE PRESERVATION:
- Maintain the person's key identifying features
- Enhance natural features while keeping authenticity
- Professional grooming and polished appearance
- Natural skin tone and facial structure

OUTPUT FORMAT:
- Square aspect ratio (1:1) optimized for profile pictures
- 400x400 pixels minimum resolution
- Professional, clean presentation
- Ready for immediate use as avatar/profile picture`;

  return basePrompt;
};

/**
 * Get style-specific specifications
 */
const getStyleSpecifications = (style: string): string => {
  switch (style) {
    case 'professional':
      return `- Business-appropriate styling with polished appearance
- Clean, modern aesthetic with subtle enhancements
- Professional attire or business-casual presentation
- Refined facial features with natural enhancement
- Corporate-friendly color palette and presentation`;

    case 'artistic':
      return `- Creative, artistic interpretation with stylized elements
- Enhanced colors and artistic flair while maintaining realism
- Subtle artistic filters or painting-like qualities
- Creative lighting and visual interest
- Unique, memorable presentation with artistic touch`;

    case 'minimalist':
      return `- Clean, simple design with minimal visual elements
- Focus on essential features with reduced complexity
- Subtle color palette with clean lines
- Simplified but recognizable facial features
- Modern, uncluttered aesthetic`;

    case 'illustration':
      return `- Illustrated/drawn style while maintaining photo-realism
- Digital art approach with enhanced visual appeal
- Stylized but realistic facial representation
- Smooth, polished illustration techniques
- Professional illustration quality`;

    case 'cartoon':
      return `- Friendly cartoon-style interpretation
- Maintain realistic proportions with slight stylization
- Warm, approachable cartoon aesthetic
- Professional cartoon/avatar style
- Business-appropriate cartoon presentation`;

    default:
      return `- Professional, polished appearance
- Clean, modern styling
- Business-appropriate presentation`;
  }
};

/**
 * Get background specifications
 */
const getBackgroundSpecs = (background: string): string => {
  switch (background) {
    case 'solid':
      return `- Clean solid color background
- Professional neutral colors (white, light gray, or soft blue)
- No distracting elements or patterns
- Focus entirely on the avatar subject`;

    case 'gradient':
      return `- Subtle gradient background with professional colors
- Smooth color transitions that complement the avatar
- Non-distracting gradient that enhances the subject
- Modern, polished gradient presentation`;

    case 'abstract':
      return `- Subtle abstract elements that don't compete with the subject
- Professional abstract patterns or shapes
- Soft, non-distracting background elements
- Modern, business-appropriate abstract design`;

    case 'minimal':
      return `- Extremely clean, minimal background
- Almost white or very subtle background
- Focus entirely on the avatar with no distractions
- Pure, clean presentation`;

    default:
      return `- Professional, clean background
- Non-distracting and business-appropriate
- Enhances rather than competes with the avatar`;
  }
};

/**
 * Generate variations of avatar prompts for different use cases
 */
export const getAvatarPromptVariation = (variation: 'business' | 'social' | 'creative' = 'business'): string => {
  switch (variation) {
    case 'business':
      return createAvatarImagePrompt({
        style: 'professional',
        mood: 'professional',
        background: 'gradient'
      });

    case 'social':
      return createAvatarImagePrompt({
        style: 'artistic',
        mood: 'friendly',
        background: 'gradient'
      });

    case 'creative':
      return createAvatarImagePrompt({
        style: 'illustration',
        mood: 'creative',
        background: 'abstract'
      });

    default:
      return createAvatarImagePrompt();
  }
};