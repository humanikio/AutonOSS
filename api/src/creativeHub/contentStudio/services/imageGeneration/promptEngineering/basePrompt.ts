/**
 * Base prompt engineering guidelines and best practices for image generation
 * These principles ensure high-quality, consistent image generation across providers
 */

export const basePromptGuidelines = `
IMAGE GENERATION BEST PRACTICES:

COMPOSITION & FRAMING:
- Use clear subject positioning (centered, rule of thirds, etc.)
- Specify foreground, midground, and background elements
- Define aspect ratio and orientation clearly
- Consider negative space and visual balance

LIGHTING & ATMOSPHERE:
- Specify lighting conditions (natural light, studio lighting, golden hour, etc.)
- Define mood through lighting (dramatic, soft, moody, bright)
- Consider shadows and highlights for depth
- Use atmospheric effects (fog, haze, rays of light)

DETAIL & QUALITY:
- Request high resolution and sharp focus
- Specify texture details (smooth, rough, glossy, matte)
- Define material properties (metal, fabric, glass, wood)
- Use quality indicators (professional, high-end, premium)

STYLE & AESTHETIC:
- Be specific about artistic style (photorealistic, illustrated, minimalist)
- Reference art movements or techniques when relevant
- Define color palette and color grading
- Specify render quality and post-processing

TECHNICAL SPECIFICATIONS:
- State output requirements (resolution, format, aspect ratio)
- Define depth of field and focus areas
- Specify camera perspective and angle
- Note any technical requirements (transparent background, etc.)

CONTEXT & PURPOSE:
- Consider the image's intended use (web, print, social media)
- Optimize for viewing platform (desktop, mobile, thumbnail)
- Ensure elements are appropriately scaled
- Think about text overlay compatibility if needed
`;

export const qualityModifiers = {
  high: 'ultra high resolution, 8K quality, sharp focus, crystal clear details, professional grade',
  standard: 'high resolution, clear focus, good detail, clean composition',
  artistic: 'artistic interpretation, creative expression, unique perspective',
  photorealistic: 'photorealistic, realistic lighting, natural colors, true-to-life details'
};

export const lightingPresets = {
  studio: 'professional studio lighting, three-point setup, soft shadows, even illumination',
  natural: 'natural daylight, soft ambient lighting, realistic shadows',
  dramatic: 'dramatic lighting, strong contrast, deep shadows, cinematic quality',
  golden: 'golden hour lighting, warm tones, soft glow, magical atmosphere',
  moody: 'moody lighting, dark atmosphere, selective lighting, atmospheric depth'
};

export const compositionRules = {
  centered: 'centered composition, balanced symmetry, clear focal point',
  rule_of_thirds: 'rule of thirds composition, dynamic placement, visual interest',
  minimal: 'minimalist composition, negative space, clean layout, focused subject',
  dynamic: 'dynamic composition, movement, energy, engaging perspective'
};

/**
 * Builds a foundation prompt with best practices applied
 */
export function buildBasePrompt(subject: string, options?: {
  quality?: keyof typeof qualityModifiers;
  lighting?: keyof typeof lightingPresets;
  composition?: keyof typeof compositionRules;
}): string {
  const quality = options?.quality ? qualityModifiers[options.quality] : qualityModifiers.high;
  const lighting = options?.lighting ? lightingPresets[options.lighting] : lightingPresets.natural;
  const composition = options?.composition ? compositionRules[options.composition] : compositionRules.centered;

  return `${subject}. ${composition}. ${lighting}. ${quality}. Professional image generation with attention to detail and visual appeal.`;
}
