/**
 * Example prompts demonstrating best practices for various use cases
 * These serve as references for prompt construction and quality standards
 */

export const promptExamples = {
  product: {
    good: 'Professional product photography of a modern smartwatch on a clean white background. Studio lighting with soft shadows. Three-point lighting setup highlighting the watch face and metallic finish. High resolution, sharp focus on product details. Shot from a 45-degree angle showing both face and side profile. Premium commercial photography quality.',
    bad: 'A watch on white background',
    explanation: 'Good prompts specify lighting, angle, quality, and technical details'
  },

  landscape: {
    good: 'Expansive mountain landscape at golden hour. Dramatic peaks in the background with rolling hills in the foreground. Warm sunlight casting long shadows. Wispy clouds in a blue sky. Shot with wide-angle lens, high depth of field. Natural colors with slight warm color grading. 4K resolution, photorealistic quality.',
    bad: 'Mountains and sky',
    explanation: 'Detailed scene description with time of day, composition, and technical specs'
  },

  portrait: {
    good: 'Professional headshot portrait of a person in business attire. Soft studio lighting with subtle fill light. Blurred background (bokeh effect). Subject positioned using rule of thirds. Natural, confident expression. Sharp focus on eyes. Professional photography quality, suitable for LinkedIn profile.',
    bad: 'Person photo',
    explanation: 'Specifies lighting, composition, focus, and intended use'
  },

  illustration: {
    good: 'Minimalist flat design illustration of a coffee cup. Clean vector-style artwork with bold, simple shapes. Limited color palette of warm browns and cream tones. Geometric simplified forms. No gradients, solid colors only. Suitable for modern web design. PNG with transparent background.',
    bad: 'Drawing of coffee',
    explanation: 'Defines artistic style, color approach, and technical requirements'
  },

  abstract: {
    good: 'Abstract flowing liquid forms in vibrant gradient colors. Smooth, organic shapes blending together. Deep purples transitioning to electric blues and bright cyans. Glossy, reflective surfaces. Soft depth of field creating dreamy atmosphere. Modern digital art aesthetic. High resolution with rich color depth.',
    bad: 'Abstract colorful art',
    explanation: 'Describes forms, colors, materials, and aesthetic goals'
  },

  social_media: {
    good: 'Eye-catching social media graphic with bold typography and modern design. Vibrant gradient background (coral to purple). Clean, contemporary layout optimized for Instagram square format (1:1). Professional design with good contrast for text readability. Trendy, engaging visual style.',
    bad: 'Social media post',
    explanation: 'Specifies platform, format, design elements, and purpose'
  }
};

/**
 * Templates for common image generation scenarios
 */
export const promptTemplates = {
  product_shot: (productName: string, background: string = 'white') =>
    `Professional product photography of ${productName}. Clean ${background} background. Studio lighting with soft shadows and highlights. High-resolution commercial photography. Sharp focus showing product details and textures. Premium quality suitable for e-commerce.`,

  hero_image: (subject: string, mood: string = 'professional') =>
    `${subject} designed for website hero section. ${mood} aesthetic with clean composition. High-resolution, optimized for web display. Engaging visual with strong focal point. Modern design principles. Suitable for desktop and mobile viewing.`,

  social_graphic: (content: string, platform: string = 'Instagram') =>
    `Social media graphic for ${platform} featuring ${content}. Eye-catching design with bold visuals. Optimized aspect ratio for ${platform}. High contrast for visibility. Modern, trendy aesthetic. Professional quality suitable for brand marketing.`,

  icon_set: (concept: string, style: string = 'minimalist') =>
    `${style} icon representing ${concept}. Clean, simple design with clear symbolism. Scalable vector-style artwork. Limited color palette. Suitable for UI/UX applications. PNG with transparent background. Professional design quality.`,

  background: (mood: string, colors: string) =>
    `Abstract background with ${mood} mood. Color palette featuring ${colors}. Smooth gradients and flowing forms. Suitable for use as website or presentation background. High resolution. Non-distracting, complementary to overlaid content.`
};

/**
 * Style-specific enhancements
 */
export const styleEnhancements = {
  photorealistic: 'Photorealistic rendering with natural lighting and realistic textures. Accurate material properties and physics-based lighting. True-to-life colors and details.',

  illustration: 'Illustrated artistic style with clean linework and deliberate color choices. Artistic interpretation with cohesive visual language.',

  minimalist: 'Minimalist design philosophy with essential elements only. Clean composition, generous negative space, refined simplicity.',

  vibrant: 'Vibrant, saturated colors with high visual energy. Bold color choices creating strong emotional impact and visual interest.',

  professional: 'Professional commercial quality with polished execution. Attention to detail and industry-standard best practices.',

  cinematic: 'Cinematic quality with dramatic lighting and composition. Film-like aesthetic with intentional mood and atmosphere.'
};

/**
 * Get a relevant example based on use case
 */
export function getExamplePrompt(category: keyof typeof promptExamples): string {
  return promptExamples[category].good;
}

/**
 * Get a template filled with custom values
 */
export function getPromptTemplate(
  template: keyof typeof promptTemplates,
  ...args: string[]
): string {
  const templateFn = promptTemplates[template] as (...args: string[]) => string;
  return templateFn(...args);
}
